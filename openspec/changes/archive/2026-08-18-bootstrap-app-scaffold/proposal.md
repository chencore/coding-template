# Proposal: Bootstrap App Scaffold

## 是什么（What）

搭建照见 App 的项目骨架，建立可运行的最小全栈闭环：

- Flutter 客户端骨架（`frontend/`）：可启动、可跑 `flutter analyze` + 单测，含一个调用后端健康检查的启动页
- NestJS 后端骨架（`backend/`）：可启动、可跑 lint + 单测，含健康检查接口
- 本地开发环境：docker-compose 起 PostgreSQL + pgvector
- LLM 连通验证：后端接入火山方舟（豆包），提供一个验证端点确认密钥与网络可用
- CI：GitHub Actions 跑后端 lint + 单测、前端 analyze + 单测

## 为什么（Why）

这是 M1 所有业务变更（mirror-moment、ai-mentor-core 等）的前置依赖。技术选型已在 kickoff 拍板（Flutter / NestJS / Postgres+pgvector / 国内 LLM），但**一行代码未写**——Flutter + 原生模块的跨端调试成本、火山方舟的接入路径都需要用最小闭环尽早验证，避免把风险带到业务变更里。

## 范围（Scope）

### 包含
- Flutter 项目初始化（`frontend/`，替换模板示例代码），含环境变量管理（dart-define / .env）
- NestJS 项目初始化（`backend/`，替换模板示例代码），含配置管理（@nestjs/config）
- 健康检查：`GET /api/health` 返回服务状态 + 数据库连通性
- LLM 验证：`GET /api/health/llm` 调一次火山方舟最小请求，返回连通结果（不暴露密钥）
- `docker-compose.yml`：PostgreSQL 16 + pgvector 扩展
- GitHub Actions：push / PR 时跑后端 lint+test、前端 analyze+test（不含 iOS 打包）
- 根 README 更新：本地启动步骤（`spec/structure.md` 如有顶层目录变化同步更新）

### 不包含（明确排除）
- 任何业务表 / 数据模型（users 表等留给后续变更）
- 鉴权（匿名设备 ID 方案留给独立变更）
- 生产部署、监控、告警（M4 `setup-production-deployment`）
- iOS 打包 / 签名 / CI 构建（M4）
- 导师人格、镜子时刻等任何业务逻辑

## 成功标准

- [ ] `docker-compose up` 后 Postgres 可用且 pgvector 扩展已启用
- [ ] 后端 `npm run start:dev` 启动，`GET /api/health` 返回 db 连通状态
- [ ] 配置火山方舟密钥后 `GET /api/health/llm` 返回连通成功；密钥缺失时返回明确错误而非崩溃
- [ ] Flutter `flutter run`（iOS 模拟器）可启动并展示后端健康状态
- [ ] CI 绿灯：后端 lint+test、前端 analyze+test
