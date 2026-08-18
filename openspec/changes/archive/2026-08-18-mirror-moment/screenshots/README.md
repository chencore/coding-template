# 视觉核对记录（任务 6.2）

对照 `docs/原型-v2-平铺截图.png` 屏 02（镜子时刻）与本目录截图（Android 模拟器 Pixel 7 API 36，debug 构建）：

| 项 | 原型 v2 | 本实现 | 说明 |
|----|---------|--------|------|
| 底色/墨色/朱砂 | paper #FAF9F6 / ink / cinnabar | 一致（theme.dart token） | ✅ |
| 问句区 | 朱砂 10px 署名 + 衬线 21px「问句」+ 淡墨提示 | 布局/字级/间距一致 | ✅ |
| 衬线字体 | Songti SC / Noto Serif SC | Android 模拟器缺衬线 CJK 字体，回退无衬线 | ⚠️ 平台差异：iOS（首发目标）有 Songti SC；Android 后续可打包 Noto Serif |
| 页头 | 「← 退出」+「镜子时刻 · 第 24 天」 | 「档案」+「镜子时刻 · 8月18日」 | ⚠️ 有意偏离：主界面属 first-run-aha 范围（暂无「退出」去处）；连续天数属 M2 streak 范围，改用当日日期 |
| 提交后 | 导师回应卡 + 历史共鸣 | 自己回答 +「已记下。明天见。」 | ⚠️ 有意偏离：导师回应属 ai-mentor-core / 人文导师团范围（本变更决策 4：只记录无即时回应） |
| 输入 placeholder | 「说真话，或者按住说话」 | 「写下此刻的真话…」 | ⚠️ 有意偏离：V1 无语音（非目标），去掉按住说话暗示 |
| 条目样式 | 10px 元信息 + 衬线 15px「回答」+ hairline | 一致（镜子页昨日回顾/声音档案列表同式） | ✅ |
| DEBUG 角标 | 无 | 有 | debug 构建固有，release 无 |

截图清单：
- `01-mirror-unanswered.png` 未回答态（场景 12）
- `02-mirror-answered.png` 已回答态 + 昨日回顾区（场景 13/12）
- `03-entries-list.png` 声音档案列表（场景 15）
- `04-mirror-error.png` 后端不可达错误态（场景 14）
- `05-entries-empty.png` 空档案态 + 引导（场景 15）
