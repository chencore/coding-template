import "package:flutter/material.dart";

import "mirror_api.dart";
import "theme.dart";

/// 声音档案页：按日期倒序回看自己的回答，滚动到底加载更多。
class EntriesPage extends StatefulWidget {
  const EntriesPage({super.key, required this.api});

  final MirrorApiClient api;

  @override
  State<EntriesPage> createState() => _EntriesPageState();
}

class _EntriesPageState extends State<EntriesPage> {
  final List<MirrorEntryItem> _entries = [];
  final ScrollController _scroll = ScrollController();
  String? _nextBefore;
  bool _loading = false;
  bool _failed = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _loadMore();
    _scroll.addListener(() {
      if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) {
        _loadMore();
      }
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadMore() async {
    if (_loading || (_initialized && _nextBefore == null)) return;
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final page = await widget.api.fetchEntries(before: _nextBefore);
      setState(() {
        _entries.addAll(page.entries);
        _nextBefore = page.nextBefore;
        _initialized = true;
      });
    } on Exception {
      setState(() => _failed = true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(26, 20, 26, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Text("← 返回", style: Zj.meta(size: Zj.fsUi)),
                  ),
                  Text("声音档案", style: Zj.meta()),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (!_initialized && _loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_entries.isEmpty && _failed) {
      return _CenteredHint(message: "没连上。稍后再试。", action: "重试", onTap: _loadMore);
    }
    if (_initialized && _entries.isEmpty) {
      return _CenteredHint(
        message: "还没有留下过声音。\n今天的镜子时刻，说第一句真话。",
        action: "去镜子时刻",
        onTap: () => Navigator.of(context).pop(),
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(26, 0, 26, 18),
      itemCount: _entries.length + 1,
      itemBuilder: (context, index) {
        if (index == _entries.length) {
          if (_loading) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          if (_failed) {
            return _CenteredHint(message: "加载失败。", action: "重试", onTap: _loadMore);
          }
          return const SizedBox.shrink();
        }
        final e = _entries[index];
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: Zj.hairline)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("${e.question} · ${_formatDate(e.date)}", style: Zj.meta()),
              const SizedBox(height: 7),
              Text("「${e.answer}」", style: Zj.serif(size: Zj.fsAnswer, height: 1.7)),
            ],
          ),
        );
      },
    );
  }
}

class _CenteredHint extends StatelessWidget {
  const _CenteredHint({required this.message, required this.action, required this.onTap});

  final String message;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: Zj.fsBody, color: Zj.inkSoft, height: 1.9),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onTap,
            child: Text(action, style: const TextStyle(color: Zj.cinnabar)),
          ),
        ],
      ),
    );
  }
}

String _formatDate(String date) {
  final parts = date.split("-");
  if (parts.length != 3) return date;
  return "${int.parse(parts[1])}月${int.parse(parts[2])}日";
}
