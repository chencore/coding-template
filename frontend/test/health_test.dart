import "package:flutter_test/flutter_test.dart";
import "package:zhaojian/health.dart";

void main() {
  group("parseHealthResponse", () {
    test("200 + status ok → ok", () {
      expect(
        parseHealthResponse(200, '{"status":"ok","db":"up"}'),
        HealthStatus.ok,
      );
    });

    test("503 + degraded → degraded", () {
      expect(
        parseHealthResponse(503, '{"status":"degraded","db":"down"}'),
        HealthStatus.degraded,
      );
    });

    test("db down 但无 status 字段 → degraded", () {
      expect(
        parseHealthResponse(503, '{"db":"down"}'),
        HealthStatus.degraded,
      );
    });

    test("非 JSON 响应 → unreachable", () {
      expect(parseHealthResponse(502, "Bad Gateway"), HealthStatus.unreachable);
    });

    test("200 但 body 异常 → unreachable", () {
      expect(parseHealthResponse(200, '{"unexpected":true}'), HealthStatus.unreachable);
    });
  });
}
