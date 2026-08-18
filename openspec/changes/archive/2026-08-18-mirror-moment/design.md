# Design: Mirror Moment

**复杂度：L**——数据模型变更（首批业务表）、跨模块（前后端 + DB + LLM）、新机制（迁移、设备标识）。

## 架构概览

```
[ Flutter 镜子时刻页 ] ──X-Device-Id──▶ [ NestJS ]
        │                                  ├─ DeviceIdMiddleware → 懒建 users
        │                                  ├─ MirrorController
        │                                  │    ├─ GET  /api/mirror/today
        │                                  │    ├─ PUT  /api/mirror/today/answer
        │                                  │    └─ GET  /api/mirror/entries
        │                                  ├─ MirrorService ──▶ QuestionGenerator
        │                                  │                      ├─ LLM（近 7 天回答 → 个性化问题）
        │                                  │                      └─ 问题库兜底（14 条内置）
        │                                  └─ MirrorRepository ──▶ PostgreSQL
        └─ theme.dart（数字文房 token：暖白/墨色/朱砂）
```

## 关键决策

### 1. 用户标识 —— X-Device-Id + 懒创建（kickoff 已拍板方向）

**选择**：所有业务 API 走 `DeviceIdMiddleware`：读 `X-Device-Id` 头，查 `users` 表，不存在则插入（懒创建），把 `userId` 挂上 request。缺头 → 400。

**理由**：零摩擦符合 PRD「不问权限不弹窗」；多用户数据模型从第一天就位，避免后期迁移。已知局限：换设备/卸载重装即新身份——绑定手机号/Apple 留给后续变更，届时加 `user_identities` 关联即可，不阻塞。

### 2. 每日问题生成 —— LLM 个性化 + 问题库兜底

**选择**：`GET /today` 惰性生成——当天无问题时触发：有近 7 天回答 → 调 LLM 生成一条问题（`question_source='llm'`）；无历史或 LLM 任何失败 → 从 14 条内置问题库按日期轮换选取（`question_source='bank'`）。问题生成后落库，当天重复 GET 不重复调 LLM。

**理由**：个性化是留存核心（PRD「问题必须越来越懂用户」），但可用性不能依赖 LLM。兜底链保证「镜子时刻永远可用」。

**prompt 约束**：输出仅一句问句，≤40 字，温和不评判，引用用户过去提到的具体事。生成结果做长度/格式校验，不合格按 LLM 失败处理落兜底。

### 3. 临时散装 LLM 出口（与 mentor 的收口约定）

**选择**：本变更 `QuestionGenerator` 直接调方舟 SDK（复用 bootstrap 的 OpenAI 兼容配置），**不**等 ai-mentor-core。

**收口约定（写入代码注释与本节）**：`QuestionGenerator` 是临时散装出口；ai-mentor-core 落地统一导师上下文层后，问题生成必须改为经导师人格发出（prompt 由 mentor 模块供给）。spec/design.md「所有 AI 出口统一导师人格」原则不变。

### 4. 回答只记录，无即时回应

提交回答仅持久化，不触发 AI 回应（PRD 原意；导师回应出口在人文导师团/周报等处）。前端提交后给轻量确认反馈（非 AI 文案）。

### 5. 数据访问层 —— 裸 pg + SQL 迁移，不引 ORM

**选择**：`backend/migrations/*.sql` 顺序迁移（启动时比对 `schema_migrations` 表自动执行）；数据访问用 repository 模式手写 SQL（复用 pg Pool，从 health 的 DbProbe 拆出共享 `DatabaseModule`）。

**理由**：两张表 + pgvector 未来都用原生 SQL 更直接；个人项目避免 ORM 学习/调试成本。**先例约束**：后续变更默认沿用此模式，表数量 >6 或关联复杂化时再评估 Prisma。

### 6. 日期口径 —— 固定 Asia/Shanghai

`entry_date` 按 UTC+8 的日历日计算（写死 +08:00，不读设备时区）。理由：目标用户全在国内；避免时区解析复杂度。局限性记录在案（海外用户日后处理）。

### 7. 当天回答可修改（upsert）

`PUT /today/answer` 幂等 upsert：首次 201，当天重复提交更新内容返回 200。一天一问题一回答（`UNIQUE(user_id, entry_date)`）。

## 数据模型变更

```sql
-- migrations/0001_init.sql
CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  device_id  VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mirror_entries (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  entry_date      DATE NOT NULL,               -- Asia/Shanghai 日历日
  question        TEXT NOT NULL,
  question_source VARCHAR(8) NOT NULL,          -- 'llm' | 'bank'
  answer          TEXT,                         -- NULL = 未回答
  answered_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entry_date)
);
CREATE INDEX idx_mirror_entries_user_date ON mirror_entries(user_id, entry_date DESC);

CREATE TABLE schema_migrations (
  filename   VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

回答长度上限 2000 字符（1 分钟文字量级的数倍余量）。

## 接口契约

### `GET /api/mirror/today`
**头**：`X-Device-Id`（缺 → 400 `missing_device_id`）
**响应 200**：
```json
{
  "date": "2026-08-18",
  "question": "如果明天手机坏了，你最先想做什么？",
  "questionSource": "llm",
  "answer": null | { "text": "...", "answeredAt": "..." },
  "yesterday": null | { "date": "2026-08-17", "text": "昨日回答（供昨日回顾区展示）" }
}
```

### `PUT /api/mirror/today/answer`
**请求**：`{ "text": "string(1..2000)" }`
**响应**：首次 201，当天更新 200；body 为更新后的 entry
**错误**：400 `empty_answer` / `answer_too_long`；400 `missing_device_id`

### `GET /api/mirror/entries?before=2026-08-18&limit=20`
**响应 200**：`{ "entries": [...已回答条目，日期倒序...], "nextBefore": "2026-08-01" | null }`（未回答条目不进入声音档案）

## 失败处理（Failure）

| 场景 | 行为 |
|------|------|
| LLM 超时/报错/输出不合格 | 落问题库兜底，warn 日志（不记用户回答内容），用户无感 |
| 迁移失败 | 启动失败并输出失败文件名——不半迁移运行 |
| db 写入冲突（同一天并发 PUT） | UNIQUE(user_id, entry_date) 兜底；服务层 ensure-entry → update-answer 两步，重复提交为幂等更新 |
| 设备 ID 缺失/超长 | 400，不建用户 |

## 可观测性（Observability）

- 问题生成：log 记录 source（llm/bank）、LLM 耗时、兜底原因类别；**不记录回答正文**
- 回答提交：log 记录 user_id + entry_date + 回答长度，不记内容
- 迁移：log 记录已执行文件名

## 回滚（Rollback）

- 代码回滚：`git revert`；表保留不删（新表，无旧代码依赖）
- 如需清表：`DROP TABLE mirror_entries, users, schema_migrations` + 删迁移文件记录即可全清（本地/开发期）
- 前端入口改回骨架页：single commit revert

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM 生成问题质量差（评判感/冒犯） | prompt 强约束 + 输出校验 + 问题库兜底；周报变更时再回顾质量 |
| 设备 ID 可被伪造刷用户 | MVP 无敏感操作可刷；付费/分享变更前评估设备指纹 |
| 散装 LLM 出口扩散 | 收口约定写入 design + 代码注释；ai-mentor-core 的 tasks 必含「收口 QuestionGenerator」 |
