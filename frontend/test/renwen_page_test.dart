import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:zhaojian/mirror_api.dart";
import "package:zhaojian/renwen_api.dart";
import "package:zhaojian/renwen_page.dart";

/// 手搓假 client（不引 mock 框架）：队列式返回/抛错
class FakeRenwenApi extends RenwenApiClient {
  FakeRenwenApi() : super(baseUrl: "http://fake", deviceId: "dev-test");

  Object? figuresResult;
  Object? summonResult;
  Object? sessionsResult;
  String? lastFigureId;
  String? lastConfusion;

  @override
  Future<List<RenwenFigure>> fetchFigures() async {
    final r = figuresResult;
    if (r is Exception) throw r;
    return r as List<RenwenFigure>;
  }

  @override
  Future<RenwenSummon> summon({String? figureId, String? confusion}) async {
    lastFigureId = figureId;
    lastConfusion = confusion;
    final r = summonResult;
    if (r is Exception) throw r;
    return r as RenwenSummon;
  }

  @override
  Future<List<RenwenSession>> fetchSessions() async {
    final r = sessionsResult;
    if (r is Exception) throw r;
    return r as List<RenwenSession>;
  }
}

const fourFigures = [
  RenwenFigure(id: "socrates", name: "苏格拉底", epithet: "雅典的提问者", styleHint: "用问题陪你剥开答案"),
  RenwenFigure(id: "aurelius", name: "马可·奥勒留", epithet: "写给自己的皇帝", styleHint: "把不可控的交还给世界"),
  RenwenFigure(id: "wangyangming", name: "王阳明", epithet: "心学的点灯人", styleHint: "直指本心的一句点拨"),
  RenwenFigure(id: "zengguofan", name: "曾国藩", epithet: "笨拙的日课人", styleHint: "只谈今天能做的一件小事"),
];

const wymSummon = RenwenSummon(
  id: 1,
  figureName: "王阳明",
  response: "你未看此花时，花与你同寂。辞职这件事，难的从来不是选哪个，而是你敢不敢在事上磨练。",
  sourceTitle: "《传习录》",
  remainingToday: 2,
  createdAt: "2026-08-19T02:00:00.000Z",
);

const pastSession = RenwenSession(
  id: 1,
  figureName: "苏格拉底",
  confusion: null,
  response: "你说想辞职。可你真正想辞掉的，是这份工作，还是那个不敢选的自己？",
  sourceTitle: "《申辩篇》",
  createdAt: "2026-08-18T13:00:00.000Z",
);

FakeRenwenApi fakeOk() => FakeRenwenApi()
  ..figuresResult = fourFigures
  ..sessionsResult = const <RenwenSession>[]
  ..summonResult = wymSummon;

Widget wrap(Widget child) => MaterialApp(home: child);

/// ListView 懒加载：视口外的子节点未构建，先滚动到可见再操作
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(finder, 200, scrollable: find.byType(Scrollable).first);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  group("召唤页", () {
    testWidgets("渲染：人物选择卡（4 人 + 让导师代选默认）+ 输入 + 按钮", (tester) async {
      await tester.pumpWidget(wrap(RenwenPage(api: fakeOk(), mentorName: "默")));
      await tester.pumpAndSettle();

      expect(find.text("让导师代选"), findsOneWidget);
      expect(find.text("苏格拉底 · 雅典的提问者"), findsOneWidget);
      expect(find.text("王阳明 · 心学的点灯人"), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text("请他聊聊"),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text("请他聊聊"), findsOneWidget);
    });

    testWidgets("召唤成功：回应卡含引荐语 + 正文 + 出处 + 剩余次数（场景 12）", (tester) async {
      final api = fakeOk();
      await tester.pumpWidget(wrap(RenwenPage(api: api, mentorName: "默")));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "想辞职又怕选错。");
      await tapVisible(tester, find.text("王阳明 · 心学的点灯人"));
      await tapVisible(tester, find.text("请他聊聊"));

      expect(api.lastFigureId, "wangyangming");
      expect(api.lastConfusion, "想辞职又怕选错。");
      expect(find.text("默 请来了 王阳明"), findsOneWidget);
      expect(find.textContaining("你未看此花时"), findsOneWidget);
      expect(find.text("出处 · 《传习录》"), findsOneWidget);
      expect(find.text("今天还能再请 2 次"), findsOneWidget);
    });

    testWidgets("429 上限：提示「今天已请过三次了」，已填困惑不丢（场景 13）", (tester) async {
      final api = fakeOk()
        ..summonResult = const MirrorApiException("daily_limit_reached", 429);
      await tester.pumpWidget(wrap(RenwenPage(api: api, mentorName: "默")));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "还没问完的话");
      await tapVisible(tester, find.text("请他聊聊"));

      expect(find.text("今天已请过三次了，明天再来。"), findsOneWidget);
      // 已填困惑不丢
      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.controller!.text, "还没问完的话");
    });

    testWidgets("不可达 / 503：可重试提示，已填困惑不丢；恢复后召唤成功（场景 13）", (tester) async {
      final api = fakeOk()..summonResult = const MirrorApiUnreachable();
      await tester.pumpWidget(wrap(RenwenPage(api: api, mentorName: "默")));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "想辞职又怕选错。");
      await tapVisible(tester, find.text("请他聊聊"));

      expect(find.textContaining("暂时请不来"), findsOneWidget);
      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.controller!.text, "想辞职又怕选错。");

      api.summonResult = wymSummon;
      await tapVisible(tester, find.text("请他聊聊"));
      expect(find.text("默 请来了 王阳明"), findsOneWidget);
    });

    testWidgets("过往召唤列表：人物 + 出处 + 回应节选（场景 14）", (tester) async {
      final api = fakeOk()..sessionsResult = const [pastSession];
      await tester.pumpWidget(wrap(RenwenPage(api: api, mentorName: "默")));
      await tester.pumpAndSettle();

      // 「过往」区在视口下方，先滚到可见
      await tester.scrollUntilVisible(
        find.text("过往"),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text("过往"), findsOneWidget);
      expect(find.textContaining("苏格拉底 · 8月18日 · 《申辩篇》"), findsOneWidget);
      expect(find.textContaining("可你真正想辞掉的"), findsOneWidget);
    });

    testWidgets("首屏加载失败：错误态 + 重试恢复", (tester) async {
      final api = fakeOk()..figuresResult = const MirrorApiUnreachable();
      await tester.pumpWidget(wrap(RenwenPage(api: api, mentorName: "默")));
      await tester.pumpAndSettle();
      expect(find.text("没连上。稍后再试。"), findsOneWidget);

      api.figuresResult = fourFigures;
      await tester.tap(find.text("重试"));
      await tester.pumpAndSettle();
      expect(find.text("让导师代选"), findsOneWidget);
    });
  });
}
