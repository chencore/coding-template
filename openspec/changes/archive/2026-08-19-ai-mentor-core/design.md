# ai-mentor-core — 设计

复杂度：**L**（跨模块 mentor↔mirror、数据模型变更、新模块即新公开面）

## 架构

```
mirror / lesson / report / ... (场景方)
        │  mentor.ask(scene, userId, payload)
        ▼
┌─ MentorService（唯一 LLM 网关）────────────────┐
│  1. 取人格：users.mentor_name / mentor_style    │
│  2. 取记忆：MemoryProvider.recall(userId)       │
│  3. 拼 prompt：风格 system + 场景模板 + 记忆     │
│  4. 调 LLM（thinking disabled，8s 超时）        │
│  5. 校验输出 → 失败按场景降级                   │
└────────────────────────────────────────────────┘
```

- **MemoryProvider 接口**：`recall(userId): Promise<string>`（返回可注入 prompt 的记忆文本）。当前唯一实现 `RawHistoryMemoryProvider`：近 14 天有回答的镜子条目（问题+回答），整体截断至 3000 字。蒸馏实现留到 weekly-report，届时换实现不改场景方。
- **LLM 客户端**：`mentor/llm.client.ts` 持有 baseUrl/key/model/timeout，`chat(system, user, maxTokens)` 单方法；`thinking: {"type":"disabled"}` 只在这里出现一次，场景方不碰 HTTP。密钥未配置 → 抛 `LlmNotConfigured`，各场景按自己的降级策略处理。

## 决策

### 决策 1：人格存 users 加列（migration 0002）
- **选择**：`users` 加 `mentor_name VARCHAR(32) NOT NULL DEFAULT '默'`、`mentor_style VARCHAR(16) NOT NULL DEFAULT 'gentle'`；`mirror_entries` 加 `mentor_reply TEXT NULL`
- **放弃**：独立 `mentor_profiles` 表
- **理由**：1:1 关系，一次查询带出；人文导师团真要多对多时再建关联表，现在建是过度设计。存量行由 DEFAULT 自动补齐，无数据搬迁

### 决策 2：MentorService 场景化网关
- **选择**：`ask(scene: 'mirror_question' | 'mentor_reply', userId, payload)`；每个场景一个 prompt 模板 + 输出校验器 + 降级策略。场景方（mirror）不再直接握 LLM 配置
- **放弃**：①每个场景各自直接调 LLM（现状，散装）②通用 chat 接口让场景方自带 system prompt（人格注入会漏）
- **理由**：人格与记忆的注入收口在唯一入口，「所有 AI 出口统一为导师人格」在代码结构上可强制；新场景 = 注册一个新 scene，不复制管道

### 决策 3：记忆 V1 = 原始历史注入
- **选择**：近 14 天回答历史原文注入（cap 3000 字）
- **放弃**：本变更建 memory_facts 蒸馏表 + 异步蒸馏任务
- **理由**：一天一条回答，14 天原文远低于上下文上限；蒸馏的增量价值要等周报/百日飞轮才显现，且引入异步一致性负担——接口预留，实现后置

### 决策 4：导师回应同步生成、失败可缺省
- **选择**：`PUT /mirror/today/answer` 内同步生成回应（≤60 字、单句、不追问、不复述用户原文），存 `mentor_reply` 随响应返回；LLM 失败/超时/输出不合格 → `mentor_reply = NULL`（警告日志，不含用户内容），前端回落到固定文案「已记下。明天见。」；回答当日可改，**每次提交重新生成回应**（否则旧回应引用旧文）
- **放弃**：①异步生成 + 轮询/推送（响应快但链路重，V1 不值）②回应失败时后端给固定文案（固定文案是展示层关切，且要让前端能区分「导师真回应」与「兜底语」）
- **理由**：8s 超时内同步返回体验最简单；回应是锦上添花，缺省不阻塞主流程

### 决策 5：风格即 system prompt 人格段
- **选择**：三风格各一段人格描述，与通用「照见导师守则」（不说教、不评判、短、中文、署名意识）拼成 system prompt：
  - `gentle` 温和引导型：接纳优先，语气温和，多用「嗯」「我在听」式承接
  - `socratic` 苏格拉底追问型：以提问启发（但镜子回应场景仍遵守「不追问」的场景约束），措辞简洁理性
  - `companion` 同伴同行型：平辈口吻，不端着，可说「我也会这样」
- **放弃**：风格只换措辞模板不换 prompt（差异太假）；或开放自由文本人格（注入与安全风险，V1 不做）
- **理由**：风格是人格的核心体感，prompt 是最直接的实现；枚举值约束在 API 层校验

### 决策 6：profile 接口契约
- `GET /api/mentor/profile` → `{ name, style }`（DeviceIdMiddleware 懒建用户后默认 默/gentle）
- `PUT /api/mentor/profile` body `{ name?, style? }`，至少给一个字段（否则 400 `empty_profile_update`）；name trim 后 1–12 字（400 `invalid_name`），style 须为枚举三值（400 `invalid_style`）；返回更新后的 `{ name, style }`
- 中间件挂载路径新增 `api/mentor/{*splat}`

### 决策 7：镜子接口响应扩展（向后兼容新增字段）
- `GET /api/mirror/today` 响应加 `mentor: { name }` 与 `mentorReply: string | null`
- `PUT /api/mirror/today/answer` 响应同上加 `mentorReply`
- 前端署名从硬编码「默 · 你的导师」改为「{name} · 你的导师」；已回答态/提交后展示回应卡（有回应时）

### 决策 8：QuestionGenerator 收口方式
- **选择**：`QuestionGenerator` 类删除，逻辑迁入 `mentor` 模块为 `mirror_question` 场景（bank 题库随之迁入 mentor 模块，因为「无历史用题库」是该场景的降级策略）；`MirrorService` 改调 `MentorService.ask('mirror_question', ...)`
- **放弃**：QuestionGenerator 保留为薄壳转发（多一层无价值间接）
- **理由**：彻底消灭散装出口；bank 题库是「导师还没开口时的声音」，归属导师人格层

## 降级矩阵（Failure）

| 场景 | LLM 未配置 | LLM 超时/报错 | 输出校验失败 |
|------|-----------|--------------|-------------|
| mirror_question | bank | bank + warn | bank + warn |
| mentor_reply | reply=null | reply=null + warn | reply=null + warn |

bank 兜底与 reply 缺省都**不阻塞**镜子主流程；profile 读写不依赖 LLM。

## 回滚

- 代码回滚即恢复；迁移 0002 为纯加列（无破坏），回滚代码后新列闲置无害
- 若上线后要撤回应功能：前端隐藏回应卡即可，`mentor_reply` 数据保留

## 观测

- 日志：`mentor.ask` 记 scene / 耗时 / 命中降级类型；**不记录用户回答原文与 LLM 输出原文**（沿用 mirror-moment 约定）
- 前端设置页保存失败提示可重试，不丢已填内容
