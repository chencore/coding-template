# cang-knowledge-base 截图（Android 模拟器，2026-08-21）

- `01-mirror-header.png` — 场景 12：镜子页头部常驻入口「档案 / 导师 / 藏」
- `02-mirror-entries.png` — 场景 12：已回答态两处「收进藏里」入口（昨日/今日回答块下方、导师回应卡下方，fsHint 淡墨右对齐）
- `03-collect-snackbar.png` — 场景 12：点击入口后 SnackBar「已收进藏里。」（收藏走真 LLM 打标，服务端归入主题「日常的光」）
- `05-cang-page.png` — 场景 13：藏页 = 手动输入区 + 主题分组（主题名 + N 条 + 衬线条目 + 来源 · 日期元信息）
- `06-label-fixed.png` — 来源标签修复后重建验证：新收藏 meta 为「镜子 · 8月21日」不再重复日期（旧行保留旧 label，属预期）
- `07-manual-collect.png` — 场景 14：藏页手动收藏「A sudden thought」，主题计数 2 → 3
- `08-delete-dialog.png` — 场景 14：长按条目弹确认「删掉这条收藏？」（留着 / 删掉）
- `09-after-delete.png` — 场景 14：删除后条目消失、主题计数 3 → 2，列表即时刷新
- `12-renwen-entry.png` — 场景 12：召唤页回应卡下方「收进藏里」与「今天还能再请 1 次」同行
- `13-renwen-collected.png` — 场景 12：召唤回应收藏成功 SnackBar；服务端落库 sourceType=renwen_reply、label=「王阳明 · 《传习录·徐爱录》」，主题复用「日常的光」

场景 15（空态）由 widget 测试覆盖（`frontend/test/cang_page_test.dart` 空态用例）+ curl 场景 9（空 map 结构）实证；
场景 1~11 的后端行为另有 curl 实证（见 tasks.md 7.1/7.2）。
