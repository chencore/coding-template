# Tasks: ai-mentor-core

> 实现任务清单。依据已确认的 `design.md` 拆解，不产生新决策；执行期发现拆错了就改本文件再继续。

## 1. 数据层

- [x] 1.1 迁移 `backend/migrations/0002_mentor.sql`：`users` 加 `mentor_name VARCHAR(32) NOT NULL DEFAULT '默'`、`mentor_style VARCHAR(16) NOT NULL DEFAULT 'gentle'`；`mirror_entries` 加 `mentor_reply TEXT NULL`
- [x] 1.2 `users.repository.ts`：`getMentorProfile(userId)` / `updateMentorProfile(userId, {name?, style?})`（只更新传入字段）
- [x] 1.3 `mirror.repository.ts`：`updateMentorReply(userId, date, reply)`；近 N 天回答查询复用已有 `findRecentAnswers`（无需新增）
- [x] 1.4 单测：`users.repository` 与 `mirror.repository` 新方法（vitest，沿用 vi.hoisted 模式；含默认人格值验证）

## 2. mentor 模块（统一 AI 出口）

- [x] 2.1 `mentor/llm.client.ts`：`chat(system, user, maxTokens)`，内含 `thinking: {"type":"disabled"}`、8s 超时；密钥未配置抛 `LlmNotConfigured`；不记用户内容
- [x] 2.2 `mentor/memory.ts`：`MemoryProvider` 接口（`recall(userId): Promise<string>`）+ `RawHistoryMemoryProvider`（近 14 天、cap 3000 字）
- [x] 2.3 `mentor/persona.ts`：风格枚举 `gentle|socratic|companion`、三段风格人格文案、通用守则拼装 `buildSystemPrompt(persona)`
- [x] 2.4 `MentorService.ask('mirror_question')`：题库与 `validateQuestion` 从 mirror 模块迁入；无历史→bank，LLM 失败→bank+warn
- [x] 2.5 `MentorService.ask('mentor_reply')`：回应模板 + `validateReply`（≤60 字、单行、不以问号结尾）；失败返回 `null`+warn
- [x] 2.6 单测：llm.client、memory、persona 拼装、两场景的正向+降级矩阵（call-count 用 delta 断言）

## 3. mirror 收口

- [x] 3.1 `mirror.service.ts`：`ensureToday` 改调 `MentorService.ask('mirror_question')`；删除 `question-generator.ts`（含散装出口注释的债清偿）
- [x] 3.2 `submitAnswer`：回答写入后调 `ask('mentor_reply')` 并 `updateMentorReply` 落库（每次提交重新生成）；`TodayResponse` 扩展 `mentor: {name}` 与 `mentorReply`
- [x] 3.3 单测改造：`mirror.service.spec.ts` 改 mock MentorService，覆盖回应生成/失败/重生

## 4. 接口层

- [x] 4.1 `mentor/mentor.controller.ts`：`GET /api/mentor/profile`、`PUT /api/mentor/profile`（校验：name trim 后 1–12 字→`invalid_name`；style 枚举→`invalid_style`；无有效字段→`empty_profile_update`）
- [x] 4.2 `app.module.ts`：注册 MentorModule；DeviceIdMiddleware 挂载路径加 `api/mentor/{*splat}`

## 5. 前端

- [x] 5.1 `mentor_api.dart`：`MentorProfile` 模型 + fetch/update；`mirror_api.dart` 的 `MirrorToday` 扩展 `mentorName` / `mentorReply`
- [x] 5.2 `mirror_page.dart`：署名改动态「{name} · 你的导师」；已回答态/提交后展示回应卡（null 时固定文案「已记下。明天见。」）；header 加「导师」入口
- [x] 5.3 `mentor_settings_page.dart`：改名输入 + 三风格单选（温和引导/苏格拉底追问/同伴同行）+ 保存；失败提示且不丢已填内容（走 `Zj` tokens 与 `ZjPrimaryButton`）
- [x] 5.4 widget 测试：设置页渲染/保存/失败重试；镜子页动态署名与回应卡（沿用 FakeApi 手搓模式）

## 6. 集成验证

- [x] 6.1 场景 1~6（profile）：curl 验证默认人格、改名、非法名、切风格、非法风格/空 body、缺头 400
- [x] 6.2 场景 7~9（提问收口与人格注入）：有历史用户验证 LLM 调用含人格+记忆（日志/断点）；无历史 bank；LLM 断网降级 bank
- [x] 6.3 场景 10~13（回应）：提交得回应（≤60 字无问号）、LLM 断网 mentorReply=null、改回答回应重生、风格入 prompt
- [x] 6.4 场景 14~16（前端）：模拟器跑通设置页改名切风格→署名生效→回应卡展示，截图存变更目录 `screenshots/`

## 7. 收尾

- [x] 7.1 code-review 自查（skill 本会话不可调用，已人工走查：无 QuestionGenerator 残留引用；controller 非对象 body 防御补 400；模块环经全局 MemoryModule 解开；日志不含用户内容）
- [x] 7.2 运行 `validation/validate-template.cmd` 通过
- [ ] 7.3 `/opsx:archive` 归档；`spec/tasks.md` 勾选 ai-mentor-core；`spec/devlog.md` 追加记录

## UI Check

- [x] UI complexity level selected: S / M / **L→M**（新页面但纯复用现有 token/组件，定 M）
- [x] Existing pattern/component is reused, or new pattern is documented（导师回应卡/设置页选项卡为新组件，已记入 frontend/design.md「关键组件」）
- [x] Visual values use tokens or established style variables（全部走 Zj tokens / ZjPrimaryButton）
- [x] Required states are covered: loading / empty / error / disabled（设置页 loading/加载失败重试/保存中禁用；镜子页回应缺省回落固定文案）
- [x] Keyboard access and accessible names are handled（入口 GestureDetector 带 semanticsLabel；输入框原生键盘可达）
- [x] Screenshot or visual verification is provided（screenshots/ 三张，含 README 偏差说明）

## Hardness Check

- [x] Complexity level selected: S / M / **L**（跨模块 + 数据模型变更 + 新公开接口）
- [x] Boundary is clear; no cross-module internal access（mentor 经 MirrorRepository 公开方法读历史；middleware 移入 common 供两模块共用；模块环用全局 MemoryModule 解开）
- [x] Failure behavior is handled or explicitly not applicable（降级矩阵：提问→bank、回应→null；LLM 8s 超时；profile 校验 400 三码）
- [x] Core path and important failure path are verified（后端 51 测试含降级矩阵；前端 21 测试；场景 1~13 curl 实证，14~16 模拟器截图）
- [x] Logs/metrics cover important behavior without leaking sensitive data（只记 scene/耗时/降级类别，不落用户内容与 LLM 输出）
- [x] Rollback path is documented（design.md：纯加列迁移，回滚代码新列闲置；撤回应功能前端隐藏回应卡即可）
