import "dart:math";

import "package:shared_preferences/shared_preferences.dart";

/// 匿名设备标识（X-Device-Id）：首次启动生成并持久化，卸载重装即新身份（design.md §1 已知局限）。
/// 开发期可用 --dart-define=DEVICE_ID 固定，便于联调。
const String _overrideDeviceId = String.fromEnvironment("DEVICE_ID");

const String _prefsKey = "zhaojian.device_id";

Future<String> loadDeviceId() async {
  if (_overrideDeviceId.isNotEmpty) return _overrideDeviceId;
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_prefsKey);
  if (existing != null && existing.isNotEmpty) return existing;
  final created = _newDeviceId();
  await prefs.setString(_prefsKey, created);
  return created;
}

String _newDeviceId() {
  final rand = Random.secure();
  final bytes = List<int>.generate(16, (_) => rand.nextInt(256));
  return "dev-${bytes.map((b) => b.toRadixString(16).padLeft(2, "0")).join()}";
}
