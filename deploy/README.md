## 部署（不依赖 systemd 环境变量，全部靠配置文件）

本仓库包含 3 个服务：
- **Web**（Next.js）：默认 3000
- **API**（FastAPI）：默认 8001
- **Agent Service**（Node + Python）：默认 4010

推荐对公网只暴露 **80**（Nginx 反代），其余端口都绑定 `127.0.0.1`。

### 1) 配置文件

#### Agent Service（Node）

使用：`fun-agent-service/config/fun-agent-service.env`

你只需要在该文件里配置：
- `PORT`
- `PYTHON_BIN`
- `LLM_CONFIG_PATH`

LLM 的具体参数（`base_url/api_key/model/timeout`）放在 `LLM_CONFIG_PATH` 指向的 JSON 中（默认 `fun-agent-service/agents/configs/llm.json`）。

#### API（FastAPI）

使用：`fun-ai-station-api/configs/fun-ai-station-api.env`

#### Web（Next.js）

Next.js 的 `NEXT_PUBLIC_*` 变量是在 **build 时注入** 的，建议：
1) 在服务器上创建 `/srv/fun-ai-station/.env.production`
2) 先 `npm run build`
3) 再用 systemd 启动 `npm run start`

你需要在服务器上创建 `/srv/fun-ai-station/.env.production`，并在 build 前写入 `NEXT_PUBLIC_API_BASE_URL`（指向 `http://<公网IP>/api`）。

### 2) Nginx 反代

使用模板：`deploy/nginx/fun-ai-station.conf`

- `/` → `127.0.0.1:3000`
- `/api/` → `127.0.0.1:8001/`

### 3) systemd

使用模板：`deploy/systemd/*.service`

特点：
- unit 文件里 **不写** `Environment=...`
- 运行目录固定，从而让各服务读取项目内的配置文件

### 4) Openclaw 消息转发到本项目 API（Webhook）

当 openclaw 部署在另一台服务器，并接收到企业微信/其他渠道的消息时，推荐由 openclaw **HTTP POST 转发**
到本项目 API 的 webhook：

- 转发地址：`http://<你的公网域名或IP>/api/webhooks/openclaw`

#### 鉴权（必需）

在 `fun-ai-station-api/configs/fun-ai-station-api.env` 配置：

- `OPENCLAW_WEBHOOK_SECRET`：转发签名密钥（务必改成强随机字符串）
- `OPENCLAW_MAX_SKEW_SECONDS`：允许的时间戳偏移（默认 300 秒）
- `OPENCLAW_DEFAULT_AGENT`：未指定 agent 时的默认智能体（默认 `attendance`）

openclaw 发请求时需要带上请求头：

- `x-openclaw-timestamp`: unix 秒级时间戳（例如 `1739070000`）
- `x-openclaw-signature`: hex(hmac_sha256(secret, "{ts}.{raw_body_bytes}"))

其中待签名的消息是：把 `timestamp`、一个点号 `.`、以及 **原始 HTTP body 字节** 直接拼接后做 HMAC-SHA256。

#### 请求体（建议）

建议 openclaw 至少传这些字段（其余字段可自由扩展）：

```json
{
  "event_id": "unique-message-id",
  "agent": "attendance",
  "text": "用户发来的消息内容",
  "context": {
    "channel": "wecom",
    "from": "user_id"
  }
}
```

如果不传 `agent`，API 会使用 `OPENCLAW_DEFAULT_AGENT`。

