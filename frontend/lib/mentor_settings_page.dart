import "package:flutter/material.dart";

import "mentor_api.dart";
import "mirror_api.dart";
import "theme.dart";

/// 导师设置页：改名 + 切换风格（R-v1.0-CK-2「可自定义、可切换」）。
/// 三态：loading / error+重试 / 表单；保存失败不丢已填内容。
class MentorSettingsPage extends StatefulWidget {
  const MentorSettingsPage({super.key, required this.api});

  final MentorApiClient api;

  @override
  State<MentorSettingsPage> createState() => _MentorSettingsPageState();
}

class _MentorSettingsPageState extends State<MentorSettingsPage> {
  final TextEditingController _name = TextEditingController();
  late Future<MentorProfile> _profile = _load();
  String _style = "gentle";
  bool _saving = false;

  Future<MentorProfile> _load() async {
    final p = await widget.api.fetchProfile();
    _name.text = p.name;
    _style = p.style;
    return p;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() {
      _profile = _load();
    });
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      await widget.api.updateProfile(name: _name.text, style: _style);
      if (mounted) Navigator.of(context).pop(true);
    } on MirrorApiException catch (e) {
      _showSnack(e.code == "invalid_name" ? "名字要在 1～12 字之间。" : "没存上。稍后再试。");
    } on MirrorApiUnreachable {
      _showSnack("没连上。你写的内容还在，稍后再试。");
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("导师", style: TextStyle(fontSize: Zj.fsBody)),
        backgroundColor: Zj.paper,
        foregroundColor: Zj.ink,
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<MentorProfile>(
          future: _profile,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      "没连上。稍后再试。",
                      style: TextStyle(fontSize: Zj.fsBody, color: Zj.inkSoft),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _retry,
                      child: const Text("重试", style: TextStyle(color: Zj.cinnabar)),
                    ),
                  ],
                ),
              );
            }
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            return _buildForm();
          },
        ),
      ),
    );
  }

  Widget _buildForm() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(26, 20, 26, 26),
      children: [
        Text("名字", style: Zj.meta(color: Zj.inkSoft)),
        const SizedBox(height: 8),
        TextField(
          controller: _name,
          maxLength: 12,
          decoration: const InputDecoration(hintText: "ta 的名字", counterText: ""),
        ),
        const SizedBox(height: 24),
        Text("风格", style: Zj.meta(color: Zj.inkSoft)),
        const SizedBox(height: 8),
        for (final entry in mentorStyleOptions.entries) ...[
          _StyleOption(
            label: entry.value.label,
            desc: entry.value.desc,
            selected: _style == entry.key,
            onTap: () => setState(() => _style = entry.key),
          ),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerRight,
          child: ZjPrimaryButton(label: "保存", onPressed: _save, loading: _saving),
        ),
      ],
    );
  }
}

/// 风格选项卡：选中=朱砂边 + 8% 朱砂底；未选中=hairline 边
class _StyleOption extends StatelessWidget {
  const _StyleOption({
    required this.label,
    required this.desc,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String desc;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 13),
        decoration: BoxDecoration(
          color: selected ? Zj.cinnabarSoft : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? Zj.cinnabar : Zj.hairline),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: Zj.fsBody,
                fontWeight: FontWeight.w600,
                color: selected ? Zj.cinnabar : Zj.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              desc,
              style: const TextStyle(fontSize: Zj.fsHint, color: Zj.inkDim, height: 1.7),
            ),
          ],
        ),
      ),
    );
  }
}
