const http = require("http");
const https = require("https");
const crypto = require("crypto");

const LISTEN_HOST = "127.0.0.1";
const LISTEN_PORT = 9100;

// From openclaw.json: channels.wecom.bot.token / encodingAESKey
const WECOM_TOKEN = process.env.WECOM_TOKEN;
const WECOM_AES_KEY = process.env.WECOM_AES_KEY; // 43 chars, base64 (no '=')

// Your fun-ai-station-api webhook
const API_URL = process.env.API_URL; // http(s)://<域名或IP>/api/webhooks/openclaw
const API_SECRET = process.env.API_SECRET; // OPENCLAW_WEBHOOK_SECRET (same as API side)
const DEFAULT_AGENT = process.env.AGENT || "attendance";

if (!WECOM_TOKEN || !WECOM_AES_KEY || !API_URL || !API_SECRET) {
  console.error("Missing env: WECOM_TOKEN / WECOM_AES_KEY / API_URL / API_SECRET");
  process.exit(1);
}

function pkcs7Unpad(buf) {
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > 32) return buf;
  return buf.slice(0, buf.length - pad);
}

function decryptWecomEncrypt(encryptB64) {
  const key = Buffer.from(WECOM_AES_KEY + "=", "base64"); // 32 bytes
  const iv = key.slice(0, 16);
  const cipher = Buffer.from(encryptB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(false);
  const plain = Buffer.concat([decipher.update(cipher), decipher.final()]);
  const unpadded = pkcs7Unpad(plain);

  // format: 16 random + 4 msg_len(be) + msg + receiveId
  if (unpadded.length < 20) throw new Error("bad plain length");
  const msgLen = unpadded.readUInt32BE(16);
  const msg = unpadded.slice(20, 20 + msgLen).toString("utf8");
  return msg;
}

// WeCom signature: sha1(sort(token, timestamp, nonce, encrypt).join(''))
function verifyWecomSignature({ timestamp, nonce, encrypt, signature }) {
  const arr = [WECOM_TOKEN, timestamp, nonce, encrypt].map(String).sort();
  const sha = crypto.createHash("sha1").update(arr.join("")).digest("hex");
  return sha === String(signature || "");
}

function pick(re, s) {
  const m = re.exec(s);
  return m ? m[1] : "";
}

function parseWecomXml(xml) {
  const msgType =
    pick(/<MsgType><!\[CDATA\[(.*?)\]\]><\/MsgType>/, xml) ||
    pick(/<MsgType>(.*?)<\/MsgType>/, xml);
  const content =
    pick(/<Content><!\[CDATA\[(.*?)\]\]><\/Content>/, xml) ||
    pick(/<Content>(.*?)<\/Content>/, xml);
  const from = pick(/<FromUserName><!\[CDATA\[(.*?)\]\]><\/FromUserName>/, xml);
  const to = pick(/<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/, xml);
  const chatId = pick(/<ChatId><!\[CDATA\[(.*?)\]\]><\/ChatId>/, xml);
  const msgId = pick(/<MsgId>(\d+)<\/MsgId>/, xml);
  return { msgType, content, from, to, chatId, msgId };
}

function hmac(ts, bodyBuf) {
  const msg = Buffer.concat([Buffer.from(String(ts) + ".", "utf8"), bodyBuf]);
  return crypto.createHmac("sha256", API_SECRET).update(msg).digest("hex");
}

function postToApi(jsonObj) {
  const bodyBuf = Buffer.from(JSON.stringify(jsonObj), "utf8");
  const ts = Math.floor(Date.now() / 1000);
  const sig = hmac(ts, bodyBuf);

  const u = new URL(API_URL);
  const client = u.protocol === "https:" ? https : http;

  const req = client.request(
    {
      method: "POST",
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + (u.search || ""),
      headers: {
        "content-type": "application/json",
        "x-openclaw-timestamp": String(ts),
        "x-openclaw-signature": sig,
      },
    },
    (res) => {
      res.resume(); // fire-and-forget
    }
  );

  req.on("error", (e) => console.error("postToApi error:", e.message));
  req.write(bodyBuf);
  req.end();
}

http
  .createServer((req, res) => {
    // mirror 会把 GET/POST 都打过来；我们只处理 POST
    if (req.method !== "POST") {
      res.writeHead(200);
      res.end("ok");
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const timestamp = url.searchParams.get("timestamp") || "";
    const nonce = url.searchParams.get("nonce") || "";
    const signature =
      url.searchParams.get("msg_signature") ||
      url.searchParams.get("signature") ||
      "";

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const j = JSON.parse(raw);
        const encrypt = String(j.encrypt || j.Encrypt || "");
        if (!encrypt) throw new Error("missing encrypt");

        // 可选：校验签名（建议开着）
        if (
          timestamp &&
          nonce &&
          signature &&
          !verifyWecomSignature({ timestamp, nonce, encrypt, signature })
        ) {
          throw new Error("bad wecom signature");
        }

        const xml = decryptWecomEncrypt(encrypt);
        const p = parseWecomXml(xml);

        const eventId =
          p.msgId || crypto.createHash("sha256").update(encrypt).digest("hex");
        const text =
          p.msgType === "text" && p.content
            ? p.content
            : p.msgType
              ? `[${p.msgType}] ${p.content || ""}`.trim()
              : xml.slice(0, 2000);

        postToApi({
          event_id: eventId,
          agent: DEFAULT_AGENT,
          text,
          context: {
            channel: "wecom",
            from: p.from,
            to: p.to,
            chat_id: p.chatId,
            msg_type: p.msgType,
          },
        });

        res.writeHead(200);
        res.end("ok");
      } catch (e) {
        res.writeHead(200);
        res.end("ok"); // mirror 不要影响主链路
        console.error("forwarder error:", e?.message || String(e));
      }
    });
  })
  .listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(
      `wecom-forwarder listening on http://${LISTEN_HOST}:${LISTEN_PORT}`
    );
  });

