import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:zhaojian/entries_page.dart";
import "package:zhaojian/mirror_api.dart";
import "package:zhaojian/mirror_page.dart";

/// 手搓假 client（不引 mock 框架）：队列式返回/抛错
class FakeApi extends MirrorApiClient {
  FakeApi() : super(baseUrl: "http://fake", deviceId: "dev-test");

  Object? todayResult;
  Object? submitResult;
  MirrorEntriesPage entriesPage =
      const MirrorEntriesPage(entries: [], nextBefore: null);

  @override
  Future<MirrorToday> fetchToday() async {
    final r = todayResult;
    if (r is Exception) throw r;
    return r as MirrorToday;
  }

  @override
  Future<MirrorToday> submitAnswer(String text) async {
    final r = submitResult;
    if (r is Exception) throw r;
    return r as MirrorToday;
  }

  @override
  Future<MirrorEntriesPage> fetchEntries({String? before, int limit = 20}) async =>
      entriesPage;
}

const unansweredToday = MirrorToday(
  date: "2026-08-18",
  question: "今天有什么小事比预期好？",
  questionSource: "bank",
  yesterdayDate: "2026-08-17",
  yesterdayText: "昨天写了橘猫",
);

const answeredToday = MirrorToday(
  date: "2026-08-18",
  question: "今天有什么小事比预期好？",
  questionSource: "bank",
  answerText: "橘猫蹭了我一下",
  answeredAt: "2026-08-18T02:00:00Z",
);

Widget wrap(Widget child) => MaterialApp(home: child);

void main() {
  group("镜子时刻页", () {
    testWidgets("未回答态：问句/导师署名/昨日回顾/输入与说完按钮", (tester) async {
      final api = FakeApi()..todayResult = unansweredToday;
      await tester.pumpWidget(wrap(MirrorPage(api: api, onOpenEntries: () {}, onOpenMentor: () async {}, onOpenRenwen: (_) {})));
      await tester.pumpAndSettle();

      expect(find.text("默 · 你的导师"), findsOneWidget);
      expect(find.text("「今天有什么小事比预期好？」"), findsOneWidget);
      expect(find.textContaining("昨天 · 8月17日"), findsOneWidget);
      expect(find.text("「昨天写了橘猫」"), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text("说完"), findsOneWidget);
    });

    testWidgets("提交后切换为已回答态（展示自己的回答，无 AI 文案）", (tester) async {
      final api = FakeApi()
        ..todayResult = unansweredToday
        ..submitResult = answeredToday;
      await tester.pumpWidget(wrap(MirrorPage(api: api, onOpenEntries: () {}, onOpenMentor: () async {}, onOpenRenwen: (_) {})));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "橘猫蹭了我一下");
      await tester.tap(find.text("说完"));
      await tester.pumpAndSettle();

      expect(find.text("「橘猫蹭了我一下」"), findsOneWidget);
      expect(find.text("已记下。明天见。"), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets("后端不可达：错误态 + 重试恢复", (tester) async {
      final api = FakeApi()..todayResult = const MirrorApiUnreachable();
      await tester.pumpWidget(wrap(MirrorPage(api: api, onOpenEntries: () {}, onOpenMentor: () async {}, onOpenRenwen: (_) {})));
      await tester.pumpAndSettle();
      expect(find.text("没连上。稍后再试。"), findsOneWidget);

      api.todayResult = unansweredToday;
      await tester.tap(find.text("重试"));
      await tester.pumpAndSettle();
      expect(find.text("「今天有什么小事比预期好？」"), findsOneWidget);
    });

    testWidgets("动态署名 + 导师回应卡（mentorName / mentorReply）", (tester) async {
      final api = FakeApi()
        ..todayResult = const MirrorToday(
          date: "2026-08-18",
          question: "今天有什么小事比预期好？",
          questionSource: "llm",
          answerText: "橘猫蹭了我一下",
          answeredAt: "2026-08-18T02:00:00Z",
          mentorName: "远山",
          mentorReply: "被橘猫选中了，这是好日子。",
        );
      await tester.pumpWidget(wrap(MirrorPage(api: api, onOpenEntries: () {}, onOpenMentor: () async {}, onOpenRenwen: (_) {})));
      await tester.pumpAndSettle();

      expect(find.text("远山 · 你的导师"), findsOneWidget);
      expect(find.text("远山 · 回应"), findsOneWidget);
      expect(find.text("被橘猫选中了，这是好日子。"), findsOneWidget);
      expect(find.text("已记下。明天见。"), findsNothing);
    });

    testWidgets("人文导师团常驻入口可见，点击带出导师名字（场景 11）", (tester) async {
      final api = FakeApi()..todayResult = unansweredToday;
      String? passedName;
      await tester.pumpWidget(wrap(MirrorPage(
        api: api,
        onOpenEntries: () {},
        onOpenMentor: () async {},
        onOpenRenwen: (name) => passedName = name,
      )));
      await tester.pumpAndSettle();

      expect(find.text("迷茫时，请前人聊聊 →"), findsOneWidget);
      await tester.tap(find.text("迷茫时，请前人聊聊 →"));
      expect(passedName, "默");
    });
  });

  group("声音档案页", () {
    testWidgets("空档案：说明 + 引导动作", (tester) async {
      final api = FakeApi();
      await tester.pumpWidget(wrap(EntriesPage(api: api)));
      await tester.pumpAndSettle();
      expect(find.textContaining("还没有留下过声音"), findsOneWidget);
      expect(find.text("去镜子时刻"), findsOneWidget);
    });

    testWidgets("有档案：日期倒序展示问题+回答", (tester) async {
      final api = FakeApi()
        ..entriesPage = const MirrorEntriesPage(
          entries: [
            MirrorEntryItem(
              date: "2026-08-18",
              question: "今天的问题？",
              answer: "今天的回答",
              answeredAt: "2026-08-18T02:00:00Z",
            ),
            MirrorEntryItem(
              date: "2026-08-17",
              question: "昨天的问题？",
              answer: "昨天的回答",
              answeredAt: "2026-08-17T13:00:00Z",
            ),
          ],
          nextBefore: null,
        );
      await tester.pumpWidget(wrap(EntriesPage(api: api)));
      await tester.pumpAndSettle();
      expect(find.textContaining("今天的问题？"), findsOneWidget);
      expect(find.text("「今天的回答」"), findsOneWidget);
      expect(find.text("「昨天的回答」"), findsOneWidget);
    });
  });
}
