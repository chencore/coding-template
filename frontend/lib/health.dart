import "dart:convert";

import "package:http/http.dart" as http;

/// 后端健康状态三态：连通 / 降级（db 断开）/ 不可达
enum HealthStatus { ok, degraded, unreachable }

HealthStatus parseHealthResponse(int statusCode, String body) {
  try {
    final json = jsonDecode(body) as Map<String, dynamic>;
    if (statusCode == 200 && json["status"] == "ok") return HealthStatus.ok;
    if (json["status"] == "degraded" || json["db"] == "down") {
      return HealthStatus.degraded;
    }
    return HealthStatus.unreachable;
  } catch (_) {
    return HealthStatus.unreachable;
  }
}

/// 健康检查客户端：5s 超时，网络错误归一为 unreachable
Future<HealthStatus> fetchHealth(String apiBaseUrl, {http.Client? client}) async {
  final c = client ?? http.Client();
  try {
    final res = await c
        .get(Uri.parse("$apiBaseUrl/api/health"))
        .timeout(const Duration(seconds: 5));
    return parseHealthResponse(res.statusCode, res.body);
  } catch (_) {
    return HealthStatus.unreachable;
  } finally {
    if (client == null) c.close();
  }
}
