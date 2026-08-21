# Tasks: cang-knowledge-base

> 实现任务清单。执行阶段逐项推进、逐项勾选。设计见 `design.md`（决策 1~6），场景见 `specs/cang/spec.md`（场景 1~15）。前端界面任务——动手前已读 `frontend/design.md`。

## 1. 数据层

- [x] 1.1 迁移 `backend/migrations/0004_cang.sql`：`cang_items(id BIGSERIAL, user_id FK, text TEXT, source_type VARCHAR(16), source_label VARCHAR(64) NULL, created_at)` + `cang_themes(id BIGSERIAL, user_id FK, name VARCHAR(32), created_at, UNIQUE(user_id, name))` + `cang_item_themes(item_id FK ON DELETE CASCADE, theme_id FK ON DELETE CASCADE, UNIQUE(item_id, theme_id))` + 索引 `idx_cang_items_user_time(user_id, created_at DESC)`、`idx_cang_item_themes_theme(theme_id)`
- [x] 1.2 `backend/src/cang/cang.repository.ts`：insertItem / listThemeNames(userId) / upsertTheme(userId, name)（ON CONFLICT 幂等）/ linkItemThemes / listMap(userId)（联查主题+条目）/ deleteItem(userId, id)（删条目+清理 0 条主题，返回是否删到）
- [x] 1.3 单测 `cang.repository.spec.ts`：插入/主题名列表/upsert 幂等/联查 map 结构/删除级联与空主题清理/删他人才 0 行

## 2. 业务服务

- [x] 2.1 `mentor/persona.ts` + `mentor.service.ts`：`cang_tag` 场景规则（每行一个主题、≤2 个、单个 ≤8 字、优先复用已有、都不合适才新建）+ `askCangThemes(userId, {text, existingThemes}) → string[] | null`（解析校验：按行解析、strip、去重、已有主题忽略空白精确匹配、超 2 截断、空→null）
- [x] 2.2 `cang.service.ts` `collect(userId, {text, sourceType, sourceLabel?})`：先落库 → askCangThemes（任何失败静默跳过）→ upsert + 关联 → 返回 `{id, themes, createdAt}`
- [x] 2.3 `cang.service.ts` `getMap(userId)`（主题按条数降序、条目时间倒序、ungrouped 在尾）+ `deleteItem(userId, id)`（不存在 → CangItemNotFound）
- [x] 2.4 单测 `mentor.service.spec.ts` 追加：askCangThemes 解析校验（正常 2 个/复用已有/新建/超 2 截断/垃圾输出 null/LLM 失败 null）
- [x] 2.5 单测 `cang.service.spec.ts`：collect 正向（含打标关联）/ 打标失败仍 201 未归组 / getMap 排序与分组 / deleteItem 正向 + 不存在

## 3. 接口层

- [x] 3.1 `cang.controller.ts`：`POST /api/cang/items` @HttpCode(201)（text trim 空→400 `empty_text`、>2000→400 `text_too_long`、sourceType 枚举外→400 `invalid_source`、sourceLabel >64→400 `label_too_long`）；`GET /api/cang/map`；`DELETE /api/cang/items/:id`（id 非数字→400 `invalid_id`，NotFound→404 `item_not_found`）
- [x] 3.2 `cang.module.ts` + `app.module.ts` 挂模块，中间件加 `cang/{*splat}`
- [x] 3.3 单测 `cang.controller.spec.ts`：三接口正向 + 四个 400 + 404 + 打标失败仍 201

## 4. 前端 API 层

- [x] 4.1 `frontend/lib/cang_api.dart`：CangItem/CangThemeGroup/CangMap 模型 + `CangApiClient.collect({text, sourceType, sourceLabel?})` / `fetchMap()` / `deleteItem(id)`；错误分类沿用 MirrorApiException/MirrorApiUnreachable 模式
- [x] 4.2 widget 测试配套 FakeCangApi

## 5. 前端页面与入口

- [x] 5.1 镜子页：自己回答块 + 导师回应卡加「收进藏里」小字入口（fsHint 淡墨）；头部加「藏」入口
- [x] 5.2 召唤页：人文回应卡加「收进藏里」入口（sourceLabel = 「{figureName} · 《{sourceTitle}》」）
- [x] 5.3 `frontend/lib/cang_page.dart`：手动输入区（≤2000 字）+ 主题分组列表（主题名 + 条数 + 条目：15px 衬线 + 10px 淡墨来源日期）+ 未归组区 + 长按删除确认 + 空态文案；收藏成功 SnackBar「已收进藏里。」
- [x] 5.4 `main.dart` 接线 CangApiClient 与藏页路由

## 6. 前端测试

- [x] 6.1 `cang_page_test.dart`：空态 / 主题分组渲染 / 手动收藏刷新 / 长按删除 / 未归组在尾
- [x] 6.2 `mirror_page_test.dart` 追加：两处收藏入口可见可点（scrollUntilVisible）；`renwen_page_test.dart` 追加：回应卡收藏入口

## 7. 集成验证（对照 spec 场景）

- [x] 7.1 迁移实跑 + 场景 1~7（curl：三来源收藏 201、手动、打标失败 201 未归组、主题复用不新增行、四个 400、缺头 400）
- [x] 7.2 场景 8~11（curl：map 分组排序、空藏、删除 204 与空主题清理、404）
- [x] 7.3 场景 12~15（模拟器 + 截图：三处入口、藏页浏览、手动收藏与删除、空态）
- [x] 7.4 后端 `npm test`、前端 `flutter test` 全绿

## 8. 收尾

- [x] 8.1 `spec/tasks.md` 勾选 cang-knowledge-base
- [x] 8.2 `spec/devlog.md` 追加变更记录（注明父分支 version/v1.0）
- [x] 8.3 运行 `.\validation\validate-template.cmd`（macOS 用 python 等价复刻）并 `/opsx:archive` 归档

## UI Check

- [x] UI complexity level selected: **M**（新页面 + 三处入口，复用既有模式）
- [x] Existing pattern/component is reused, or new pattern is documented（主题分组卡沿用设置页 option-card 与回应卡模式；收藏入口为既有 fsHint 入口样式）
- [x] Visual values use tokens or established style variables（fsHint/fsBody/fsAnswer/fsMeta、inkDim/inkSoft/hairline/cinnabar）
- [x] Required states are covered: loading / empty / error / disabled（收藏中防重复点击、空态、失败 SnackBar、打标失败无感）
- [x] Keyboard access and accessible names are handled（入口 semanticsLabel；删除有确认）
- [x] Screenshot or visual verification is provided（模拟器截图附变更目录）

## Hardness Check

- [x] Complexity level selected: **L**（新模块 + 三张表 + LLM 新场景 + 前端页面）
- [x] Boundary is clear; no cross-module internal access（cang 自有 repository；LLM 只经 MentorService；sourceLabel 客户端写入不反查他模块）
- [x] Failure behavior is handled or explicitly not applicable（打标失败降级未归组；400/404 三码；日志不含收藏文本）
- [x] Core path and important failure path are verified（场景 1~15 + 各层单测）
- [x] Logs/metrics cover important behavior without leaking sensitive data（source_type/主题数/失败类别/耗时，不记文本）
- [x] Rollback path is documented（纯新增表与路由，代码回滚即恢复，表闲置无害）
