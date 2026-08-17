import "package:flutter/material.dart";

import "health.dart";

/// 启动时通过 --dart-define=API_BASE_URL 注入后端地址
const String apiBaseUrl =
    String.fromEnvironment("API_BASE_URL", defaultValue: "http://localhost:3000");

void main() {
  runApp(const ZhaojianApp());
}

class ZhaojianApp extends StatelessWidget {
  const ZhaojianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: HealthHomePage(),
    );
  }
}

/// 临时启动页：展示后端健康状态，用于验证全栈连通。
/// 非正式设计——正式首次体验在 first-run-aha 变更中实现。
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
