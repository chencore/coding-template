# Frontend DESIGN.md

> 本文件只在前端界面变更时加载。它是给 AI coding/design agent 读取的纯 Markdown 设计系统文档，用来让生成的页面、组件、交互和文案保持一致。

## 1. Visual Theme & Atmosphere

本模板默认面向生产级全栈应用，视觉气质应当克制、清晰、可信。

- **整体气质**：专业、安静、结构化，优先服务任务完成，而不是展示感。
- **信息密度**：中高密度，适合后台、SaaS、管理台、开发者工具和业务系统。
- **设计哲学**：先清晰，再美观；先一致，再局部创新。
- **界面重心**：数据、表单、流程状态、用户动作。
- **避免倾向**：不要做成营销落地页风格；不要使用过度装饰、漂浮卡片、渐变泡泡或无意义插画。

## 2. Color Palette & Roles

项目落地后应把这些语义色映射到实际 CSS variables / design tokens。生成 UI 时优先使用语义角色，不直接散写颜色。

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--color-bg` | `#F7F8FA` | 页面背景 |
| `--color-surface` | `#FFFFFF` | 面板、表格、弹层 |
| `--color-surface-muted` | `#F1F3F5` | 次级区域、只读块 |
| `--color-border` | `#DDE1E6` | 边框、分割线 |
| `--color-text` | `#1F2328` | 主文本 |
| `--color-text-muted` | `#656D76` | 辅助文本 |
| `--color-primary` | `#2563EB` | 主操作、链接、焦点 |
| `--color-primary-hover` | `#1D4ED8` | 主操作 hover |
| `--color-success` | `#16A34A` | 成功、启用、通过 |
| `--color-warning` | `#D97706` | 警告、待处理 |
| `--color-danger` | `#DC2626` | 删除、失败、危险操作 |
| `--color-info` | `#0891B2` | 信息提示 |

规则：

- 主色只用于主操作、焦点态、关键链接，不要大面积铺满。
- 状态色只表达状态，不承担装饰功能。
- 文字对比度必须优先于视觉轻盈感。
- 深色模式只有在项目明确需要时再扩展，不要默认生成双主题复杂度。

## 3. Typography Rules

默认使用系统字体栈，保证跨平台稳定和加载速度。

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

| Role | Size | Weight | Line Height | 用途 |
|------|------|--------|-------------|------|
| Page title | 28px | 650 | 36px | 页面主标题 |
| Section title | 20px | 650 | 28px | 页面分区标题 |
| Panel title | 16px | 600 | 24px | 卡片、表格、表单块标题 |
| Body | 14px | 400 | 22px | 默认正文 |
| Body strong | 14px | 600 | 22px | 重要正文 |
| Caption | 12px | 400 | 18px | 辅助说明、表格元信息 |
| Code | 13px | 400 | 20px | 代码、变量、命令 |

规则：

- 不使用随 viewport 缩放的字体大小。
- 不使用负 letter-spacing。
- 标题层级最多三级，避免为了视觉效果滥用大标题。
- 操作按钮文案使用动词开头，如“保存配置”“创建任务”“重试同步”。

## 4. Component Stylings

所有组件优先复用项目已有组件。没有组件库时，按以下基础形态生成。

### Buttons

- 高度：32px / 36px / 40px 三档。
- 圆角：6px。
- 主按钮：`primary` 背景，白色文字。
- 次按钮：白底、边框、主文本。
- 危险按钮：只在破坏性操作使用 `danger`。
- 图标按钮必须有 `aria-label` 或等价可访问名称。
- loading 时保持按钮宽度稳定。

### Inputs

- 高度：36px 或 40px。
- 圆角：6px。
- 默认边框使用 `border`，focus 使用 `primary`。
- 错误态必须显示错误文案，不只改边框颜色。
- 必填、禁用、只读状态必须清晰区分。

### Cards / Panels

