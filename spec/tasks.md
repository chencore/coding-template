# Tasks

> **维护规则**：
> - **任务内容**由人工维护，仅在人工明确要求时修改
> - **任务完成状态**由 AI 在对应 openspec 变更归档后自动勾选
>
> 每个任务对应 `openspec/changes/<task-name>/` 下的一个变更提案。

---

## 命名约定

- 任务名使用 **kebab-case**：`add-user-auth`、`implement-payment-flow`
- 粒度：**一个提案能做完的事情**（通常 1~3 天工作量）
- 尽量独立：减少任务间依赖，便于并行推进

---

## 版本 v1.0

> 2026-08-17 由 CK 首次 kickoff 写入，需求来源 `docs/照见-PRD-v1.md`（R-v1.0-CK-1 ~ 12）。

### M1 · 核心闭环（镜子 + 导师 + 藏）

- [x] **bootstrap-app-scaffold** — 初始化前端（跨端栈）+ 后端骨架、CI、环境变量、国内 LLM 接入验证
- [x] **mirror-moment** — 镜子时刻：每日一问、文字回答、声音档案存储（R-v1.0-CK-1）
- [ ] **ai-mentor-core** — 导师人格：命名/风格选择、统一 AI 出口、用户记忆（R-v1.0-CK-2）
- [ ] **renwen-mentors** — 人文导师团：历史人物视角回应 + 出处标注（R-v1.0-CK-3）
- [ ] **cang-knowledge-base** — 藏：一键收藏、思想地图主题聚类、回看（R-v1.0-CK-4）
- [ ] **first-run-aha** — 首次体验：3 个快问 → 60 秒「此刻的你」速写（R-v1.0-CK-5）

### M2 · 日课与周报

- [ ] **daily-lesson** — 今日日课：微行动定制 + 完成感受记录（R-v1.0-CK-6）
- [ ] **weekly-report** — 对账周报：双视角分析 + 不评判总结 + 历史共鸣（R-v1.0-CK-7）
- [ ] **streak-and-optout** — 照见天数打卡 +「不想说」三选项（R-v1.0-CK-8）

### M3 · 拦截与商业化

- [ ] **intercept-moment** — iOS 原生拦截模块：灰名单检测、「逃避/想看」引导回镜子（R-v1.0-CK-9）⚠️ 含 App Store 审核风险验证
- [ ] **subscription-pro** — 订阅付费：Pro 39/月、198/年，免费层/付费墙划分（R-v1.0-CK-10）
- [ ] **persona-hook** — 获客钩子：算法人格档案测试页 + 变化卡片分享（R-v1.0-CK-11）

### M4 · 上线准备

- [ ] **data-sovereignty** — 数据导出 + 注销删除（R-v1.0-CK-12）
- [ ] **setup-production-deployment** — 生产环境部署、监控、告警
- [ ] **app-store-launch** — 隐私政策、合规自查、App Store 上架

---

## 进度概览

- 总任务数：15
- 已完成：0
- 进行中：0

（建议每完成一个 Milestone 手动更新以上数字）
