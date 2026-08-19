import "dart:async";
import "dart:convert";

import "package:http/http.dart" as http;

import "mirror_api.dart" show MirrorApiException, MirrorApiUnreachable;

/// 导师人格配置：与 GET/PUT /api/mentor/profile 契约对应
class MentorProfile {
  const MentorProfile({required this.name, required this.style});

  final String name;

  /// 'gentle' | 'socratic' | 'companion'
  final String style;

  factory MentorProfile.fromJson(Map<String, dynamic> json) => MentorProfile(
        name: json["name"] as String,
        style: json["style"] as String,
      );
}

/// 风格展示文案（设置页选项）；key 与后端枚举一致
const mentorStyleOptions = <String, ({String label, String desc})>{
  "gentle": (label: "温和引导型", desc: "接纳优先，先接住情绪，再看事情本身。"),
  "socratic": (label: "苏格拉底追问型", desc: "简洁理性，用问题帮你找到自己的答案。"),
  "companion": (label: "同伴同行型", desc: "平辈口吻，像朋友一样并肩走。"),
};

class MentorApiClient {
  MentorApiClient({
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

  Future<MentorProfile> fetchProfile() async {
    final json = await _request(
      () => _client.get(Uri.parse("$baseUrl/api/mentor/profile"), headers: _headers),
    );
    return MentorProfile.fromJson(json);
  }

  Future<MentorProfile> updateProfile({String? name, String? style}) async {
    final json = await _request(
      () => _client.put(
        Uri.parse("$baseUrl/api/mentor/profile"),
        headers: _headers,
        body: jsonEncode({"name": ?name, "style": ?style}),
      ),
    );
    return MentorProfile.fromJson(json);
  }

  /// 与 MirrorApiClient 相同的错误归类：400→MirrorApiException，超时/网络/5xx→MirrorApiUnreachable
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
