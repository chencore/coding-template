import "package:zhaojian/cang_api.dart";

/// 手搓假 client（不引 mock 框架）：队列式返回/抛错 + 调用记录
class FakeCangApi extends CangApiClient {
  FakeCangApi() : super(baseUrl: "http://fake", deviceId: "dev-test");

  Object? collectResult = const CangCollectResult(
    id: 1,
    themes: ["选择"],
    createdAt: "2026-08-21T02:00:00.000Z",
  );
  CangMap map = const CangMap(themes: [], ungrouped: []);

  final List<({String text, String sourceType, String? sourceLabel})> collected =
      [];
  final List<int> deleted = [];

  /// 收藏后钩子：测试里用来换 map（模拟打标后的思想地图）
  void Function()? onCollect;

  @override
  Future<CangCollectResult> collect({
    required String text,
    required String sourceType,
    String? sourceLabel,
  }) async {
    collected.add((text: text, sourceType: sourceType, sourceLabel: sourceLabel));
    final r = collectResult;
    if (r is Exception) throw r;
    onCollect?.call();
    return r as CangCollectResult;
  }

  @override
  Future<CangMap> fetchMap() async => map;

  @override
  Future<void> deleteItem(int id) async {
    deleted.add(id);
  }
}
