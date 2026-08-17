# Tasks: bootstrap-app-scaffold

> 实现任务清单。由「任务拆解」阶段在设计确认后直接编写；执行阶段（`implement`）逐项推进、逐项勾选。
>
> 完整拆解规则见 `CLAUDE.md` 的「任务拆解规则」小节。

<!-- not-ui: 纯项目骨架搭建（脚手架/CI/健康检查），无页面、组件、交互或视觉设计；Flutter 启动页仅为验证连通性的临时占位，不涉及界面设计规范 -->

## 1. 基础设施层

- [x] 1.1 根目录 `docker-compose.yml`：`pgvector/pgvector:pg16` 服务 + init 脚本启用 `vector` 扩展（落点：`docker-compose.yml`、`docker/db/init.sql`）
- [x] 1.2 根目录 `.env.example`（db 连接、`ARK_API_KEY`/`ARK_MODEL_ID` 占位）+ 确认 `.env` 在 `.gitignore`
- [x] 1.3 验证：场景 1——`docker-compose up -d` 后 db 可连、pgvector 已启用

## 2. 后端骨架（backend/）

- [x] 2.1 删除模板示例代码（`server.js`/`tasks.js`/`tasks.test.js`），grep 确认无引用后 `@nestjs/cli` 初始化 NestJS + TS 项目（落点：`backend/`）
- [x] 2.2 配置模块：`@nestjs/config` 读取 `.env`，启动日志输出端口与 db 连接结果（不输出密钥）（落点：`backend/src/app.module.ts`、`backend/src/config/`）
- [x] 2.3 健康检查模块：`GET /api/health` 返回 db 连通状态，db 断开返回 503 降级不崩溃（落点：`backend/src/health/health.controller.ts`、`health.service.ts`）
- [x] 2.4 LLM 探针：`GET /api/health/llm`——openai SDK 指向火山方舟 base URL，5s 超时、不重试、三态（`up`/`not_configured`/`unreachable`）（落点：`backend/src/health/llm.probe.ts`）
- [x] 2.5 单测：health service 的 db up/down 分支 + llm 探针三态分支（mock 外部调用）

## 3. 前端骨架（frontend/）

- [x] 3.1 删除模板示例代码（`app.js`/`index.html`/`styles.css`），`flutter create` 初始化项目（落点：`frontend/`）；保留 `frontend/design.md`
- [x] 3.2 环境验证：`flutter doctor` 已跑——Flutter/Android/网络均正常；**Xcode 未完整安装（阻塞 iOS 模拟器，需人工装 Xcode 后 `sudo xcode-select --switch`）**，此发现已记录，不阻塞 analyze/test
- [x] 3.3 启动页：读取 `--dart-define=API_BASE_URL`，请求 `/api/health` 并展示连通/降级/不可达三态（临时占位页，非正式设计）（落点：`frontend/lib/main.dart`）
- [x] 3.4 单测：健康状态解析逻辑（`frontend/test/`），`flutter analyze` 无 error

## 4. CI 与集成验证

- [x] 4.1 `.github/workflows/ci.yml`：backend job（Node 版本固定，lint+test）、frontend job（subosito/flutter-action，analyze+test）
- [x] 4.2 集成验证：场景 3~7——health 与 llm 探针的 200/503 各分支实跑一遍（db 起/停、密钥有/无）
- [x] 4.3 集成验证：场景 8——App 连本地后端展示健康状态 ✅（**改经 Android 模拟器验证**：Xcode 未装，用户指示先开放安卓；Pixel 7 API 36 模拟器截图确认「后端连通正常」。iOS 模拟器验证待 Xcode 安装后补）
- [ ] 4.4 集成验证：场景 10~11——push 后 CI 双 job 绿灯
- [x] 4.5 根 README 更新本地启动步骤；`spec/structure.md` 若有顶层目录变化则同步

## 5. 收尾

- [ ] 5.1 `spec/tasks.md` 勾选 `bootstrap-app-scaffold`
- [ ] 5.2 `spec/devlog.md` 追加变更记录
- [ ] 5.3 运行 `.\validation\validate-template.cmd` 并 `/opsx:archive` 归档

## Hardness Check

- [x] Complexity level selected: **L**（新依赖、跨模块、外部服务接入——见 design.md 开头）
- [x] Boundary is clear; no cross-module internal access：本变更只建骨架，模块边界 = frontend / backend / docker / ci 四个落点；不触碰任何业务模块（尚不存在）
- [x] Failure behavior is handled or explicitly not applicable：design.md「失败处理」表——db 断开 503 降级、LLM 三态、5s 超时不重试
- [x] Core path and important failure path are verified：任务 2.5/3.4 单测覆盖分支；任务 4.2~4.4 集成验证对齐 spec 场景 3~11
- [x] Logs/metrics cover important behavior without leaking sensitive data：启动日志不输出密钥；LLM 探针日志只记成功/失败+耗时，不记密钥与响应体
- [x] Rollback path is documented, or not applicable with reason：design.md「回滚」——纯新增，删骨架即回滚；模板代码删除可经 git 恢复
