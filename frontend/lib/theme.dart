import "package:flutter/material.dart";

/// 照见「数字文房」视觉 token —— 源自 docs/照见-App原型-v2.html。
/// 所有界面取值必须走这里，禁止散值。规范见 frontend/design.md「照见产品视觉」节。
abstract final class Zj {
  // 色
  static const Color paper = Color(0xFFFAF9F6); // 暖白纸面（页面底色）
  static const Color ink = Color(0xFF2A2A28); // 主墨色（正文/标题）
  static const Color inkSoft = Color(0xFF5C574E); // 次墨色（次级正文）
  static const Color inkDim = Color(0xFF8A857C); // 淡墨（辅助说明/元信息）
  static const Color hairline = Color(0xFFE6E1D6); // 极细分割线
  static const Color border = Color(0xFFCFC9BC); // 边框（胶囊/输入框）
  static const Color cinnabar = Color(0xFFB03A2E); // 朱砂（唯一彩色，克制使用）
  static const Color cinnabarSoft = Color(0x14B03A2E); // 朱砂 8% 底（轻强调区块）

  // 字体族：衬线用于问句/回答等「文」内容；无衬线用于 UI 控件
  static const List<String> serifFallback = [
    "Songti SC",
    "Noto Serif CJK SC",
    "Noto Serif SC",
    "SimSun",
    "serif",
  ];

  // 字级（原型 px 直映）
  static const double fsMeta = 10; // 元信息（导师署名/日期/历史标注），加宽字距
  static const double fsHint = 11; // 轻提示
  static const double fsUi = 12; // UI 小控件（退出/档案入口）
  static const double fsBody = 14; // 正文/输入
  static const double fsAnswer = 15; // 自己的回答（衬线）
  static const double fsQuestion = 21; // 镜子问句（衬线）

  static TextStyle serif({
    double size = fsBody,
    Color color = ink,
    double height = 1.9,
    FontWeight weight = FontWeight.w400,
  }) {
    return TextStyle(
      fontSize: size,
      color: color,
      height: height,
      fontWeight: weight,
      fontFamilyFallback: serifFallback,
    );
  }

  static TextStyle meta({Color color = inkDim, double size = fsMeta}) {
    return TextStyle(fontSize: size, color: color, letterSpacing: 1.4, height: 1.7);
  }
}

ThemeData zhaojianTheme() {
  return ThemeData(
    scaffoldBackgroundColor: Zj.paper,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Zj.cinnabar,
      primary: Zj.cinnabar,
      surface: Zj.paper,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: Zj.cinnabar),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      hintStyle: const TextStyle(fontSize: Zj.fsBody, color: Zj.inkDim),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Zj.hairline),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Zj.hairline),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Zj.border),
      ),
    ),
  );
}

/// 朱砂主按钮（「说完」等）：全圆角 12、纸色字、14px 600
class ZjPrimaryButton extends StatelessWidget {
  const ZjPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;

  /// loading 时禁用并保持宽度稳定（内容替换为同尺寸小 spinner）
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: Zj.cinnabar,
        disabledBackgroundColor: Zj.cinnabar.withValues(alpha: 0.6),
        foregroundColor: Zj.paper,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: Zj.fsBody, fontWeight: FontWeight.w600),
      ),
      child: loading
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2, color: Zj.paper),
            )
          : Text(label),
    );
  }
}