- 只用于承载独立对象、表单分组、摘要模块或弹层内容。
- 不要把整个页面 section 做成漂浮大卡片。
- 不要卡片套卡片。
- 内边距默认 16px / 20px / 24px。

### Tables

- 表头固定语义清晰，文字 12px 或 13px。
- 行高 40px / 44px / 48px。
- 数字右对齐，文本左对齐，状态居中或左对齐但保持一致。
- 空状态必须说明原因，并给出下一步动作。

### Navigation

- 导航项使用清晰名词，不使用营销化文案。
- 当前项必须有视觉选中态。
- 层级不超过两层；超过时优先改信息架构。

### Feedback

- 成功反馈短暂、轻量。
- 错误反馈必须可行动，告诉用户怎么修复或下一步做什么。
- 长任务必须有进度、轮询状态或后台运行提示。

## 5. Layout Principles

| Token | Value | 用途 |
|-------|-------|------|
| `--space-1` | 4px | 紧密间距 |
| `--space-2` | 8px | 小组件内距 |
| `--space-3` | 12px | 表单项内距 |
| `--space-4` | 16px | 常规组件间距 |
| `--space-5` | 20px | 分组间距 |
| `--space-6` | 24px | 面板内距 |
| `--space-8` | 32px | 页面分区 |
| `--space-10` | 40px | 大分区 |

布局规则：

- 页面应包含明确的 header、主内容区、操作区、反馈区。
- 内容最大宽度按场景选择：表单 720px，详情 960px，表格/工作台 1200px+。
- 表单 label、输入框、帮助文案和错误文案必须组成稳定垂直节奏。
- 工具栏使用一行扫描结构：左侧上下文，右侧动作。
- 固定格式 UI 使用明确尺寸或网格，避免内容变化导致布局跳动。

## 6. Depth & Elevation

默认使用低阴影、清晰边框，避免厚重拟物感。

| Level | Style | 用途 |
|-------|-------|------|
| 0 | 无阴影，背景分层 | 页面主体 |
| 1 | `0 1px 2px rgba(16,24,40,.06)` | 普通面板、轻卡片 |
| 2 | `0 8px 24px rgba(16,24,40,.12)` | 下拉、popover |
| 3 | `0 16px 48px rgba(16,24,40,.18)` | modal、全局浮层 |

规则：

- 边框优先于阴影。
- 阴影只表达层级，不做装饰。
- Modal 必须有明确标题、关闭方式和焦点管理。

## 7. Do's and Don'ts

Do:

- 复用已有组件、token、布局节奏。
- 为 loading / empty / error / disabled 状态设计明确 UI。
- 用短文案说明用户结果，而不是系统实现。
- 给主要操作明确视觉优先级。
- 生成页面后做截图或视觉验证。

Don't:

- 不要每个页面引入新的颜色、圆角、阴影和字号。
- 不要使用大面积渐变、装饰性光斑、漂浮卡片堆叠。
- 不要把说明文字写成产品介绍页。
- 不要只做 happy path UI。
- 不要让文本溢出按钮、表格、卡片或标签。

## 8. Responsive Behavior

断点：

| Token | Width | 用途 |
|-------|-------|------|
| `sm` | 640px | 手机横向 / 小平板 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 桌面 |

规则：

- 移动端优先保证任务可完成，不强行保留桌面密度。
- 表格在窄屏下优先改为卡片列表、横向滚动或列裁剪，必须选择一种。
- 触摸目标不小于 44px。
- 主要操作在移动端应保持可见或易达。
- 弹层在移动端可转为底部抽屉。

## 9. Agent Prompt Guide

前端界面任务开始前，AI 必须先判断是否需要加载本文件：

- 如果任务涉及页面、组件、交互、样式、表单、前端视觉：读取本文件。
- 如果任务是纯后端、数据、部署、脚本、普通文档：不要加载本文件。

生成 UI 时使用这段约束：

