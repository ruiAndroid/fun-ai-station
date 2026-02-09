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

