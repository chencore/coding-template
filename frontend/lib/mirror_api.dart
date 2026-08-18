import "dart:async";
import "dart:convert";

import "package:http/http.dart" as http;

/// 与后端 GET /api/mirror/today 契约对应（design.md §接口契约）
class MirrorToday {
  const MirrorToday({
    required this.date,
    required this.question,
    required this.questionSource,
    this.answerText,
    this.answeredAt,
    this.yesterdayDate,
    this.yesterdayText,
  });

  final String date;
  final String question;
  final String questionSource; // 'llm' | 'bank'
  final String? answerText;
  final String? answeredAt;
  final String? yesterdayDate;
  final String? yesterdayText;

  bool get answered => answerText != null;

  factory MirrorToday.fromJson(Map<String, dynamic> json) {
    final answer = json["answer"];
    final yesterday = json["yesterday"];
    return MirrorToday(
      date: json["date"] as String,
      question: json["question"] as String,
      questionSource: json["questionSource"] as String,
      answerText: answer is Map<String, dynamic> ? answer["text"] as String : null,
      answeredAt: answer is Map<String, dynamic> ? answer["answeredAt"] as String : null,
      yesterdayDate:
          yesterday is Map<String, dynamic> ? yesterday["date"] as String : null,
      yesterdayText:
          yesterday is Map<String, dynamic> ? yesterday["text"] as String : null,
    );
  }
}

class MirrorEntryItem {
  const MirrorEntryItem({
    required this.date,
    required this.question,
    required this.answer,
    required this.answeredAt,
  });

  final String date;
  final String question;
  final String answer;
  final String answeredAt;

  factory MirrorEntryItem.fromJson(Map<String, dynamic> json) => MirrorEntryItem(
        date: json["date"] as String,
        question: json["question"] as String,
        answer: json["answer"] as String,
        answeredAt: json["answeredAt"] as String,
      );
}

class MirrorEntriesPage {
  const MirrorEntriesPage({required this.entries, required this.nextBefore});

  final List<MirrorEntryItem> entries;
  final String? nextBefore;
}

/// 业务校验失败（400 with message=error_code），页面可据此提示
class MirrorApiException implements Exception {
  const MirrorApiException(this.code, this.statusCode);

  final String code;
  final int statusCode;

  @override
  String toString() => "MirrorApiException($code, $statusCode)";
}

/// 网络/超时/5xx 等不可归类错误
class MirrorApiUnreachable implements Exception {
  const MirrorApiUnreachable();

  @override
  String toString() => "MirrorApiUnreachable";
}

class MirrorApiClient {
  MirrorApiClient({
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

  Future<MirrorToday> fetchToday() async {
    final json = await _request(
      () => _client.get(Uri.parse("$baseUrl/api/mirror/today"), headers: _headers),
    );
    return MirrorToday.fromJson(json);
  }

  Future<MirrorToday> submitAnswer(String text) async {
    final json = await _request(
      () => _client.put(
        Uri.parse("$baseUrl/api/mirror/today/answer"),
        headers: _headers,
        body: jsonEncode({"text": text}),
      ),
    );
    return MirrorToday.fromJson(json);
  }

  Future<MirrorEntriesPage> fetchEntries({String? before, int limit = 20}) async {
    final query = {
      "limit": "$limit",
      "before": ?before,
    };
    final json = await _request(
      () => _client.get(
        Uri.parse("$baseUrl/api/mirror/entries").replace(queryParameters: query),
        headers: _headers,
      ),
    );
    final entries = (json["entries"] as List<dynamic>)
        .map((e) => MirrorEntryItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return MirrorEntriesPage(
      entries: entries,
      nextBefore: json["nextBefore"] as String?,
    );
  }

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
