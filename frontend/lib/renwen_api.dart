import "dart:async";
import "dart:convert";

import "package:http/http.dart" as http;

import "mirror_api.dart" show MirrorApiException, MirrorApiUnreachable;

/// 人文导师团人物（GET /api/renwen/figures）——选择器数据，不含出处原文
class RenwenFigure {
  const RenwenFigure({
    required this.id,
    required this.name,
    required this.epithet,
    required this.styleHint,
  });

  final String id;
  final String name;

  /// 称号（如「心学的点灯人」）
  final String epithet;

  /// 风格提示（选择卡一句话说明）
  final String styleHint;

  factory RenwenFigure.fromJson(Map<String, dynamic> json) => RenwenFigure(
        id: json["id"] as String,
        name: json["name"] as String,
        epithet: json["epithet"] as String,
        styleHint: json["styleHint"] as String,
      );
}

/// 一次召唤的结果（POST /api/renwen/summon 201）
class RenwenSummon {
  const RenwenSummon({
    required this.id,
    required this.figureName,
    required this.response,
    required this.sourceTitle,
    required this.remainingToday,
    required this.createdAt,
  });

  final int id;
  final String figureName;
  final String response;

  /// 出处篇名（库内预置值，可信）
  final String sourceTitle;
  final int remainingToday;
  final String createdAt;

  factory RenwenSummon.fromJson(Map<String, dynamic> json) => RenwenSummon(
        id: json["id"] as int,
        figureName: (json["figure"] as Map<String, dynamic>)["name"] as String,
        response: json["response"] as String,
        sourceTitle: (json["source"] as Map<String, dynamic>)["title"] as String,
        remainingToday: json["remainingToday"] as int,
        createdAt: json["createdAt"] as String,
      );
}

/// 过往召唤（GET /api/renwen/sessions）
class RenwenSession {
  const RenwenSession({
    required this.id,
    required this.figureName,
    required this.confusion,
    required this.response,
    required this.sourceTitle,
    required this.createdAt,
  });

  final int id;
  final String figureName;
  final String? confusion;
  final String response;
  final String sourceTitle;
  final String createdAt;

  factory RenwenSession.fromJson(Map<String, dynamic> json) => RenwenSession(
        id: json["id"] as int,
        figureName: (json["figure"] as Map<String, dynamic>)["name"] as String,
        confusion: json["confusion"] as String?,
        response: json["response"] as String,
        sourceTitle: (json["source"] as Map<String, dynamic>)["title"] as String,
        createdAt: json["createdAt"] as String,
      );
}

class RenwenApiClient {
  RenwenApiClient({
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

  Future<List<RenwenFigure>> fetchFigures() async {
    final json = await _request(
      () => _client.get(Uri.parse("$baseUrl/api/renwen/figures"), headers: _headers),
    );
    return (json["figures"] as List<dynamic>)
        .map((f) => RenwenFigure.fromJson(f as Map<String, dynamic>))
        .toList();
  }

  /// 召唤：figureId 为 null 表示「让导师代选」；confusion 可空
  Future<RenwenSummon> summon({String? figureId, String? confusion}) async {
    final json = await _request(
      () => _client.post(
        Uri.parse("$baseUrl/api/renwen/summon"),
        headers: _headers,
        body: jsonEncode({"figureId": ?figureId, "confusion": ?confusion}),
      ),
    );
    return RenwenSummon.fromJson(json);
  }

  Future<List<RenwenSession>> fetchSessions() async {
    final json = await _request(
      () => _client.get(Uri.parse("$baseUrl/api/renwen/sessions"), headers: _headers),
    );
    return (json["sessions"] as List<dynamic>)
        .map((s) => RenwenSession.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  /// 与 MirrorApiClient 相同的错误归类：4xx→MirrorApiException（429 带出 daily_limit_reached），
  /// 超时/网络/5xx（含 503 renwen_unavailable）→MirrorApiUnreachable
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
    final body = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) {
      final code = body is Map<String, dynamic>
          ? (body["message"] as String? ?? "unknown_error")
          : "unknown_error";
      throw MirrorApiException(code, res.statusCode);
    }
    return body as Map<String, dynamic>;
  }
}
