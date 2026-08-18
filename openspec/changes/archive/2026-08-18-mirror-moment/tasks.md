# Tasks: mirror-moment

> 实现任务清单。执行阶段（`implement`）逐项推进、逐项勾选。
>
> 本变更为 **UI 变更**：动手前已阅读 `frontend/design.md`（本变更会增补产品视觉节，落点见任务 5.1）；视觉 token 落 `frontend/lib/theme.dart`，页面按原型 v2「数字文房」。

## 1. 数据层

- [x] 1.1 `backend/migrations/0001_init.sql`：users / mirror_entries / schema_migrations 三表（按 design.md §数据模型）
- [x] 1.2 迁移执行器：从 health 的 DbProbe 拆出共享 `DatabaseModule`（pg Pool 单例），启动时比对 `schema_migrations` 自动执行未跑迁移；迁移失败 → 启动失败并输出失败文件名
- [x] 1.3 `UsersRepository`：`findByDeviceId` / `create`（懒创建用）
- [x] 1.4 `MirrorRepository`：`findByDate` / `createEntry`（ON CONFLICT 兜底）/ `updateAnswer`（服务层 ensure 后调用，首答/更新区分在 2.4）/ `findRecentAnswers` / `findEntries`
- [x] 1.5 单测：迁移执行器（已跑跳过/新迁移执行/失败中止）+ MirrorRepository 分页/更新语义（mock Pool）

## 2. 业务服务

- [x] 2.1 `DeviceIdMiddleware`：解析 `X-Device-Id`，缺/超长 → 400 `missing_device_id`；懒创建用户并把 `userId` 挂 request（**构造器注入显式 `@Inject()`**）
- [x] 2.2 `QuestionGenerator`：内置 14 条问题库；`generate(userId, recentAnswers)`——无历史 → bank 轮换；有历史 → LLM（≤40 字单问句校验），任何失败落 bank 并记 warn。**代码注释写明：临时散装 LLM 出口，ai-mentor-core 收口**（design.md §3）
- [x] 2.3 `MirrorService.getToday(userId)`：当天有记录直接返回；无 → QuestionGenerator 生成并落库（当天幂等）
- [x] 2.4 `MirrorService.submitAnswer(userId, text)`：trim 后空 → 400 `empty_answer`；>2000 字符 → 400 `answer_too_long`；upsert 并区分 201/200
- [x] 2.5 `MirrorService.listEntries(userId, before, limit)`：仅已回答条目，日期倒序，算 `nextBefore`
- [x] 2.6 单测：QuestionGenerator 四条路径（无历史 bank / LLM 成功 / LLM 失败兜底 / 输出不合格兜底）+ MirrorService 提交校验（用 bootstrap 沉淀的 vitest mock 模式：`vi.fn().mockImplementation` 构造器 + Once 变体，不用 mockReset）

## 3. 接口层

- [x] 3.1 `MirrorController`：`GET /api/mirror/today`、`PUT /api/mirror/today/answer`、`GET /api/mirror/entries`（按 design.md §接口契约）
- [x] 3.2 错误响应统一：`{ message: "<error_code>" }` + 对应 4xx；`AppModule` 注册 middleware 到 `/api/mirror/*`

## 4. 后端集成验证（按 specs/mirror/spec.md 场景编号）

- [x] 4.1 场景 1/2：新设备懒创建用户；缺设备头 400 不建用户
- [x] 4.2 场景 3/4/6：新用户 bank 首问不调 LLM；有历史 LLM 生成并落库；当天重复 GET 幂等
- [x] 4.3 场景 5：停 LLM（改错 ARK_BASE_URL）→ 仍 200 且 `questionSource="bank"`，日志有 warn
- [x] 4.4 场景 7/8/9：首次 PUT 201、重复 PUT 200 更新、空/超长 400
- [x] 4.5 场景 10/11：entries 分页 nextBefore 正确；未回答条目不出现

## 5. 前端

- [x] 5.1 `frontend/lib/theme.dart`：数字文房 token（暖白 #FAF9F6、墨 #2A2A28/#5C574E/#8A857C、朱砂 #B03A2E、边 #CFC9BC/#E6E1D6、衬线大标题）；`frontend/design.md` 增补「照见产品视觉」节
- [x] 5.2 `MirrorApiClient`：带 `X-Device-Id` 头的 GET today / PUT answer / GET entries（设备 ID 用 device_info 或持久化随机 UUID，5s 超时）
- [x] 5.3 镜子时刻页：未回答态（大字问句 + 导师署名行 + 昨日回顾区（有昨日回答时）+ 底部输入 + 朱砂「说完」）；已回答态（展示自己回答 + 日期，无 AI 文案）；loading/error+重试 态
- [x] 5.4 声音档案页：日期倒序列表 + 滚动加载更多 + 空状态（说明 + 引导回镜子时刻）
- [x] 5.5 App 入口改为镜子时刻页；骨架健康页降级为 `/health` 路由保留（排查用）
- [x] 5.6 flutter test：theme token 存在性 + MirrorApiClient 解析/错误 + 页面三态 widget 测试

## 6. 前端视觉验证（场景 12~15）

- [x] 6.1 Android 模拟器实跑：未回答态、提交后已回答态、错误态（停后端）、声音档案列表/空态，截图存变更目录 `screenshots/`
- [x] 6.2 对照原型 v2 平铺截图核对：配色/字号层级/留白，差异记录在案

## 7. 收尾

- [x] 7.1（code-review 技能仅限用户调用，已做人工自查）`code-review` 自查
- [x] 7.2 `spec/tasks.md` 勾选 mirror-moment
- [x] 7.3 运行 validate-template 等价校验并 `/opsx:archive` 归档（macOS 用 python 等价复刻）
- [ ] 7.4 合并回 `version/v1.0`，`spec/devlog.md` 追加记录（注明父分支）

## UI Check

- [x] UI complexity level selected: M（两个新页面 + 主题 token，无新交互范式）
- [x] Existing pattern/component is reused, or new pattern is documented（沿用骨架页三态处理模式；数字文房视觉节写入 frontend/design.md）
- [x] Visual values use tokens or established style variables（全部走 theme.dart token，无散值）
- [x] Required states are covered: loading / empty / error / disabled（两页均覆盖）
- [x] Keyboard access and accessible names are handled（输入框 label/按钮语义命名）
- [x] Screenshot or visual verification is provided（screenshots/ 目录 + 对照原型核对）

## Hardness Check

- [x] Complexity level selected: L（数据模型变更 + 跨模块 + 新机制）
- [x] Boundary is clear; no cross-module internal access（DatabaseModule 共享 Pool，其余各模块走自己 repository；QuestionGenerator 散装出口已写明收口约定）
- [x] Failure behavior is handled or explicitly not applicable（LLM 失败兜底 / 迁移失败中止 / 缺设备头 400 / 回答校验 400）
- [x] Core path and important failure path are verified（单测 + 场景 1~15 集成/视觉验证）
- [x] Logs/metrics cover important behavior without leaking sensitive data（不记回答正文、不记密钥，design.md §可观测性）
- [x] Rollback path is documented, or not applicable with reason（design.md §回滚：revert，表保留不删）
