# ai-mentor-core — AI 人生导师核心

## 是什么

落地 R-v1.0-CK-2：每个用户一位专属导师——有名字（默认「默」，可自定义）、有性格（温和引导型 / 苏格拉底追问型 / 同伴同行型，可切换）、有与用户共同的记忆；**所有 AI 出口统一为导师人格，不做散装 AI**。

本变更做四件事：

1. **导师人格配置**：`users` 表加 `mentor_name` / `mentor_style`；`GET/PUT /api/mentor/profile` 读改；前端「导师」设置页（改名 + 切换风格，实时生效）
2. **统一 AI 出口**：新建 `mentor` 模块，`MentorService` 作为唯一 LLM 网关——所有场景（镜子提问、导师回应，及未来的日课/周报/拦截语）经它注入人格 + 记忆后发出
3. **记忆 V1**：定义 `MemoryProvider` 接口，当前实现 = 注入近 14 天原始回答历史；蒸馏（画像事实表）留到 weekly-report 变更
4. **收口 + 导师回应**：镜子问题生成改走 `MentorService`（收口 mirror-moment 留下的散装出口）；提交回答后导师给**一句短回应**（≤60 字、不追问），存入 `mirror_entries.mentor_reply`

## 为什么

- PRD 核心立场：导师是「关系」不是功能，贯穿所有模块——不先立统一出口，后面每个模块都会再长一个散装 LLM 调用
- mirror-moment 已在 `question-generator.ts` 注释里留下「散装出口、待收口」的技术债，本变更偿还
- 「回应」是关系感的最小闭环：用户说完话有人接话，导师才「活」起来（原型 v2 屏 02 已有导师回应卡位置）

## 不做（Out of Scope）

- 首次使用的风格选择流程 → `first-run-aha` 变更消费本变更的 profile 接口
- 人文导师团视角（多导师）→ `renwen-mentors`；当前存储按 1:1 设计，届时再扩
- 记忆蒸馏 / 情绪变化追踪 / 收藏与日课数据入记忆 → 随对应模块变更补齐
- 导师回应的流式输出、语音

## 影响面

- **数据模型**：`users` 加 2 列、`mirror_entries` 加 1 列（迁移 0002）
- **跨模块**：mirror 模块的提问与回答提交改经 mentor 模块；新增 mentor 模块
- **接口**：`GET /api/mirror/today` 与 `PUT /api/mirror/today/answer` 响应增加 `mentor` / `mentorReply` 字段（向后兼容式新增）；新增 `GET/PUT /api/mentor/profile`
- **前端**：镜子页展示导师名与回应卡；新增导师设置页（**含 UI Check**）
