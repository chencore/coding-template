import "dart:convert";

import "package:flutter_test/flutter_test.dart";
import "package:http/http.dart" as http;
import "package:http/testing.dart";
import "package:zhaojian/mirror_api.dart";
import "package:zhaojian/theme.dart";

void main() {
  group("theme tokens（数字文房）", () {
    test("关键 token 与原型 v2 一致", () {
      expect(Zj.paper.toARGB32(), 0xFFFAF9F6);
      expect(Zj.ink.toARGB32(), 0xFF2A2A28);
      expect(Zj.inkSoft.toARGB32(), 0xFF5C574E);
      expect(Zj.inkDim.toARGB32(), 0xFF8A857C);
      expect(Zj.cinnabar.toARGB32(), 0xFFB03A2E);
      expect(Zj.hairline.toARGB32(), 0xFFE6E1D6);
      expect(Zj.border.toARGB32(), 0xFFCFC9BC);
    });
  });

  group("MirrorApiClient", () {
    test("fetchToday：解析契约 + 携带设备头", () async {
      http.Request? seen;
      final mock = MockClient((req) async {
        seen = req;
        return http.Response.bytes(
          utf8.encode(jsonEncode({
            "date": "2026-08-18",
            "question": "今天怎么样？",
            "questionSource": "llm",
            "answer": {"text": "还行", "answeredAt": "2026-08-18T02:00:00Z"},
            "yesterday": {"date": "2026-08-17", "text": "昨天的话"},
          })),
          200,
        );
      });
      final api = MirrorApiClient(
        baseUrl: "http://test",
        deviceId: "dev-t",
        client: mock,
      );
      final today = await api.fetchToday();
      expect(seen?.headers["X-Device-Id"], "dev-t");
      expect(today.answered, isTrue);
      expect(today.answerText, "还行");
      expect(today.yesterdayText, "昨天的话");
    });

    test("fetchToday：answer/yesterday 为 null 时解析为未回答", () async {
      final mock = MockClient((req) async => http.Response.bytes(
            utf8.encode(jsonEncode({
              "date": "2026-08-18",
              "question": "q？",
              "questionSource": "bank",
              "answer": null,
              "yesterday": null,
            })),
            200,
          ));
      final api = MirrorApiClient(baseUrl: "http://t", deviceId: "d", client: mock);
      final today = await api.fetchToday();
      expect(today.answered, isFalse);
      expect(today.yesterdayText, isNull);
    });

    test("400 业务错误映为 MirrorApiException（含 error_code）", () async {
      final mock = MockClient((req) async => http.Response(
            jsonEncode({"message": "answer_too_long"}),
            400,
          ));
      final api = MirrorApiClient(baseUrl: "http://t", deviceId: "d", client: mock);
      expect(
        () => api.submitAnswer("x"),
        throwsA(
          isA<MirrorApiException>()
              .having((e) => e.code, "code", "answer_too_long")
              .having((e) => e.statusCode, "statusCode", 400),
        ),
      );
    });

    test("5xx / 网络错误映为 MirrorApiUnreachable", () async {
      final api500 = MirrorApiClient(
        baseUrl: "http://t",
        deviceId: "d",
        client: MockClient((req) async => http.Response("oops", 500)),
      );
      expect(() => api500.fetchToday(), throwsA(isA<MirrorApiUnreachable>()));

      final apiDown = MirrorApiClient(
        baseUrl: "http://t",
        deviceId: "d",
        client: MockClient((req) async => throw http.ClientException("down")),
      );
      expect(() => apiDown.fetchToday(), throwsA(isA<MirrorApiUnreachable>()));
    });

    test("fetchEntries：解析分页游标并传递 before/limit", () async {
      Uri? seenUri;
      final mock = MockClient((req) async {
        seenUri = req.url;
        return http.Response.bytes(
          utf8.encode(jsonEncode({
            "entries": [
              {
                "date": "2026-08-17",
                "question": "q？",
                "answer": "a",
                "answeredAt": "2026-08-17T13:00:00Z",
              },
            ],
            "nextBefore": "2026-08-17",
          })),
          200,
        );
      });
      final api = MirrorApiClient(baseUrl: "http://t", deviceId: "d", client: mock);
      final page = await api.fetchEntries(before: "2026-08-18", limit: 2);
      expect(seenUri?.queryParameters["before"], "2026-08-18");
      expect(seenUri?.queryParameters["limit"], "2");
      expect(page.entries, hasLength(1));
      expect(page.nextBefore, "2026-08-17");
    });
  });
}