```text
Use frontend/design.md as the visual source of truth.
Keep the interface calm, structured, production-grade, and consistent.
Reuse existing patterns and tokens before inventing new styles.
Cover loading, empty, error, disabled, and accessibility states.
Do not create decorative gradients, nested cards, or one-off visual values.
```

涉及 UI 的 `openspec/changes/<name>/tasks.md` 必须包含：

```markdown
## UI Check

- [ ] UI complexity level selected: S / M / L
- [ ] Existing pattern/component is reused, or new pattern is documented
- [ ] Visual values use tokens or established style variables
- [ ] Required states are covered: loading / empty / error / disabled
- [ ] Keyboard access and accessible names are handled
- [ ] Screenshot or visual verification is provided, or not applicable with reason
```

---

# 照见产品视觉：数字文房（覆盖上文模板默认值）

> 以下来自 `docs/照见-App原型-v2.html`，是照见 App 的正式视觉规范；与上文模板 SaaS 默认值冲突时**以本节为准**。Flutter 实现在 `frontend/lib/theme.dart`（`Zj` token 类），界面取值一律走 token，禁止散值。

## 气质

「数字文房」：暖白纸感、墨色文字、朱砂一点。安静、留白多、无卡片堆叠、无阴影装饰。分割线用极细 hairline，不用色块分区。

## 色板

| Token | 值 | 用途 |
|-------|-----|------|
| `Zj.paper` | `#FAF9F6` | 页面底色（暖白纸面） |
| `Zj.ink` | `#2A2A28` | 主墨色：标题、问句、正文 |
| `Zj.inkSoft` | `#5C574E` | 次墨色：次级正文 |
| `Zj.inkDim` | `#8A857C` | 淡墨：元信息、辅助说明 |
| `Zj.hairline` | `#E6E1D6` | 极细分割线、输入框边 |
| `Zj.border` | `#CFC9BC` | 边框（胶囊标签、焦点边） |
| `Zj.cinnabar` | `#B03A2E` | 朱砂：**唯一彩色**，仅用于主按钮、导师署名、关键强调 |
| `Zj.cinnabarSoft` | `#B03A2E @ 8%` | 朱砂浅底（轻强调区块，如导师回应卡） |

规则：朱砂克制使用，一屏至多 2 处；不引新彩色；无深色模式（V1）。

## 字体

- **衬线**（`Zj.serif()`）：问句、用户回答、引文等「文」内容。族序 `Songti SC → Noto Serif CJK SC → SimSun → serif`
- **无衬线**（默认）：UI 控件、按钮、输入框、元信息

| 字级 | px | 用途 |
|------|----|------|
| `fsMeta` | 10 | 元信息（导师署名、日期、历史标注），字距 +0.14em |
| `fsHint` | 11 | 轻提示（如「说真话。只有你自己听得到。」） |
| `fsUi` | 12 | 小控件（退出、档案入口） |
| `fsBody` | 14 | 正文、输入框、按钮 |
| `fsAnswer` | 15 | 用户回答（衬线，行高 1.7） |
| `fsQuestion` | 21 | 镜子问句（衬线，行高 1.9） |

## 关键组件（以原型 v2 为准）

- **镜子问句**：衬线 21px、墨色、行高 1.9，以「」包裹；上方 10px 朱砂「默 · 你的导师」署名；下方 11px 淡墨提示
- **主按钮**：朱砂底、纸色字、圆角 12、14px/600（`ZjPrimaryButton`）；loading 换同尺寸 spinner，宽度不抖
- **输入框**：白底、hairline 边、圆角 12、13/14 内边距
- **历史/回顾条目**：10px 淡墨元信息行 + 15px 衬线「回答」，条目间 hairline 分隔，无卡片
- **页面留白**：左右 26px，问句区上边距 44px

## 文案语气

克制、温和、不评判。不说教、不用感叹号轰炸、不贩卖焦虑。提示语示例：「说真话。只有你自己听得到。」
