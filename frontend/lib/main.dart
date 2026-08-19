import "package:flutter/material.dart";

import "device_id.dart";
import "entries_page.dart";
import "health.dart";
import "mentor_api.dart";
import "mentor_settings_page.dart";
import "mirror_api.dart";
import "mirror_page.dart";
import "theme.dart";

/// 启动时通过 --dart-define=API_BASE_URL 注入后端地址
/// （Android 模拟器用 http://10.0.2.2:3000）
const String apiBaseUrl =
    String.fromEnvironment("API_BASE_URL", defaultValue: "http://localhost:3000");

void main() {
  runApp(const ZhaojianApp());
}

class ZhaojianApp extends StatelessWidget {
  const ZhaojianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "照见",
      theme: zhaojianTheme(),
      routes: {
        "/": (_) => const MirrorEntryPoint(),
        // 骨架健康页降级为排查页保留（非正式设计）
        "/health": (_) => const HealthHomePage(),
      },
    );
  }
}

/// 设备 ID 就绪后进入镜子时刻页
class MirrorEntryPoint extends StatelessWidget {
  const MirrorEntryPoint({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: loadDeviceId(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final api = MirrorApiClient(baseUrl: apiBaseUrl, deviceId: snapshot.data!);
        final mentorApi = MentorApiClient(baseUrl: apiBaseUrl, deviceId: snapshot.data!);
        return MirrorPage(
          api: api,
          onOpenEntries: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => EntriesPage(api: api)),
            );
          },
          onOpenMentor: () async {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => MentorSettingsPage(api: mentorApi)),
            );
          },
        );
      },
    );
  }
}

/// 骨架期保留页：展示后端健康状态，用于排查连通。
class HealthHomePage extends StatefulWidget {
  const HealthHomePage({super.key});

  @override
  State<HealthHomePage> createState() => _HealthHomePageState();
}

class _HealthHomePageState extends State<HealthHomePage> {
  late Future<HealthStatus> _health = fetchHealth(apiBaseUrl);

  void _retry() {
    setState(() {
      _health = fetchHealth(apiBaseUrl);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("照见 · 骨架验证")),
      body: Center(
        child: FutureBuilder<HealthStatus>(
          future: _health,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const CircularProgressIndicator();
            }
            final (icon, text) = switch (snapshot.data!) {
              HealthStatus.ok => (Icons.check_circle, "后端连通正常"),
              HealthStatus.degraded => (Icons.warning, "后端降级：数据库不可达"),
              HealthStatus.unreachable => (Icons.error, "后端不可达，请确认服务已启动"),
            };
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 48),
                const SizedBox(height: 12),
                Text(text),
                const SizedBox(height: 12),
                TextButton(onPressed: _retry, child: const Text("重试")),
              ],
            );
          },
        ),
      ),
    );
  }
}
