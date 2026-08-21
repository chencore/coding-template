import "package:flutter/material.dart";

import "cang_api.dart";
import "mirror_api.dart";
import "renwen_api.dart";
import "theme.dart";

/// 人文导师团召唤页（renwen-mentors 决策 8）：
/// 自上而下 = 最新回应卡 → 困惑输入 → 人物选择卡 → 召唤按钮 → 过往召唤列表。
/// 429 提示「今天已请过三次了」；503/不可达给可重试提示；已填困惑不丢。
class RenwenPage extends StatefulWidget {
  const RenwenPage({
    super.key,
    required this.api,
    required this.cang,
    required this.mentorName,
  });

  final RenwenApiClient api;

  /// 藏·收藏出口（回应卡的「收进藏里」）
  final CangApiClient cang;

  /// 导师名字：回应卡引荐语「{导师} 请来了 {人物}」（导师退居引荐位，决策 4）
  final String mentorName;

  @override
  State<RenwenPage> createState() => _RenwenPageState();
}

class _RenwenPageState extends State<RenwenPage> {
  final TextEditingController _confusion = TextEditingController();

  /// 首屏数据：人物列表 + 过往召唤（合一加载）
  late Future<({List<RenwenFigure> figures, List<RenwenSession> sessions})> _data =
      _load();

  /// null = 让导师代选（默认）
  String? _selectedFigureId;
  bool _summoning = false;
  bool _collecting = false;
  RenwenSummon? _latest;
  String? _errorMsg;
  List<RenwenFigure>? _figures;

  Future<({List<RenwenFigure> figures, List<RenwenSession> sessions})> _load() async {
    final figures = await widget.api.fetchFigures();
    final sessions = await widget.api.fetchSessions();
    _figures = figures;
    return (figures: figures, sessions: sessions);
  }

