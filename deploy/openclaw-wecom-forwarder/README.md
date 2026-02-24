# OpenClaw 企业微信转发外挂（WeCom Forwarder）

本文档用于记录 OpenClaw 服务器上“企业微信消息 → 转发到 fun-ai-station-api/openclaw webhook → 再调度到 fun-agent-service”的外挂转发服务，便于后续排查与迁移。

## 组件与链路

### 端口与进程（OpenClaw 服务器）

- `nginx`
  - 对外监听：`0.0.0.0:18790`（也可能还有 `:80`，视服务器配置而定）
  - 负责将企业微信回调请求转发给 OpenClaw 网关，并**镜像**一份给转发外挂
- `openclaw-gateway`
  - 监听：`0.0.0.0:18789`（主链路）
  - 可能同时监听：`127.0.0.1:18792`（本地端口，视配置而定）
- `wecom-forwarder`（本目录源码）
  - 监听：`127.0.0.1:9100`（仅供 Nginx 内部 mirror 调用）
  - 作用：解析/解密企业微信加密回调内容，组装 JSON，转发到 `fun-ai-station-api` 的 OpenClaw webhook

### Nginx 配置（示例）

通常位于：`/etc/nginx/conf.d/openclaw-wecom.conf`（以实际服务器为准）。

核心逻辑：

- 外部请求 `POST /wecom/bot?...`：
  - 主请求：`proxy_pass http://127.0.0.1:18789;` → OpenClaw 网关
  - 镜像请求：`mirror /__mirror_wecom;` → 走 `location = /__mirror_wecom` 转发到本机 `127.0.0.1:9100`

示例片段（与你当前服务器一致）：

```nginx
server {
  listen 18790;
  server_name _;

  location /wecom/bot {
    mirror /__mirror_wecom;
    mirror_request_body on;

    proxy_pass http://127.0.0.1:18789;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location = /__mirror_wecom {
    internal;
    access_log /var/log/nginx/mirror-access.log combined;
    error_log  /var/log/nginx/mirror-error.log info;
    proxy_pass http://127.0.0.1:9100$request_uri;
  }
}
```

## wecom_forwarder.js 行为说明

源码位置（本工程）：`deploy/openclaw-wecom-forwarder/wecom_forwarder.js`

### 输入（来自 Nginx mirror）

- 只处理 `POST`，其它方法直接 `200 ok`
- 读取 URL Query：
  - `timestamp`
  - `nonce`
  - `msg_signature`（或 `signature`）
- 读取 Body：
  - 当前实现**按 JSON 解析**，并从 `encrypt`/`Encrypt` 字段取出加密内容（Base64）

注意：企业微信标准回调经常是 `application/xml`。你当前链路之所以可用，通常意味着上游（OpenClaw/Nginx）把回调包装成了 JSON（包含 `encrypt` 字段）。如果未来上游行为变化，可能出现 `JSON.parse` 失败或 `missing encrypt`。

### 校验与解密

- 若 `timestamp/nonce/signature` 都存在，则进行签名校验：
  - `sha1(sort(token, timestamp, nonce, encrypt).join('')) === signature`
- 解密：
  - AES-256-CBC（key 为 `WECOM_AES_KEY` base64 解码得到 32 bytes；iv 取 key 前 16 bytes）
  - PKCS7 去 padding
  - 得到明文 XML
- 从 XML 里用正则提取：
  - `MsgType` / `Content` / `FromUserName` / `ToUserName` / `ChatId` / `MsgId`

### 转发到 fun-ai-station-api

目标地址：

- `API_URL`：`http(s)://<域名或IP>/api/webhooks/openclaw`

鉴权：

- `API_SECRET`：与 `fun-ai-station-api` 的 `OPENCLAW_WEBHOOK_SECRET` 保持一致
- 请求头：
  - `x-openclaw-timestamp: <unix seconds>`
  - `x-openclaw-signature: <hex>`
- 签名算法：
  - `HMAC_SHA256(API_SECRET, "<ts>." + <raw_body_bytes>)`

Payload（JSON）：

```json
{
  "event_id": "MsgId 或 encrypt 的 hash",
  "agent": "DEFAULT_AGENT（默认 attendance）",
  "text": "文本内容或降级文本",
  "context": {
    "channel": "wecom",
    "from": "...",
    "to": "...",
    "chat_id": "...",
    "msg_type": "text"
  }
}
```

容错：

- 转发与解析失败时，**依然返回 `200 ok`**，避免影响主链路（OpenClaw 网关仍能处理）。

## 服务器落地位置（当前已知）

你当前 OpenClaw 服务器上进程命令行显示：

- 代码目录：`/opt/openclaw-wecom-forwarder/`
- 入口文件：`/opt/openclaw-wecom-forwarder/wecom_forwarder.js`
- Node：`/root/.nvm/versions/node/v22.22.0/bin/node`（以实际版本为准）

建议以本工程目录下的版本为“单一可信源”，并将服务器 `/opt/openclaw-wecom-forwarder/wecom_forwarder.js` 与本工程保持同步。

## 配置项（环境变量）

需要在运行进程的环境中提供：

- `WECOM_TOKEN`：企业微信 bot token
- `WECOM_AES_KEY`：企业微信 encodingAESKey（43 chars，无 `=`；代码里会补一个 `=` 再 base64 解码）
- `API_URL`：`fun-ai-station-api` 的 OpenClaw webhook 地址（如：`https://example.com/api/webhooks/openclaw`）
- `API_SECRET`：与 `fun-ai-station-api` 的 `OPENCLAW_WEBHOOK_SECRET` 一致
- `AGENT`（可选）：默认 agent code，缺省为 `attendance`

示例见：`deploy/openclaw-wecom-forwarder/env.example`

## 排查手册（常用命令）

### 1) 检查 Nginx mirror 是否有请求

- `tail -f /var/log/nginx/mirror-access.log`
- `tail -f /var/log/nginx/mirror-error.log`

### 2) 检查 9100 是否在监听 + 找到进程

- `ss -ltnp | grep ':9100'`
- `ps -fp <PID>`
- `tr '\\0' ' ' < /proc/<PID>/cmdline`

### 3) 确认转发服务拿到了哪些 env

- `tr '\\0' '\\n' < /proc/<PID>/environ | grep -E '^(WECOM_TOKEN|WECOM_AES_KEY|API_URL|API_SECRET|AGENT)='`

### 4) 验证 forwarder 能连通 API_URL

- `curl -I "$API_URL"`

### 5) 常见报错与含义

- `sh: next: command not found`：这是 Next.js 服务问题（非 forwarder），通常是依赖未安装或 systemd 工作目录/环境不对
- `forwarder error: missing encrypt`：mirror 过来的 body 不含 `encrypt`（上游格式变了，或请求体不是 JSON）
- `forwarder error: bad wecom signature`：签名不匹配（token/参数不一致，或上游 query 参数不完整）

## 建议：使用 systemd 管理（可选）

本目录提供模板：`deploy/openclaw-wecom-forwarder/openclaw-wecom-forwarder.service`

你可以：

- 将 `wecom_forwarder.js` 同步到服务器 `/opt/openclaw-wecom-forwarder/`
- 将 env 放到 `/opt/openclaw-wecom-forwarder/.env`（仅示例，按你的安全策略调整）
- 用 systemd 管理生命周期与日志

