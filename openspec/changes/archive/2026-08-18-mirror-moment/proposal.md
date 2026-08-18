# Proposal: Mirror Moment（镜子时刻）

## 是什么（What）

实现照见的日省核心——「镜子时刻」（R-v1.0-CK-1）：

- 用户每天收到一个「镜子问题」（LLM 基于历史回答个性化生成，内置问题库兜底）
- 用户用文字回答（1 分钟量级），回答保存并串成「声音档案」
- 用户可回看自己的声音档案（按日期倒序）
- 首次引入用户标识：匿名设备 ID（X-Device-Id 头，懒创建用户）

## 为什么（Why）

镜子时刻是 PRD 客户旅程中「持续使用」阶段的日活引擎，也是导师记忆的数据源头——后续日课定制、对账周报、思想地图全都消费这份数据。M1 其余任务（ai-mentor-core、cang 等）都依赖本变更的用户模型与回答数据。

## 范围（Scope）

### 包含
- `users` 表 + 设备 ID 懒创建（`X-Device-Id` 头解析）
- `mirror_entries` 表 + SQL 迁移机制（migrations 目录）
- `GET /api/mirror/today`：今日问题（无则生成：LLM 个性化 → 问题库兜底）
- `PUT /api/mirror/today/answer`：提交/修改当天回答
- `GET /api/mirror/entries`：声音档案分页
- Flutter 镜子时刻页（按原型 v2「数字文房」视觉）+ 声音档案列表页；App 入口从骨架验证页改为镜子时刻页
- 照见产品视觉 token 落入 `frontend/lib/theme.dart`，`frontend/design.md` 增补产品视觉节（源自原型 v2）

### 不包含（明确排除）
- 语音回答（V1 文字 only，见 spec/requirements.md 非目标）
- 「不想说」三选项（R-v1.0-CK-8，M2 `streak-and-optout`）
- 连续打卡天数（同上）
- 导师人格/风格（ai-mentor-core；本变更的 LLM 调用是**临时散装出口**，mentor 落地时收口）
- 导师问候主界面（first-run-aha）
- 账号绑定/登录（匿名设备 ID 即全部身份）

## 成功标准

- [ ] 新设备首次打开 App，能看到当日镜子问题并完成回答（对应 PRD MVP 验收：陌生用户 5 分钟内完成第一个回答）
- [ ] 有 7 天回答历史的用户，当日问题与其历史相关（LLM 生成）
- [ ] 停掉 LLM 后，今日问题仍可用（问题库兜底），用户无感
- [ ] 声音档案可按日期倒序翻页回看
- [ ] CI 绿灯，镜子时刻页有截图验证
