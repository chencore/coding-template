import "dart:async";
import "dart:convert";

import "package:http/http.dart" as http;

import "mirror_api.dart" show MirrorApiException, MirrorApiUnreachable;

/// 藏·一条收藏（cang_items 行）
class CangItem {
  const CangItem({
    required this.id,
    required this.text,
    required this.sourceType,
    required this.sourceLabel,
    required this.createdAt,
  });

  final int id;
  final String text;

  /// 'mirror_answer' | 'mentor_reply' | 'renwen_reply' | 'manual'
  final String sourceType;

  /// 展示用来源标注（客户端写入），可空
  final String? sourceLabel;
  final String createdAt;

  factory CangItem.fromJson(Map<String, dynamic> json) => CangItem(
        id: json["id"] as int,
        text: json["text"] as String,
        sourceType: json["sourceType"] as String,
        sourceLabel: json["sourceLabel"] as String?,
        createdAt: json["createdAt"] as String,
      );
}

/// 思想地图·一个主题分组
class CangThemeGroup {
  const CangThemeGroup({
    required this.name,
    required this.count,
    required this.items,
  });

  final String name;
  final int count;
  final List<CangItem> items;

  factory CangThemeGroup.fromJson(Map<String, dynamic> json) => CangThemeGroup(
        name: json["name"] as String,
        count: json["count"] as int,
        items: (json["items"] as List<dynamic>)
            .map((i) => CangItem.fromJson(i as Map<String, dynamic>))
            .toList(),
      );
}

/// GET /api/cang/map 的完整结构
class CangMap {
  const CangMap({required this.themes, required this.ungrouped});

  final List<CangThemeGroup> themes;
  final List<CangItem> ungrouped;

  factory CangMap.fromJson(Map<String, dynamic> json) => CangMap(
        themes: (json["themes"] as List<dynamic>)
            .map((t) => CangThemeGroup.fromJson(t as Map<String, dynamic>))
            .toList(),
        ungrouped: (json["ungrouped"] as List<dynamic>)
            .map((i) => CangItem.fromJson(i as Map<String, dynamic>))
            .toList(),
      );
}

/// 收藏结果（POST /api/cang/items 201）——themes 为空 = 打标失败留未归组
class CangCollectResult {
  const CangCollectResult({
    required this.id,
    required this.themes,
    required this.createdAt,
  });

  final int id;
  final List<String> themes;
  final String createdAt;
}

class CangApiClient {
  CangApiClient({
    required this.baseUrl,
    required this.deviceId,
    http.Client? client,
    this.timeout = const Duration(seconds: 8),
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final String deviceId;
  final Duration timeout;
  final http.Client _client;

  Map<String, String> get _headers => {
        "Content-Type": "application/json",
        "X-Device-Id": deviceId,
      };

  /// 收藏：sourceLabel 可空（manual 一般无）
  Future<CangCollectResult> collect({
    required String text,
    required String sourceType,
    String? sourceLabel,
  }) async {
    final json = await _request(
      () => _client.post(
        Uri.parse("$baseUrl/api/cang/items"),
        headers: _headers,
        body: jsonEncode({
          "text": text,
          "sourceType": sourceType,
          "sourceLabel": ?sourceLabel,
        }),
      ),
    );
    return CangCollectResult(
      id: json["id"] as int,
      themes: (json["themes"] as List<dynamic>).cast<String>(),
      createdAt: json["createdAt"] as String,
    );
  }

  Future<CangMap> fetchMap() async {
    final json = await _request(
      () => _client.get(Uri.parse("$baseUrl/api/cang/map"), headers: _headers),
    );
    return CangMap.fromJson(json);
  }

  Future<void> deleteItem(int id) async {
    await _requestOrEmpty(
      () => _client.delete(
        Uri.parse("$baseUrl/api/cang/items/$id"),
        headers: _headers,
      ),
    );
  }

  /// 与 MirrorApiClient 相同的错误归类：4xx→MirrorApiException，超时/网络/5xx→MirrorApiUnreachable
  Future<Map<String, dynamic>> _request(
    Future<http.Response> Function() send,
  ) async {
    final http.Response res;
    try {
      res = await send().timeout(timeout);
    } on TimeoutException {
      throw const MirrorApiUnreachable();
    } on http.ClientException {
      throw const MirrorApiUnreachable();
    }
    if (res.statusCode >= 500) throw const MirrorApiUnreachable();
    if (res.statusCode >= 400) {
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      final code = body is Map<String, dynamic>
          ? (body["message"] as String? ?? "unknown_error")
          : "unknown_error";
      throw MirrorApiException(code, res.statusCode);
    }
    if (res.statusCode == 204 || res.bodyBytes.isEmpty) return {};
    return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
  }

  /// 204 无体响应专用
  Future<void> _requestOrEmpty(Future<http.Response> Function() send) async {
    await _request(send);
  }
}
