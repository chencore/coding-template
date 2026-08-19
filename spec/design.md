# Design

> **维护规则**：本文件是**项目整体设计与架构决策**，仅在**人工明确要求**时修改。AI 不得擅自更新。

---

## 1. 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端 | Flutter（stable），仅 iOS 首发；工程含 Android 平台（仅开发验证目标，2026-08-18 bootstrap 提升）；依赖：http、shared_preferences（设备 ID 持久化，2026-08-18 mirror-moment 提升） | 个人开发者一套代码留多端的余地；MVP 只落地 iOS |
| 前端原生模块 | iOS 原生（Swift）：拦截时刻（Screen Time API / 辅助功能） | 跨端框架无法直接提供该能力，审核风险需原生方案早验证 |
| 后端 | NestJS + TypeScript（2026-08-18 bootstrap 提升） | TS 全栈心智负担最低，模块化结构贴合模块划分 |
| 数据库 | PostgreSQL 16 + pgvector（docker-compose 本地构建镜像：`FROM postgres:16` + apt 装 pgvector，2026-08-18 bootstrap 提升） | 关系数据 + 向量检索一库两用；本地构建规避 Docker Hub 拉取受限 |
| LLM | 火山方舟 **Coding Plan**（OpenAI 兼容端点 `.../api/coding/v1`，当前模型 glm-5.2，2026-08-18 bootstrap 提升） | 国内可直连、合规低、套餐成本固定；供应商可替换（换 base URL + model 即可） |
| 部署 | 待定 | M4 `setup-production-deployment` 定 |

**后端通用约束（2026-08-18 bootstrap 提升）**：dev 用 tsx（esbuild）运行，不保证 `emitDecoratorMetadata`——**所有 NestJS 构造器注入必须显式写 `@Inject()`**，不得依赖按类型注入。

**LLM 调用约束（2026-08-18 mirror-moment 提升）**：glm 推理模型不显式关思考会把 `max_tokens` 耗尽于 reasoning、`content` 返回空（finish_reason=length）——**所有 chat completion 请求必须带 `thinking: {"type": "disabled"}`（方舟扩展字段）**，除非确需推理。

**数据访问与迁移（2026-08-18 mirror-moment 提升）**：裸 pg + SQL 顺序迁移，不引 ORM。共享 `DatabaseModule`（全局单例 Pool），迁移文件 `backend/migrations/*.sql` 启动时比对 `schema_migrations` 表自动执行，任一失败即启动失败（不半迁移运行）。后续变更默认沿用；表数量 >6 或关联复杂化时再评估 Prisma。

**用户标识（2026-08-18 mirror-moment 提升）**：匿名设备 ID——业务 API 走 `DeviceIdMiddleware` 读 `X-Device-Id` 头，懒建 `users` 行；缺头 400。换设备/重装即新身份是已知局限，账号绑定留给后续变更（加 `user_identities` 关联即可）。

**日期口径（2026-08-18 mirror-moment 提升）**：业务日历日固定 Asia/Shanghai（UTC+8），应用层计算后写入（`backend/src/common/shanghai-date.ts`：`shanghaiToday` / `shanghaiDaysAgo` / `shanghaiDayStartMs`（当日 0 点，供「当日」计数，2026-08-20 renwen-mentors 补）），不读设备时区；pg DATE 类型不做 JS Date 转换（typeParser 保持字符串）。

**AI 出口统一（2026-08-19 ai-mentor-core 提升）**：所有 LLM 调用必须经 `mentor` 模块 `MentorService` 场景化网关（人格 + 记忆注入、按场景的输出校验与降级策略），禁止场景方直接调 LLM SDK；`thinking: {"type":"disabled"}` 只出现在 `mentor/llm.client.ts`。导师记忆经全局 `MemoryModule` 的 `MEMORY_PROVIDER` 令牌注入（V1 实现 = 近 14 天原始回答注入；蒸馏落地时换实现，场景方不改）——依赖方向 MirrorModule → MentorModule，记忆反向读镜子数据故用全局模块解环。

**导师回应契约（2026-08-19 ai-mentor-core 提升）**：镜子回答后的导师回应 ≤60 字、单行、不追问（不以问号结尾）、不复述用户原文；生成失败落 `null`（不阻塞主流程），前端回落固定文案。

**人文导师团（2026-08-20 renwen-mentors 提升）**：召唤历史人物回应经 `MentorService` `renwen_reply` 场景发出（人物 persona 顶替导师人格段，导师退居引荐位）。**注入式出处防幻觉**：出处条目是代码常量（`backend/src/renwen/canon.ts`，随代码评审/版本化），召唤时先选定条目注入 prompt，标注一律用库内篇名——出处是选择物，不是生成物；同人物相邻条目篇名不重复（轮转时用户看到的出处必换）。**召唤类主动作的失败语义**：LLM 失败 → 显式 503 `renwen_unavailable`、不落库，不做假兜底（与导师回应的 null 缺省对照：有主流程可让路才允许缺省）。每日上限 3 次，429 先于 LLM 调用。

## 2. 系统架构

```
[ iOS App（跨端框架 + 原生拦截模块）] ─── [ 后端 API ] ─── [ LLM（国内大模型）]
                                              │
                                       [ 用户记忆 / 内容存储 ]
```

