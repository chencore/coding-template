import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:zhaojian/cang_api.dart";
import "package:zhaojian/cang_page.dart";

import "fake_cang_api.dart";

Widget wrap(Widget child) => MaterialApp(home: child);

/// ListView 懒加载：视口外的子节点未构建，先滚动到可见再操作
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(finder, 200, scrollable: find.byType(Scrollable).first);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

CangItem item(int id, String text, {String? label}) => CangItem(
      id: id,
      text: text,
      sourceType: "mirror_answer",
      sourceLabel: label,
      createdAt: "2026-08-21T02:00:00.000Z",
    );

void main() {
  group("藏页", () {
    testWidgets("空态：手动输入区 + 空文案（场景 15）", (tester) async {
      final api = FakeCangApi();
      await tester.pumpWidget(wrap(CangPage(api: api)));
      await tester.pumpAndSettle();

      expect(find.text("随手记一句"), findsOneWidget);
      expect(find.text("收进藏里"), findsOneWidget);
      expect(find.text("还没有收藏。打动你的句子，收进来。"), findsOneWidget);
    });

    testWidgets("主题分组渲染：主题名+条数+条目，未归组在尾（场景 13）", (tester) async {
      final api = FakeCangApi()
        ..map = CangMap(
          themes: [
            CangThemeGroup(
              name: "选择",
              count: 2,
              items: [item(1, "想辞职又怕选错。", label: "镜子 · 8月21日"), item(2, "第二句。")],
            ),
            CangThemeGroup(name: "怕输", count: 1, items: [item(3, "第三句。")]),
          ],
          ungrouped: [item(4, "还没归组的一句。")],
        );
      await tester.pumpWidget(wrap(CangPage(api: api)));
      await tester.pumpAndSettle();

      expect(find.text("选择"), findsOneWidget);
      expect(find.text("2 条"), findsOneWidget);
      expect(find.text("「想辞职又怕选错。」"), findsOneWidget);
      expect(find.textContaining("镜子 · 8月21日"), findsOneWidget);
      // 未归组在列表末尾：滚动可见（条目比组头更靠下，对条目滚）
      await tester.scrollUntilVisible(
        find.text("「还没归组的一句。」"), 200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text("未归组"), findsOneWidget);
      expect(find.text("「还没归组的一句。」"), findsOneWidget);
    });

    testWidgets("手动收藏：成功后 SnackBar + 列表刷新（场景 14）", (tester) async {
      final api = FakeCangApi();
      api.onCollect = () {
        api.map = CangMap(
          themes: [
            CangThemeGroup(name: "选择", count: 1, items: [item(9, "刚想通的一句。")]),
          ],
          ungrouped: const [],
        );
      };
      await tester.pumpWidget(wrap(CangPage(api: api)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "刚想通的一句。");
      await tester.tap(find.text("收进藏里"));
      await tester.pumpAndSettle();

      expect(api.collected.single.sourceType, "manual");
      expect(api.collected.single.text, "刚想通的一句。");
      expect(find.text("已收进藏里。"), findsOneWidget);
      expect(find.text("「刚想通的一句。」"), findsOneWidget);
      expect(find.text("还没有收藏。打动你的句子，收进来。"), findsNothing);
    });

    testWidgets("长按删除：确认对话框 → 删掉 → 列表刷新（场景 14）", (tester) async {
      final api = FakeCangApi()
        ..map = CangMap(
          themes: [
            CangThemeGroup(name: "选择", count: 1, items: [item(1, "要删的一句。")]),
          ],
          ungrouped: const [],
        );
      await tester.pumpWidget(wrap(CangPage(api: api)));
      await tester.pumpAndSettle();

      await tester.longPress(find.text("「要删的一句。」"));
      await tester.pumpAndSettle();
      expect(find.text("删掉这条收藏？"), findsOneWidget);

      api.map = const CangMap(themes: [], ungrouped: []); // 删除后主题为 0 条消失
      await tester.tap(find.text("删掉"));
      await tester.pumpAndSettle();

      expect(api.deleted, [1]);
      expect(find.text("「要删的一句。」"), findsNothing);
      expect(find.text("选择"), findsNothing);
    });
  });
}
