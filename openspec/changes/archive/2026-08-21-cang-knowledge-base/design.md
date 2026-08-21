# cang-knowledge-base — 设计

复杂度：**L**（新模块 + 三张新表 + LLM 新场景 + 前端新页面与三处入口）

## 架构

```
镜子回答 / 导师回应 / 人文回应 / 藏页手动输入
        │ POST /api/cang/items {text, sourceType, sourceLabel}
        ▼
CangService.collect(userId, ...)
  1. 参数校验 → 落库 cang_items（收藏是主行动，先保证收到）
  2. MentorService.askCangThemes(userId, {text, existingThemes})
       ├─ 命中 → upsert cang_themes + 写 cang_item_themes
       └─ 失败/超时/输出不合格 → 跳过（条目留「未归组」）
GET /api/cang/map → 主题分组 + 未归组，前端藏页浏览
```

## 决策

### 决策 1：三张表——条目 / 主题 / 多对多关联
- **选择**：`cang_items(id, user_id, text, source_type, source_label, created_at)`；`cang_themes(id, user_id, name, created_at, UNIQUE(user_id, name))`；`cang_item_themes(item_id, theme_id, UNIQUE 对)`
- **放弃**：条目上存 themes JSON 数组（无法按主题聚合查询、主题改名难）
- **理由**：一题 1~2 主题是真实多对多；`UNIQUE(user_id, name)` 让 upsert 幂等；主题归用户私有（同一主题名对不同用户互不干扰）

### 决策 2：收藏与打标解耦——先收后标，标失败不阻塞
- **选择**：collect 先落库再调 LLM；打标任何失败（未配置/超时/输出不合格）静默跳过，条目留未归组；响应照常 201
- **放弃**：打标失败 → 503（对照 renwen 召唤：那里召唤即目的；这里收藏才是目的，归组是增强）
- **理由**：与已提升的失败语义原则一致——有主流程可让路才允许缺省

### 决策 3：打标场景 `cang_tag` 走 MentorService 网关
- **选择**：`askCangThemes(userId, {text, existingThemes})` → `string[] | null`；system = 导师人格 + 场景规则（「导师整理思想地图」，人格一致）；user = 已有主题清单 + 本次文本；输出契约：每行一个主题，≤2 个，单个 ≤8 字，优先复用已有主题（精确匹配），都不合适才新建
- **校验**：按行解析，strip，去重；复用已有主题时忽略大小写/空白差异后的精确匹配；超 2 个截断；空结果 → null
- **理由**：所有 LLM 出口统一经网关（项目级约束）；主题名短小有界，地图才不会碎成一地标签

### 决策 4：source_label 由客户端写入（展示用元信息）
- **选择**：收藏时客户端传 `sourceLabel`（如「镜子 · 8月18日」「王阳明 · 《传习录·钱德洪录》」「默 · 回应」），后端原样存（≤64 字）；`sourceType` 枚举校验（`mirror_answer`/`mentor_reply`/`renwen_reply`/`manual`）
- **放弃**：后端按 source_ref 反查来源拼 label（跨模块读 mirror/renwen 表，破坏边界）
- **理由**：label 是展示物不是事实源；用户自己的数据，客户端写入可接受

### 决策 5：接口契约
- `POST /api/cang/items` body `{text, sourceType, sourceLabel?}`（text trim 后 1~2000 字→`empty_text`/`text_too_long`；sourceType 非法→`invalid_source`）→ 201 `{id, themes: [name...], createdAt}`
- `GET /api/cang/map` → `{themes: [{name, count, items: [{id, text, sourceType, sourceLabel, createdAt}]}], ungrouped: [同构 items]}`；主题按条数降序，条目按时间倒序
- `DELETE /api/cang/items/:id` → 204；删他人/不存在 → 404 `item_not_found`；删条目时清理关联，主题为 0 条时顺手删主题
- 中间件挂载加 `cang/{*splat}`

### 决策 6：前端结构与收藏入口
- 入口：镜子页头部加「藏」（档案/导师旁）；三处收藏入口为内容块旁的「收进藏里」小字（fsHint 淡墨，不抢眼）：镜子页自己回答块、导师回应卡、召唤页人文回应卡
- 藏页自上而下：手动输入（顿悟随手记，≤2000 字）→ 主题分组列表（主题名 + 条数；展开或直接列条目：条目 = 15px 衬线正文节选 + 10px 淡墨「来源 · 日期」）→「未归组」区在末尾
- 反馈：收藏成功 SnackBar「已收进藏里。」；失败 SnackBar 可重试提示；删除左滑/长按 → 确认后删（V1 用长按，避免引入滑动手势组件）
- 空态：「还没有收藏。打动你的句子，收进来。」

## 降级矩阵（Failure）

| 场景 | LLM 未配置/超时/输出不合格 | 参数非法 | 删除不存在 |
|------|--------------------------|---------|-----------|
| collect | 201 照常返回，条目未归组 | 400 三码 | — |
| map | 不涉及 LLM | — | — |
| delete | — | 400 invalid id | 404 |

## 回滚

纯新增表与新路由，代码回滚即恢复；三张 cang 表闲置无害。

## 观测

- 日志：收藏成功（source_type）、打标结果（命中主题数 / 失败类别）、耗时；**不记收藏文本**（用户内容同 mentor 约定）
