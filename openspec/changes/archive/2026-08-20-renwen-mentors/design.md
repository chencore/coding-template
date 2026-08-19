# renwen-mentors — 设计

复杂度：**L**（新模块 + 新表 + LLM 新场景 + 前端新页面）

## 架构

```
镜子页「迷茫时，请前人聊聊 →」→ 召唤页
        │ POST /api/renwen/summon {figureId?, confusion?}
        ▼
RenwenService.summon(userId, ...)
  1. 每日上限检查（renwen_sessions 当日计数，≥3 → 429）
  2. 定人物：用户指定 / 导师代选（轮转，见决策 3）
  3. 定出处：从 canon 库按 (userId, figure, 该人物累计召唤数) 轮转取条目
  4. MentorService.ask('renwen_reply', {figure, source, confusion})  ← 人格+记忆注入在此
  5. 校验输出 → 落库 renwen_sessions → 返回
```

## 决策

### 决策 1：人物与出处库 = 代码常量（`renwen/canon.ts`）
- **选择**：四位人物（socrates / aurelius / wangyangming / zengguofan），每位含 persona 人格段 + 3~4 条出处条目 `{id, title, text}`，全部硬编码在 TS 常量
- **放弃**：DB 表 + 种子迁移
- **理由**：内容就是产品的一部分，跟代码一起评审/版本化最合适；V1 无运营后台需求。真实出处示例：《申辩篇》「未经省察的生活不值得过」、《沉思录》卷五「挡住去路的东西，本身就成了路」、《传习录》岩中花树、《曾国藩家书》「凡人做一事，便须全副精神注在此一事」

### 决策 2：出处防幻觉 = 注入式生成
- **选择**：summon 时先选定一条出处条目，把 `text` 注入 prompt 并要求回应「呼应这条思想」；返回的出处标注直接用库里的 `title`，LLM 输出的任何引文样式文本都不作数
- **放弃**：LLM 自由生成引文+出处（幻觉硬伤）；或事后校验引文真实性（校验器本身不可靠）
- **理由**：把「出处」从生成物变成选择物——LLM 只负责把既定思想说到用户处境上

### 决策 3：人物与出处的轮转策略
- **选择**：用户不选人物时「导师代选」= 按（该用户累计召唤次数）轮转四位；出处按（该用户该人物累计召唤数）mod 条目数轮转
- **放弃**：LLM 代选人物（多一次调用，输出契约变复杂）；纯随机（不可测试）
- **理由**：确定性轮转保证同人不重复听同一条出处，且单测可断言

### 决策 4：导师团场景挂在 MentorService 下
- **选择**：`SCENE_RULES` 加 `renwen_reply`，`askRenwenReply(userId, {figurePersona, figureName, source, confusion})`；system = 人物 persona + 通用守则（精简版）+ 场景规则；user = 记忆 + 困惑 + 出处 + 任务。导师本人格退居「引荐」位置（前端 meta 行「{默} 请来了 {figureName}」）
- **放弃**：renwen 模块自带 LLM 调用（又开散装出口，违背刚收口的架构）
- **理由**：统一出口的价值就在于新场景不新开管道；记忆注入让历史人物能呼应用户最近的镜子表达

### 决策 5：输出校验与失败语义
- **选择**：回应 ≤200 字、剥引号、允许问号（苏格拉底式本来就是追问）；LLM 失败/不合格 → **503 `renwen_unavailable`**（前端错误态可重试），不落库
- **放弃**：失败时给预写文案兜底（召唤是主动作，假回应比没有更糟）；像 mentor_reply 一样 null 缺省（这里没有主流程可让路）
- **理由**：召唤本身就是目的，失败要显式告诉用户「暂时请不来，稍后再试」

### 决策 6：每日上限 3 次
- **选择**：`renwen_sessions` 按 Asia/Shanghai 当日计数（新增 `shanghaiDayStartMs` 辅助函数），≥3 → 429 `daily_limit_reached`；响应带 `remainingToday`
- **放弃**：不限（成本与防刷裸奔）；令牌桶（杀鸡用牛刀）
- **理由**：3 次够「迷茫时」用，也保持稀缺感

### 决策 7：接口契约
- `GET /api/renwen/figures` → `{ figures: [{id, name, epithet, styleHint}] }`（选择器数据，不含出处原文）
- `POST /api/renwen/summon` body `{figureId?, confusion?}`（confusion 可空，≤200 字→`confusion_too_long`；figureId 非法→`invalid_figure`）→ 201 `{ id, figure: {id,name,epithet}, response, source: {title}, remainingToday, createdAt }`；429 `daily_limit_reached`
- `GET /api/renwen/sessions` → `{ sessions: [...最近 20 条倒序] }`
- 中间件挂载加 `renwen/{*splat}`

### 决策 8：前端页面结构
- 镜子页 hint 下方加常驻入口「迷茫时，请前人聊聊 →」（fsHint 淡墨，不抢眼）
- 召唤页自上而下：最新回应卡区（召唤后填）→ 困惑输入（可空，200 字）→ 人物选择卡（4 人 + 默认「让导师代选」，复用设置页选项卡样式）→ 召唤按钮（loading 同 ZjPrimaryButton）→ 过往召唤列表（人物+日期+回应节选+出处）
- 错误态：429 显示「今天已请过三次了，明天再来。」；503/不可达显示可重试提示，已填困惑不丢

## 降级矩阵（Failure）

| 场景 | LLM 未配置/超时/输出不合格 | 每日上限 | 参数非法 |
|------|--------------------------|---------|---------|
| summon | 503 renwen_unavailable，不落库 | 429，不调 LLM | 400 三码 |

## 回滚

纯新增表与新路由，代码回滚即恢复；`renwen_sessions` 闲置无害。

## 观测

- 日志：scene/figure/耗时/失败类别/是否命中上限；**不记困惑与回应原文**（同 mentor 约定）
