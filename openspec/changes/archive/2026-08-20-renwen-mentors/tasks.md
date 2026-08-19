# Tasks: renwen-mentors

> 实现任务清单。依据已确认的 `design.md` 拆解，不产生新决策；执行期发现拆错了就改本文件再继续。

## 1. 数据层

- [x] 1.1 迁移 `backend/migrations/0003_renwen.sql`：`renwen_sessions(id, user_id FK, figure VARCHAR(16), confusion TEXT NULL, response TEXT, source_id VARCHAR(32), source_title VARCHAR(64), created_at)` + `(user_id, created_at DESC)` 索引
- [x] 1.2 `shanghai-date.ts` 加 `shanghaiDayStartMs(now)`（当日 00:00 +8 的 epoch ms，供每日上限计数）
- [x] 1.3 `renwen/renwen.repository.ts`：`insertSession` / `countToday(userId, dayStartMs)` / `countByFigure(userId, figure)` / `countAll(userId)` / `listRecent(userId, 20)`
- [x] 1.4 单测：repository 各方法 + dayStartMs 边界（UTC 16:00 = 上海次日 0 点）

## 2. 出处库

- [x] 2.1 `renwen/canon.ts`：四人物（id/name/epithet/styleHint/persona 人格段/sources 3~4 条真实原典）+ `getFigure` / `pickSource(figure, n)` 轮转 / `pickFigure(n)` 轮转
- [x] 2.2 单测：四人物齐全、每人 ≥3 条、source id 全局唯一、轮转确定性

## 3. mentor 场景扩展

- [x] 3.1 `MentorService`：`SCENE_RULES.renwen_reply` + `askRenwenReply(userId, {figurePersona, figureName, source, confusion})` + `validateRenwenReply`（≤200 字、剥引号、允许问号）；失败抛错（由调用方映 503）
- [x] 3.2 单测：prompt 含人物 persona + 出处原文 + 记忆 + 困惑；校验边界

## 4. renwen 模块与接口层

- [x] 4.1 `renwen.service.ts`：summon 全流程（上限→定人物→定出处→LLM→校验→落库）；`RenwenUnavailable` / 429 `daily_limit_reached`（ServiceUnavailableException / HttpException 429）
- [x] 4.2 `renwen.controller.ts`：`GET /api/renwen/figures`、`POST /api/renwen/summon`（400 invalid_figure / confusion_too_long）、`GET /api/renwen/sessions`
- [x] 4.3 `renwen.module.ts` + `app.module.ts` 注册；中间件挂载加 `renwen/{*splat}`
- [x] 4.4 单测：service 上限/轮转/失败不落库；controller 参数校验

## 5. 前端

- [x] 5.1 `renwen_api.dart`：`RenwenFigure` / `RenwenSession` 模型 + fetchFigures / summon / fetchSessions（沿用错误归类两型）
- [x] 5.2 `mirror_page.dart`：hint 下方加常驻入口「迷茫时，请前人聊聊 →」（fsHint 淡墨）
- [x] 5.3 `renwen_page.dart`：回应卡区 + 困惑输入（≤200）+ 人物选择卡（4 人+「让导师代选」默认，复用设置页选项卡样式）+ 召唤按钮 + 过往列表；429/不可达提示且不丢已填内容
- [x] 5.4 `main.dart` 接线；widget 测试：选择器渲染、召唤成功卡、429/失败重试、过往列表

## 6. 集成验证

- [x] 6.1 场景 1~2：figures 接口 + canon 测试
- [x] 6.2 场景 3~9：curl 验证召唤（指定/代选/留空）、出处轮转、429 上限、503 降级、400 校验、缺头 400
- [x] 6.3 场景 10：sessions 列表
- [x] 6.4 场景 11~14：模拟器跑通入口→召唤→回应卡→列表，截图存 `screenshots/`

## 7. 收尾

- [x] 7.1 code-review 自查（本会话 skill 不可调用，人工走查 2026-08-19：发现并修复 renwen_page 召唤路径 mounted 守卫缺失；记录已接受的 V1 风险——每日上限的计数-写入存在并发窗口，单人设备场景最坏仅当日多召唤一次，成本风险，不加锁）
- [x] 7.2 运行 `validation/validate-template.cmd`（本机无 pwsh，2026-08-19 按脚本逻辑手动复核：spec/hardness.md 存在、本文含 ## Hardness Check 六条；frontend/design.md 存在、本变更为前端界面变更且含 ## UI Check 六条——均通过）
- [x] 7.3 `/opsx:archive` 归档；`spec/tasks.md` 勾选 renwen-mentors；`spec/devlog.md` 追加记录

## UI Check

- [x] UI complexity level selected: S / M / **L**
- [x] Existing pattern/component is reused, or new pattern is documented（人物选择卡复用导师设置页选项卡样式；回应卡复用导师回应卡样式 + 出处行；按钮复用 ZjPrimaryButton）
- [x] Visual values use tokens or established style variables（全部走 Zj token：paper/ink/inkDim/hairline/cinnabar/cinnabarSoft + fsMeta/fsHint/fsBody/fsAnswer）
- [x] Required states are covered: loading / empty / error / disabled（首屏 loading/错误重试；召唤 loading 按钮禁用；429 snackbar；503/不可达内联可重试提示；无历史时「过往」区不渲染）
- [x] Keyboard access and accessible names are handled（入口加 semanticsLabel「打开人文导师团召唤页」；输入框 hint 完整；移动平台无键盘焦点链需求）
- [x] Screenshot or visual verification is provided（screenshots/ 四张：入口、召唤页、回应卡、过往列表）

## Hardness Check

- [x] Complexity level selected: S / M / **L**
- [x] Boundary is clear; no cross-module internal access（renwen 模块自持 repository/canon；LLM 一律经 MentorService renwen_reply 场景网关，无散装出口）
- [x] Failure behavior is handled or explicitly not applicable（LLM 失败/未配置/超字 → 503 renwen_unavailable 不落库；上限 429 不调 LLM；参数 400 先于上限判定；前端均可重试且不丢输入）
- [x] Core path and important failure path are verified（后端 84 测试（含 canon 完整性/轮转/上限/异常映射）+ 前端 28 测试 + curl 场景 1~10 + 模拟器场景 11~14）
- [x] Logs/metrics cover important behavior without leaking sensitive data（日志只记 figure id / source id / 耗时 / 失败类别，不记困惑与回应原文）
- [x] Rollback path is documented, or not applicable with reason（纯新增表 + 新路由：代码回滚即恢复，renwen_sessions 闲置无害；无配置/发布依赖）
