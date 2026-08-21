import "package:flutter/material.dart";

import "cang_api.dart";
import "mirror_api.dart";
import "theme.dart";

/// 藏页（cang-knowledge-base 决策 6）：
/// 自上而下 = 手动输入（顿悟随手记）→ 主题分组（主题名+条数+条目）→ 未归组（末尾）。
/// 收藏静默进行：成功 SnackBar「已收进藏里。」；打标失败无感（条目落未归组）。
class CangPage extends StatefulWidget {
  const CangPage({super.key, required this.api});

  final CangApiClient api;

  @override
  State<CangPage> createState() => _CangPageState();
}

class _CangPageState extends State<CangPage> {
  final TextEditingController _input = TextEditingController();
  late Future<CangMap> _map = widget.api.fetchMap();
  bool _collecting = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() {
      _map = widget.api.fetchMap();
    });
  }

  Future<void> _collectManual() async {
    final text = _input.text.trim();
    if (text.isEmpty || _collecting) return;
    setState(() => _collecting = true);
    try {
      await widget.api.collect(text: text, sourceType: "manual");
      if (!mounted) return;
      _input.clear();
      _showSnack("已收进藏里。");
      _retry();
    } on MirrorApiException {
      _showSnack("这句话有点长，试着说到 2000 字以内。");
    } on MirrorApiUnreachable {
      _showSnack("没连上。稍后再试，你写的内容还在。");
    } finally {
      if (mounted) setState(() => _collecting = false);
    }
  }

  Future<void> _confirmDelete(CangItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("删掉这条收藏？", style: TextStyle(fontSize: Zj.fsBody)),
        content: Text(
          item.text,
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: Zj.serif(size: Zj.fsBody, height: 1.7),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("留着", style: TextStyle(color: Zj.inkSoft)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("删掉", style: TextStyle(color: Zj.cinnabar)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await widget.api.deleteItem(item.id);
      if (!mounted) return;
      _retry();
    } on MirrorApiUnreachable {
      _showSnack("没连上。稍后再试。");
    } on MirrorApiException {
      _showSnack("没删掉。稍后再试。");
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
        title: const Text("藏", style: TextStyle(fontSize: Zj.fsBody)),
        backgroundColor: Zj.paper,
        foregroundColor: Zj.ink,
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<CangMap>(
          future: _map,
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
            return _buildContent(snapshot.data!);
          },
        ),
      ),
    );
  }

  Widget _buildContent(CangMap map) {
    final isEmpty = map.themes.isEmpty && map.ungrouped.isEmpty;
    return ListView(
      padding: const EdgeInsets.fromLTRB(26, 20, 26, 26),
      children: [
        Text("随手记一句", style: Zj.meta(color: Zj.inkSoft)),
        const SizedBox(height: 8),
        TextField(
          controller: _input,
          maxLength: 2000,
          maxLines: 2,
          minLines: 1,
          decoration: const InputDecoration(
            hintText: "打动你的，或刚想通的…",
            counterText: "",
          ),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: ZjPrimaryButton(
            label: "收进藏里",
            onPressed: _collectManual,
            loading: _collecting,
          ),
        ),
        if (isEmpty) ...[
          const SizedBox(height: 48),
          const Center(
            child: Text(
              "还没有收藏。打动你的句子，收进来。",
              style: TextStyle(fontSize: Zj.fsBody, color: Zj.inkDim, height: 1.7),
            ),
          ),
        ],
        for (final theme in map.themes) ...[
          const SizedBox(height: 28),
          _ThemeHeader(name: theme.name, count: theme.count),
          const SizedBox(height: 10),
          for (final item in theme.items)
            _CangItemTile(item: item, onLongPress: () => _confirmDelete(item)),
        ],
        if (map.ungrouped.isNotEmpty) ...[
          const SizedBox(height: 28),
          Text("未归组", style: Zj.meta(color: Zj.inkSoft)),
          const SizedBox(height: 10),
          for (final item in map.ungrouped)
            _CangItemTile(item: item, onLongPress: () => _confirmDelete(item)),
        ],
      ],
    );
  }
}

/// 主题头：主题名（墨色 600）+ 条数（淡墨）
class _ThemeHeader extends StatelessWidget {
  const _ThemeHeader({required this.name, required this.count});

  final String name;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          name,
          style: const TextStyle(
            fontSize: Zj.fsBody,
            fontWeight: FontWeight.w600,
            color: Zj.ink,
          ),
        ),
        const SizedBox(width: 8),
        Text("$count 条", style: Zj.meta()),
      ],
    );
  }
}

/// 一条收藏：15px 衬线正文 + 10px 淡墨「来源 · 日期」+ hairline 底边；长按删除
class _CangItemTile extends StatelessWidget {
  const _CangItemTile({required this.item, required this.onLongPress});

  final CangItem item;
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    final label = item.sourceLabel;
    return GestureDetector(
      onLongPress: onLongPress,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.only(bottom: 13, top: 2),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Zj.hairline)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "「${item.text}」",
              style: Zj.serif(size: Zj.fsAnswer, height: 1.7),
            ),
            const SizedBox(height: 6),
            Text(
              label != null
                  ? "$label · ${_formatDate(item.createdAt)}"
                  : _formatDate(item.createdAt),
              style: Zj.meta(),
            ),
          ],
        ),
      ),
    );
  }
}

/// ISO 时间 → 'M月D日'（本地时区展示）
String _formatDate(String iso) {
  final dt = DateTime.tryParse(iso)?.toLocal();
  if (dt == null) return iso;
  return "${dt.month}月${dt.day}日";
}
