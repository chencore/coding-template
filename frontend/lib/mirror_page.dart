import "package:flutter/material.dart";

import "mirror_api.dart";
import "theme.dart";

/// 镜子时刻页（原型 v2 屏 02）：每日一问 + 文字回答。
/// 三态：loading / error+重试 / 内容（未回答输入态 · 已回答展示态）。
class MirrorPage extends StatefulWidget {
  const MirrorPage({
    super.key,
    required this.api,
    required this.onOpenEntries,
    required this.onOpenMentor,
  });

  final MirrorApiClient api;
  final VoidCallback onOpenEntries;

  /// 打开导师设置页；返回后刷新 today（署名/风格可能已改）
  final Future<void> Function() onOpenMentor;

  @override
  State<MirrorPage> createState() => _MirrorPageState();
}

class _MirrorPageState extends State<MirrorPage> {
  final TextEditingController _input = TextEditingController();
  late Future<MirrorToday> _today = widget.api.fetchToday();
  bool _submitting = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() {
      _today = widget.api.fetchToday();
    });
  }

  Future<void> _submit() async {
    final text = _input.text.trim();
    if (text.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    try {
      final updated = await widget.api.submitAnswer(text);
      setState(() {
        _today = Future.value(updated);
        _input.clear();
      });
    } on MirrorApiException {
      _showSnack("这句话有点长，试着说到 2000 字以内。");
    } on MirrorApiUnreachable {
      _showSnack("没连上。稍后再试，你的话不会丢。");
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _openMentor() async {
    await widget.onOpenMentor();
    if (mounted) _retry();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: FutureBuilder<MirrorToday>(
          future: _today,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return _ErrorState(onRetry: _retry);
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

  Widget _buildContent(MirrorToday today) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(26, 20, 26, 0),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      GestureDetector(
                        onTap: widget.onOpenEntries,
                        child: Text(
                          "档案",
                          style: Zj.meta(size: Zj.fsUi),
                          semanticsLabel: "打开声音档案",
                        ),
                      ),
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: _openMentor,
                        child: Text(
                          "导师",
                          style: Zj.meta(size: Zj.fsUi),
                          semanticsLabel: "打开导师设置",
                        ),
                      ),
                    ],
                  ),
                  Text("镜子时刻 · ${_formatDate(today.date)}", style: Zj.meta()),
                ],
              ),
              const SizedBox(height: 44),
              Text("${today.mentorName} · 你的导师", style: Zj.meta(color: Zj.cinnabar)),
              const SizedBox(height: 12),
              Text("「${today.question}」", style: Zj.serif(size: Zj.fsQuestion)),
              const SizedBox(height: 12),
              const Text(
                "说真话。只有你自己听得到。",
                style: TextStyle(fontSize: Zj.fsHint, color: Zj.inkDim, height: 1.7),
              ),
              if (today.yesterdayText != null) ...[
                const SizedBox(height: 30),
                _AnswerBlock(
                  meta: "昨天 · ${_formatDate(today.yesterdayDate!)}",
                  text: today.yesterdayText!,
                ),
              ],
              if (today.answered) ...[
                const SizedBox(height: 30),
                _AnswerBlock(meta: "今天 · ${_formatDate(today.date)}", text: today.answerText!),
                const SizedBox(height: 14),
                if (today.mentorReply != null)
                  _MentorReplyBlock(name: today.mentorName, reply: today.mentorReply!)
                else
                  const Text(
                    "已记下。明天见。",
                    style: TextStyle(fontSize: Zj.fsHint, color: Zj.inkDim, height: 1.7),
                  ),
              ],
            ],
          ),
        ),
        if (!today.answered)
          Padding(
            padding: const EdgeInsets.fromLTRB(26, 12, 26, 18),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    maxLength: 2000,
                    maxLines: null,
                    decoration: const InputDecoration(
                      hintText: "写下此刻的真话…",
                      counterText: "",
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                const SizedBox(width: 10),
                ZjPrimaryButton(label: "说完", onPressed: _submit, loading: _submitting),
              ],
            ),
          ),
      ],
    );
  }
}

/// 一条「自己的话」：10px 淡墨元信息 + 15px 衬线正文 + hairline 底边（原型条目样式）
class _AnswerBlock extends StatelessWidget {
  const _AnswerBlock({required this.meta, required this.text});

  final String meta;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: 13),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Zj.hairline)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(meta, style: Zj.meta()),
          const SizedBox(height: 7),
          Text("「$text」", style: Zj.serif(size: Zj.fsAnswer, height: 1.7)),
        ],
      ),
    );
  }
}

/// 导师回应卡（原型 v2 屏 02）：朱砂 8% 底 + 导师署名 + 衬线回应正文
class _MentorReplyBlock extends StatelessWidget {
  const _MentorReplyBlock({required this.name, required this.reply});

  final String name;
  final String reply;

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
          Text("$name · 回应", style: Zj.meta(color: Zj.cinnabar)),
          const SizedBox(height: 7),
          Text(reply, style: Zj.serif(size: Zj.fsAnswer, height: 1.7)),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
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
            onPressed: onRetry,
            child: const Text("重试", style: TextStyle(color: Zj.cinnabar)),
          ),
        ],
      ),
    );
  }
}

/// '2026-08-18' → '8月18日'
String _formatDate(String date) {
  final parts = date.split("-");
  if (parts.length != 3) return date;
  return "${int.parse(parts[1])}月${int.parse(parts[2])}日";
}
