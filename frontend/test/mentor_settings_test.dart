import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:zhaojian/mentor_api.dart";
import "package:zhaojian/mentor_settings_page.dart";
import "package:zhaojian/mirror_api.dart";

/// 手搓假 client（不引 mock 框架）：字段式返回/抛错
class FakeMentorApi extends MentorApiClient {
  FakeMentorApi() : super(baseUrl: "http://fake", deviceId: "dev-test");

  Object profileResult = const MentorProfile(name: "默", style: "gentle");
  Object? updateResult;
  ({String? name, String? style})? lastUpdate;

  @override
  Future<MentorProfile> fetchProfile() async {
    final r = profileResult;
    if (r is Exception) throw r;
    return r as MentorProfile;
  }

  @override
  Future<MentorProfile> updateProfile({String? name, String? style}) async {
    lastUpdate = (name: name, style: style);
    final r = updateResult;
    if (r is Exception) throw r;
    return MentorProfile(name: name ?? "默", style: style ?? "gentle");
  }
}

Widget wrap(Widget child) => MaterialApp(home: child);

void main() {
  group("导师设置页", () {
    testWidgets("渲染：名字输入框带当前值，三种风格可选", (tester) async {
      final api = FakeMentorApi();
      await tester.pumpWidget(wrap(MentorSettingsPage(api: api)));
      await tester.pumpAndSettle();

      expect(find.text("默"), findsOneWidget); // 输入框当前值
      expect(find.text("温和引导型"), findsOneWidget);
      expect(find.text("苏格拉底追问型"), findsOneWidget);
      expect(find.text("同伴同行型"), findsOneWidget);
      expect(find.text("保存"), findsOneWidget);
    });

    testWidgets("保存成功：携带新名字与新风格，随后退出页面", (tester) async {
      final api = FakeMentorApi();
      await tester.pumpWidget(wrap(MentorSettingsPage(api: api)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "远山");
      await tester.tap(find.text("苏格拉底追问型"));
      await tester.tap(find.text("保存"));
      await tester.pumpAndSettle();

      expect(api.lastUpdate, (name: "远山", style: "socratic"));
      expect(find.byType(MentorSettingsPage), findsNothing); // 已 pop
    });

    testWidgets("保存失败（不可达）：提示重试且不丢已填内容", (tester) async {
      final api = FakeMentorApi()..updateResult = const MirrorApiUnreachable();
      await tester.pumpWidget(wrap(MentorSettingsPage(api: api)));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), "远山");
      await tester.tap(find.text("保存"));
      await tester.pumpAndSettle();

      expect(find.textContaining("没连上"), findsOneWidget);
      expect(find.text("远山"), findsOneWidget); // 内容还在
      expect(find.byType(MentorSettingsPage), findsOneWidget); // 未退出

      // 恢复后重试成功
      api.updateResult = null;
      await tester.tap(find.text("保存"));
      await tester.pumpAndSettle();
      expect(find.byType(MentorSettingsPage), findsNothing);
    });

    testWidgets("名字非法（400 invalid_name）：提示字数约束", (tester) async {
      final api = FakeMentorApi()
        ..updateResult = const MirrorApiException("invalid_name", 400);
      await tester.pumpWidget(wrap(MentorSettingsPage(api: api)));
      await tester.pumpAndSettle();

      await tester.tap(find.text("保存"));
      await tester.pumpAndSettle();
      expect(find.textContaining("1～12 字"), findsOneWidget);
    });
  });
}
