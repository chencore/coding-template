# Design: Bootstrap App Scaffold

**复杂度：L**——新依赖（Flutter/NestJS/Postgres/LLM SDK）、跨模块（前后端 + 基础设施）、含外部服务接入。

## 架构概览

```
[ Flutter App (frontend/) ] ──GET /api/health──▶ [ NestJS (backend/) ] ──▶ [ PostgreSQL+pgvector (docker-compose) ]
        │                                              │
        │ 启动页展示后端健康状态                          └──GET /api/health/llm──▶ [ 火山方舟（豆包）]
        └── 环境变量：API base URL（dart-define）
```

## 关键决策

### 1. 跨端框架 —— Flutter（kickoff 已拍板）

**选择**：Flutter（stable 通道），代码落 `frontend/`

**理由**：kickoff 讨论结论——性能好、UI 一致性高。代价是 Dart 单语言生态、iOS 原生能力（M3 拦截模块）需写 Swift 插件；原生模块风险已在 spec/design.md 记录，M3 前必须验证。

**执行期修正（2026-08-18）**：Xcode 未完整安装阻塞 iOS 模拟器验证，经用户指示工程同时开启 Android 平台（`flutter create --platforms ios,android`），场景 8 改经 Android 模拟器（Pixel 7 API 36）验证通过。**产品首发策略不变（仅 iOS）**，Android 平台仅作开发期验证目标；模拟器访问宿主机后端用 `10.0.2.2`。

### 2. 后端 —— NestJS + TypeScript

**选择**：NestJS（@nestjs/cli 初始化），代码落 `backend/`

**理由**：kickoff 讨论结论——TS 全栈心智负担最低，模块化结构贴合本项目「模块划分」（mentor/mirror/cang/...）。模板遗留的 `server.js`/`tasks.js` 示例代码删除。

### 3. 数据库 —— PostgreSQL 16 + pgvector

**选择**：docker-compose 本地构建镜像（`docker/db/Dockerfile`：`FROM postgres:16` + apt 安装 `postgresql-16-pgvector`），`CREATE EXTENSION vector` 由 init 脚本完成

**理由**：导师记忆的向量检索（思想地图、个性化提问）与关系数据一库两用，个人开发者运维负担最小。本变更**不建任何业务表**，只验证扩展可用。

**执行期修正（2026-08-18）**：原设计直接用 `pgvector/pgvector:pg16` 镜像，但当前网络下 Docker Hub 拉取不可用（守护进程代理失效），容器内 apt 也无代理；改为基于本地已有 `postgres:16` 构建，构建时经 `--build-arg HTTP_PROXY=host.docker.internal:7890` 走宿主机代理。网络恢复后可改回官方镜像，compose 与 init 脚本不变。

### 4. LLM 接入 —— 火山方舟，SDK 直连 + 环境变量密钥

**选择**：火山方舟（豆包），OpenAI 兼容端点（`https://ark.cn-beijing.volces.com/api/v3`），用 `openai` SDK 指向方舟 base URL；密钥走 `ARK_API_KEY` 环境变量，模型 ID（endpoint id）走 `ARK_MODEL_ID`

**理由**：kickoff 结论——与后续语音版 ASR 同源。OpenAI 兼容模式意味着换供应商（DeepSeek/通义）只改 base URL 和模型 ID，**供应商可替换性是本设计的显式目标**。

**放弃的方案**：直接集成多家 SDK——过度设计，M1 只需一家跑通。

### 5. 密钥与配置管理

**选择**：`.env`（后端，`@nestjs/config`，`.env.example` 入仓库、`.env` 入 .gitignore）+ Flutter 侧 `--dart-define`

**理由**：个人项目最简方案；密钥永不入仓库（Hardness Observability：日志不泄露敏感信息）。

### 6. CI —— GitHub Actions，仅 lint + 单测

**选择**：两个 job——backend（`npm ci && npm run lint && npm run test`）、frontend（`flutter analyze && flutter test`，用 subosito/flutter-action）

**放弃**：iOS 构建进 CI——需 macOS runner 且耗时长，M4 再说。

## 目录结构（落点）

```
frontend/          # Flutter 项目（lib/, test/, pubspec.yaml）
backend/           # NestJS 项目（src/, test/, package.json）
  src/health/      # 健康检查模块（db + llm 探针）
docker-compose.yml # Postgres+pgvector
.github/workflows/ci.yml
.env.example
```

## 失败处理（Failure）

**实现约束（执行期发现）**：dev 模式用 tsx（esbuild）运行，esbuild 不保证 `emitDecoratorMetadata`——NestJS 构造器按类型注入会静默拿到 undefined。约定：**所有构造器注入必须显式写 `@Inject()`**（已在 health 模块全部落实并注释）。后续若引入 `nest start`/ts-node 可放宽。

| 场景 | 行为 |
|------|------|
| `GET /api/health` 时 db 断开 | 返回 503 + `{ db: "down" }`，不崩溃；后端整体仍响应 |
| `GET /api/health/llm` 时密钥缺失 | 返回 503 + `{ llm: "not_configured" }`，明确提示配置 `ARK_API_KEY` |
| LLM 请求超时/失败 | 5s 超时，返回 503 + `{ llm: "unreachable" }`；**不重试**（这是探针，重试无意义） |
| LLM 响应内容 | 探针只检查 HTTP 连通与鉴权，不记录 prompt/response 内容 |

## 可观测性（Observability）

- NestJS 启动日志输出端口与 db 连接结果（不输出密钥）
- `/api/health/*` 探针失败时打 warn 日志（错误类别，不含堆栈外的敏感信息）
- LLM 探针日志只记「成功/失败 + 耗时」，不记密钥与响应体

## 回滚（Rollback）

本变更全是新增：删除 `frontend/`、`backend/` 新骨架、docker-compose.yml、ci.yml 即回到模板状态；模板示例代码的删除可通过 git 历史恢复。无数据、无配置、无外部状态变更。

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| Flutter iOS 工具链在开发者机器上的首次配置问题 | tasks 含环境验证步骤（`flutter doctor`），问题早发现 |
| 火山方舟密钥未就绪阻塞进度 | LLM 探针允许 `not_configured` 状态，骨架其余部分可先行 |
| 模板示例代码删除后误引用 | 全局 grep 确认无引用后再删 |