核心架构原则：**所有 AI 出口统一为「导师人格」**——镜子时刻、日课、藏、周报、拦截语都由同一个导师身份发出，后端需有统一的导师上下文（人格 + 用户记忆）注入层，不做散装 AI 调用。

## 3. 模块划分

- **mentor** — 导师人格与记忆：人格配置、风格切换、用户表达的长期记忆，所有 AI 交互的统一入口
- **mirror** — 镜子时刻：每日一问生成、回答收集、声音档案
- **renwen** — 人文导师团：历史人物召唤（预置出处库、每日上限、落库回看），LLM 经 mentor 网关（2026-08-20 renwen-mentors 落地）
- **cang** — 藏：收藏、思想地图（主题聚类）
- **lesson** — 今日日课：微行动定制与完成记录
- **report** — 对账周报：双视角分析、历史共鸣
- **intercept** — 拦截时刻：灰名单检测、逃避/想看引导（iOS 原生）
- **growth** — 获客与分享：算法人格档案、变化卡片
- **billing** — 订阅：免费层/付费墙
- **account** — 账号与数据主权：导出、注销删除

## 4. 数据模型（核心实体）

> 已落地表结构以 `backend/migrations/*.sql` 为准（2026-08-18 mirror-moment 起）。

### User（已落地，2026-08-18；导师人格 2026-08-19）
- `id BIGSERIAL`, `device_id VARCHAR(64) UNIQUE`（匿名设备标识）, `created_at`
- `mentor_name VARCHAR(32) DEFAULT '默'`, `mentor_style VARCHAR(16) DEFAULT 'gentle'`（gentle/socratic/companion，`GET/PUT /api/mentor/profile` 读写）
- 待补：订阅状态、账号绑定（`user_identities`）

### MirrorEntry（声音档案，已落地 2026-08-18；导师回应 2026-08-19）
- `user_id` FK, `entry_date DATE`（Asia/Shanghai 日历日）, `question`, `question_source('llm'|'bank')`, `answer NULL=未回答`, `answered_at`
- `mentor_reply TEXT NULL`（导师回应；NULL = 未回答或生成失败）
- `UNIQUE(user_id, entry_date)`——一天一问题一回答，当天可改

### MentorMemory（导师记忆）
- 用户回答、日课完成度、收藏、情绪变化——产品的数据护城河
- V1 已落地（2026-08-19）：非表结构，`MemoryProvider` 接口 + 近 14 天镜子回答原文注入（cap 3000 字）；蒸馏事实表留到 weekly-report 变更

### RenwenSession（人文导师团召唤，已落地 2026-08-20）
- `user_id` FK, `figure VARCHAR(16)`（canon 人物 id）, `confusion TEXT NULL`, `response TEXT`, `source_id`, `source_title`（库内篇名）, `created_at`
- 只增不改：召唤即历史；每日上限 3 次按（user_id, 上海当日）计数；人物代选与出处轮转按累计召唤数取模

### CangItem（藏）
- 收藏的句子/顿悟、主题标签、来源

### Lesson（日课）
- 微行动内容、来源依据（来自哪次表达）、完成感受

## 5. 关键接口约定

- **鉴权**：待定（首个变更确定）
- **错误码**：待定
- **版本化**：待定

## 6. 关键决策与权衡

### 决策 1：跨端框架 + 仅 iOS 首发
- **选择**：Flutter / RN 跨端栈，MVP 只做 iOS
- **放弃的方案**：iOS 原生 SwiftUI 全量
- **理由**：个人开发者一套代码留多端的余地；代价是拦截等 iOS 能力必须写原生模块（审核风险不变），且跨端调试成本需在 M1 验证

### 决策 2：国内大模型
- **选择**：国内供应商（火山方舟 / DeepSeek / 通义）
- **放弃的方案**：OpenAI / Claude 等海外模型
- **理由**：国内可直连、合规风险低、成本个人开发者可承受

### 决策 3：V1 文字先行，语音后置
- **选择**：镜子时刻 V1 仅文字回答
- **放弃的方案**：MVP 即含 ASR 语音
- **理由**：降低 MVP 成本与外部依赖；ASR 选型（PRD 开放问题）未定时不阻塞核心闭环

### 决策 4：只打断不阻止
- **选择**：拦截时刻只做提示与引导，不做硬性锁机
- **放弃的方案**：强制禁用/锁机
- **理由**：对抗意志力必败（对手是推荐系统）；且降低 iOS 审核拒绝风险

## 7. 待定项（Open Questions）

- ~~Flutter 还是 RN~~ → 已定 Flutter（2026-08-18 bootstrap）
- ~~后端技术栈与数据库选型~~ → 已定 NestJS + Postgres/pgvector（2026-08-18 bootstrap）
- ~~国内 LLM 具体供应商~~ → 已定火山方舟 Coding Plan（glm-5.2），供应商可替换设计（2026-08-18 bootstrap）
- iOS 拦截走 Screen Time API 还是辅助功能（M3 前必须有结论，影响审核）
- 语音回答 ASR/TTS 选型（语音版本启动前）
- 产品定名「照见」/「返真」/「本我」（内容启动前）
- 订阅定价 39/月 是否合适（MVP 验证后回顾）
- Xcode 未安装，iOS 模拟器验证待补（环境问题，非设计问题）
