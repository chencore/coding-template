# Spec: App Scaffold

**规格风格**：场景式（Scenario-based）——每条规格描述一个可验证的场景。

---

## 本地开发环境（Local Environment）

### 场景 1：数据库一键启动
- **前置**：已安装 Docker，仓库根目录含 `docker-compose.yml`
- **动作**：`docker-compose up -d`
- **预期**：
  - PostgreSQL 16 容器启动并可连接（默认端口 5432，凭据来自 `.env`）
  - `pgvector` 扩展已启用（`SELECT * FROM pg_extension` 含 `vector`）

### 场景 2：后端启动
- **前置**：`.env` 已按 `.env.example` 配置（至少含数据库连接）
- **动作**：`cd backend && npm ci && npm run start:dev`
- **预期**：服务监听配置端口（默认 3000），启动日志含 db 连接成功结果，日志不输出任何密钥

---

## 健康检查（Health Check）

### 场景 3：数据库连通时健康检查通过
- **前置**：db 容器运行中，后端已启动
- **动作**：`GET /api/health`
- **预期**：返回 200，body 含 `{ status: "ok", db: "up" }`

### 场景 4：数据库断开时健康检查降级
- **前置**：db 容器停止，后端已启动
- **动作**：`GET /api/health`
- **预期**：返回 503，body 含 `{ status: "degraded", db: "down" }`；服务进程不崩溃

### 场景 5：LLM 已配置且连通
- **前置**：`.env` 含有效 `ARK_API_KEY` 与 `ARK_MODEL_ID`，网络可达火山方舟
- **动作**：`GET /api/health/llm`
- **预期**：返回 200，body 含 `{ llm: "up" }`；响应与日志均不包含密钥和模型响应内容

### 场景 6：LLM 密钥未配置
- **前置**：`.env` 缺少 `ARK_API_KEY`
- **动作**：`GET /api/health/llm`
- **预期**：返回 503，body 含 `{ llm: "not_configured" }`，错误文案指明需配置的环境变量名

### 场景 7：LLM 不可达
- **前置**：密钥已配置，但方舟端点超时（>5s）
- **动作**：`GET /api/health/llm`
- **预期**：返回 503，body 含 `{ llm: "unreachable" }`；请求 5s 超时终止，不重试

---

## 前端骨架（Flutter App）

### 场景 8：App 启动并展示后端健康状态
- **前置**：后端已启动，Flutter 以 `--dart-define=API_BASE_URL=...` 运行
- **动作**：`flutter run`（iOS 模拟器；**本变更执行期改经 Android 模拟器验证**——Xcode 未装，模拟器访问宿主机用 `10.0.2.2`）
- **预期**：App 启动页请求 `GET /api/health` 并展示结果（连通 / 降级）；后端不可达时展示明确错误状态而非白屏卡死

### 场景 9：静态检查与单测通过
- **动作**：`cd frontend && flutter analyze && flutter test`
- **预期**：analyze 无 error，至少 1 个单测通过

---

## CI

### 场景 10：推送触发 CI
- **动作**：push 到任意分支或发起 PR
- **预期**：GitHub Actions 运行两个 job——backend（lint + 单测）、frontend（analyze + 单测）；任一变红则整体失败

### 场景 11：后端 lint/单测在 CI 通过
- **前置**：本地 `npm run lint && npm run test` 通过
- **预期**：CI backend job 绿灯（环境一致性：Node 版本在 CI 中显式固定）