  @override
  void dispose() {
    _confusion.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() {
      _data = _load();
    });
  }

  Future<void> _summon() async {
    if (_summoning) return;
    setState(() {
      _summoning = true;
      _errorMsg = null;
    });
    try {
      final result = await widget.api.summon(
        figureId: _selectedFigureId,
        confusion: _confusion.text.trim().isEmpty ? null : _confusion.text.trim(),
      );
      // 刷新过往列表，让刚召唤的这条立刻出现在「过往」里
      final sessions = await widget.api.fetchSessions();
      if (!mounted) return;
      setState(() {
        _latest = result;
        _confusion.clear();
        final figures = _figures;
        if (figures != null) {
          _data = Future.value((figures: figures, sessions: sessions));
        }
      });
    } on MirrorApiException catch (e) {
      if (!mounted) return;
      if (e.code == "daily_limit_reached") {
        _showSnack("今天已请过三次了，明天再来。");
      } else {
        setState(() => _errorMsg = "没请来。稍后再点「请他聊聊」重试。");
      }
    } on MirrorApiUnreachable {
      // 含 503 renwen_unavailable（暂时请不来）：可重试，已填内容不丢
      if (!mounted) return;
      setState(() => _errorMsg = "暂时请不来。你写的内容还在，稍后再点「请他聊聊」重试。");
    } finally {
      if (mounted) setState(() => _summoning = false);
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  /// 把最新一条人文回应收进藏里（sourceLabel 用「人物 · 《篇名》」）
  Future<void> _collectLatest() async {
    final latest = _latest;
    if (latest == null || _collecting) return;
    setState(() => _collecting = true);
    try {
      await widget.cang.collect(
        text: latest.response,
        sourceType: "renwen_reply",
        sourceLabel: "${latest.figureName} · ${latest.sourceTitle}",
      );
      _showSnack("已收进藏里。");
    } on MirrorApiException {
      _showSnack("没收进去。稍后再试。");
    } on MirrorApiUnreachable {
      _showSnack("没连上。稍后再试。");
    } finally {
      if (mounted) setState(() => _collecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("请前人聊聊", style: TextStyle(fontSize: Zj.fsBody)),
        backgroundColor: Zj.paper,
        foregroundColor: Zj.ink,
        elevation: 0,
      ),
      body: SafeArea(
        child: FutureBuilder<({List<RenwenFigure> figures, List<RenwenSession> sessions})>(
          future: _data,
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

  Widget _buildContent(
    ({List<RenwenFigure> figures, List<RenwenSession> sessions}) data,
  ) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(26, 20, 26, 26),
      children: [
        if (_latest != null) ...[
          _ResponseCard(
            meta: "${widget.mentorName} 请来了 ${_latest!.figureName}",
            response: _latest!.response,
            sourceTitle: _latest!.sourceTitle,
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: _collectLatest,
                  child: const Text(
                    "收进藏里",
                    style: TextStyle(fontSize: Zj.fsHint, color: Zj.inkDim),
                    semanticsLabel: "收进藏里",
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  "今天还能再请 ${_latest!.remainingToday} 次",
                  style: const TextStyle(fontSize: Zj.fsHint, color: Zj.inkDim),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
        if (_errorMsg != null) ...[
          Text(
            _errorMsg!,
            style: const TextStyle(fontSize: Zj.fsHint, color: Zj.cinnabar, height: 1.7),
          ),
          const SizedBox(height: 16),
        ],
        Text("此刻的困惑（可不写）", style: Zj.meta(color: Zj.inkSoft)),
        const SizedBox(height: 8),
        TextField(
          controller: _confusion,
          maxLength: 200,
          maxLines: 3,
          minLines: 1,
          decoration: const InputDecoration(
            hintText: "写下来，前人听得见…",
            counterText: "",
          ),
        ),
        const SizedBox(height: 20),
        Text("请哪位", style: Zj.meta(color: Zj.inkSoft)),
        const SizedBox(height: 8),
        _FigureOption(
          label: "让导师代选",
          desc: "不知道选谁时，交给你的导师。",
          selected: _selectedFigureId == null,
          onTap: () => setState(() => _selectedFigureId = null),
        ),
        for (final f in data.figures) ...[
          const SizedBox(height: 10),
          _FigureOption(
            label: "${f.name} · ${f.epithet}",
            desc: f.styleHint,
            selected: _selectedFigureId == f.id,
            onTap: () => setState(() => _selectedFigureId = f.id),
          ),
        ],
        const SizedBox(height: 20),
        Align(
          alignment: Alignment.centerRight,
          child: ZjPrimaryButton(label: "请他聊聊", onPressed: _summon, loading: _summoning),
        ),
        if (data.sessions.isNotEmpty) ...[
          const SizedBox(height: 32),
          Text("过往", style: Zj.meta(color: Zj.inkSoft)),
          const SizedBox(height: 10),
          for (final s in data.sessions) _SessionItem(session: s),
        ],
      ],
    );
  }
}

/// 回应卡：朱砂 8% 底 + 引荐语 + 衬线回应 + 出处（库内篇名，可信标注）
class _ResponseCard extends StatelessWidget {
  const _ResponseCard({
    required this.meta,
    required this.response,
    required this.sourceTitle,
  });

  final String meta;
  final String response;
  final String sourceTitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 13),
      decoration: BoxDecoration(
        color: Zj.cinnabarSoft,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(meta, style: Zj.meta(color: Zj.cinnabar)),
          const SizedBox(height: 7),
          Text(response, style: Zj.serif(size: Zj.fsAnswer, height: 1.7)),
          const SizedBox(height: 7),
          Text("出处 · $sourceTitle", style: Zj.meta()),
        ],
      ),
    );
  }
}

/// 人物选项卡：复用导师设置页选项卡样式（选中=朱砂边 + 8% 朱砂底）
class _FigureOption extends StatelessWidget {
  const _FigureOption({
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

/// 过往召唤条目：人物+日期 元信息 + 回应节选 + 出处
class _SessionItem extends StatelessWidget {
  const _SessionItem({required this.session});

  final RenwenSession session;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 13, top: 2),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Zj.hairline)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "${session.figureName} · ${_formatDate(session.createdAt)} · ${session.sourceTitle}",
            style: Zj.meta(),
          ),
          const SizedBox(height: 6),
          Text(
            session.response,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Zj.serif(size: Zj.fsBody, height: 1.7),
          ),
        ],
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
