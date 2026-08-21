# Spec: Cang Knowledge Base（藏 · 个人知识库）

**规格风格**：场景式（Scenario-based）——每条规格描述一个可验证的业务场景。

---

## 收藏（collect）

### 场景 1：从镜子回答收藏
- **前置**：用户当天已回答；LLM 正常
- **动作**：`POST /api/cang/items`，`{ "text": "<回答原文>", "sourceType": "mirror_answer", "sourceLabel": "镜子 · 8月21日" }`
- **预期**：返回 201，`{id, themes, createdAt}`；落库 `cang_items`；LLM 打标后 `themes` 含 1~2 个主题名，关联写入 `cang_themes` + `cang_item_themes`（已有主题精确复用，不新建同名）

### 场景 2：从导师回应 / 人文导师回应收藏
- **动作**：`sourceType` 分别为 `mentor_reply` / `renwen_reply`，`sourceLabel` 如「默 · 回应」「王阳明 · 《传习录·钱德洪录》」
- **预期**：均 201 落库，label 原样存储

### 场景 3：藏页手动写一条
- **动作**：`sourceType: "manual"`，无 sourceLabel
- **预期**：201 落库；`sourceLabel` 为 null

### 场景 4：打标失败不阻塞收藏
- **前置**：LLM 未配置 / 超时 / 输出不合格（空、超 2 个外的行无法解析等）
- **动作**：正常 `POST`
- **预期**：仍返回 201，`themes: []`；条目落库且无关联（后续在「未归组」可见）；warn 日志含失败类别、**不含收藏文本**

### 场景 5：主题复用优先
- **前置**：用户已有主题「选择」
- **动作**：收藏一条关于选择的新句子（LLM 收到 existingThemes 含「选择」）
- **预期**：LLM 返回「选择」时**复用已有主题行**（不新增 `cang_themes` 行）；`UNIQUE(user_id, name)` 约束下并发/重复安全

### 场景 6：参数非法
- **动作**：text 为空或全空白；text trim 后超 2000 字；sourceType 为枚举外值；sourceLabel 超 64 字
- **预期**：分别 400 `empty_text` / `text_too_long` / `invalid_source` / `label_too_long`；不落库、不调 LLM

### 场景 7：缺少设备 ID 头
- **动作**：不带 `X-Device-Id` 请求任一 `/api/cang/*`
- **预期**：400 `missing_device_id`

---

## 思想地图（map）

### 场景 8：主题分组浏览
- **前置**：用户有 ≥3 条收藏，分布在 2 个主题 + 1 条未归组
- **动作**：`GET /api/cang/map`
- **预期**：200；`themes` 按条数降序，每组含 name、count、items（条目按时间倒序，含 text / sourceType / sourceLabel / createdAt）；`ungrouped` 含未归组条目

### 场景 9：空藏
- **前置**：用户无任何收藏
- **动作**：`GET /api/cang/map`
- **预期**：200，`{themes: [], ungrouped: []}`（前端渲染空态文案）

---

## 删除（delete）

### 场景 10：删除条目
- **动作**：`DELETE /api/cang/items/:id`（本人条目）
- **预期**：204；条目与关联清理；若某主题因此 0 条，主题一并删除

### 场景 11：删除他人/不存在条目
- **动作**：删除不存在的 id / 他人条目 id
- **预期**：404 `item_not_found`；不泄露存在性

---

## 前端

### 场景 12：三处收藏入口
- **动作**：镜子页（自己回答块、导师回应卡）、召唤页（人文回应卡）各点「收进藏里」
- **预期**：小字入口（fsHint 淡墨）点击后 SnackBar「已收进藏里。」；收藏期间入口防重复点击；失败 SnackBar 可重试提示

### 场景 13：藏页浏览
- **前置**：有多主题收藏
- **动作**：从镜子页头部「藏」入口进入藏页
- **预期**：顶部手动输入区；下方主题分组（主题名 + 条数 + 条目：15px 衬线正文 + 10px 淡墨来源日期行）；「未归组」区在末尾

### 场景 14：藏页手动收藏与删除
- **动作**：手动输入一条 → 收藏；长按某条目 → 确认删除
- **预期**：收藏后列表刷新可见；删除确认后条目消失（主题为 0 条时主题组消失）

### 场景 15：空态
- **前置**：无收藏
- **动作**：打开藏页
- **预期**：显示「还没有收藏。打动你的句子，收进来。」
