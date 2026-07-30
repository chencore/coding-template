# SpecCoding Template

**基于 Claude Code + OpenSpec + mattpocock/skills 三件套的全栈 AI 开发模板。**

> 让 AI 稳定交付全栈项目——告别"AI 改崩代码 / 失忆 / 跑偏"。

---

## 这是什么

一套**可直接 Clone 即用**的项目骨架，实现文章《让 AI 稳定交付全栈项目》里讲的完整工作流：

- ✅ **两级 Spec 体系**：`spec/` 管项目全局，`openspec/` 管单次变更
- ✅ **两级分支模型**：`version/v*` 承载一批需求，`feature/*` 隔离单次变更
- ✅ **七阶段工作流**：`git branch → openspec scaffold → 设计对话 → 任务拆解 → 执行 → 自查归档 → git merge`
- ✅ **协作姿态明确**：方案制定多问 / 列 tradeoff，执行落地尽量自主推进
- ✅ **Hardness 宪法**：用 5 条生产级底线约束所有变更，不堆重流程
- ✅ **UI 设计规范**：`frontend/design.md` 只在前端界面任务加载，保证界面一致性
- ✅ **复杂度自适应**：S/M/L 分级，小改动轻流程，大变更先架构讨论
- ✅ **样例 + 验证**：`examples/` 给 AI 可复制形状，`validation/` 给归档前检查
- ✅ **三工具协同**：Claude Code 执行、OpenSpec 规格、mattpocock/skills 技能
- ✅ **全栈骨架**：预留 backend / frontend / prototype 目录
- ✅ **标准样例**：`examples/` 内置通用变更 / UI 变更 / 模块边界样例，可直接照抄

---

## 协作模式：设计靠人决策，执行尽量自主

| 阶段 | 对应工具 | AI 姿态 |
|------|----------|---------|
| **方案制定** | 需求澄清、设计对话（可配合 `grill-me`）、架构决策 | **多问、列 tradeoff、设 checkpoint**——关键判断交给人类 |
| **执行落地** | `implement` / `tdd`、写代码、跑测试、走 git/openspec 流程 | **尽量自主推进**，方案确认后不要每一步都请示 |

执行阶段只在四种情况下停下来请示：方案与实际冲突、不可逆操作（如 `git push --force` / 改 `main`）、反复尝试同一思路失败、CLAUDE.md 明确要求人工确认的节点（如归档时的 design 提升）。详见 `CLAUDE.md`。

**一句话**：设计前多问，执行中少问。

---

## OpenSpec 与 mattpocock/skills 的区别

OpenSpec 和 mattpocock/skills 不是同一类工具，它们在本模板里负责两件不同的事：

| 工具 | 负责什么 | 产出在哪里 | 本质 |
|------|----------|------------|------|
| **OpenSpec** | 管理单次变更的规格、任务、状态和归档 | `openspec/changes/<name>/` | 磁盘上的变更记录系统 |
| **mattpocock/skills** | 约束 AI 在某个阶段的工作方式 | 对应阶段生成或修改 OpenSpec 产物 / 代码 | AI 工作姿态和执行方法 |

### OpenSpec：变更的“事实账本”

OpenSpec 回答的是：

- 这次变更叫什么？
- 为什么要做？
- 要改哪些行为？
- 设计方案是什么？
- 任务拆成哪些步骤？
- 哪些任务完成了？
- 变更最终归档到哪里？

在本模板中，每个需求级变更都落在：

```text
openspec/changes/<change-name>/
├── proposal.md
├── design.md
├── specs/<feature>/spec.md
└── tasks.md
```

这些文件是 AI 失忆后的恢复点，也是团队审计、回滚、复盘的依据。换句话说，OpenSpec 不负责“怎么思考”，它负责把思考结果和执行状态稳定地写到磁盘。

### mattpocock/skills：AI 的“阶段姿态”

mattpocock/skills 回答的是：

- 现在应该探索，还是拆解，还是执行？
- AI 能不能直接写代码？
- 什么时候应该多问？
- 什么时候应该按任务清单自主推进？
- 当前阶段应该产出什么？

本模板用到的六个技能：

| 阶段 | 技能 | AI 应该做什么 | 不应该做什么 |
|------|------|---------------|--------------|
| 设计 | `grill-me`（可选） | 澄清需求、比较方案、写 proposal/design/specs | 不直接写业务代码 |
| 拆解 | （直接编写） | 把设计拆成可勾选的 `tasks.md`（含 Hardness Check） | 不直接写业务代码 |
| 执行 | `implement` | 严格按 `tasks.md` 实现、测试、更新任务状态 | 不静默偏离任务清单 |
| 执行 | `tdd` | 核心逻辑走红绿重构 | 不先写实现再补测试 |
| 调试 | `diagnose` | 系统化定位 bug 根因 | 不盲目试改 |
| 收尾 | `code-review` | 归档前自查实现与规格的一致性 | 不走完就归档 |

mattpocock/skills 更像“驾驶模式”：同一个 AI，在 `grill-me` 时要多问和权衡，在 `implement` 时要少问并推进到底。

### 两者如何配合

完整关系是：

```text
OpenSpec 创建变更目录
        ↓
设计对话（可配合 grill-me）生成 proposal / design / specs
        ↓
任务拆解生成 tasks.md（含 Hardness Check）
        ↓
implement（核心逻辑配合 tdd）按 tasks.md 写代码并逐项勾选
        ↓
code-review 自查 → OpenSpec archive 归档完整变更记录
```

一句话：

- **OpenSpec 管“变更产物和生命周期”**
- **mattpocock/skills 管“AI 在每个阶段怎么工作”**

如果没有 OpenSpec，AI 的思考和执行容易散落在聊天上下文里；如果没有技能约束，AI 容易在还没想清楚时直接写代码，或在执行阶段反复回到讨论。

---

## Hardness：少而硬的生产级底线

`spec/hardness.md` 是所有变更默认遵守的 constitution。它只保留五条底线：

1. **Boundary**：说清改哪个模块，不跨模块偷调内部实现
2. **Failure**：错误、超时、重试 / 不可重试有处理
3. **Verification**：核心路径有测试，bugfix 有回归验证
4. **Observability**：关键行为可排查，日志不泄露敏感信息
5. **Rollback**：涉及数据 / 配置 / 发布 / 外部依赖时说明回滚

每个变更先选复杂度：

| 等级 | 适用场景 | 流程 |
|------|----------|------|
| S | 文档、测试、本地修复、单模块小改动 | 轻流程：`tasks.md` 有 Hardness Check；`design.md` 可选 |
| M | 单模块新行为或一个公开接口变化 | 标准 OpenSpec：proposal / design / specs / tasks |
| L | 跨模块、数据模型、新依赖、安全鉴权、异步任务、发布风险 | 先架构讨论；`design.md` 必须写取舍与回滚 |

可复制样例在 `examples/`。归档前运行统一检查：

```powershell
.\validation\validate-template.cmd
```

---

## UI 设计规范：只在前端任务加载

`frontend/design.md` 是前端界面的一致性规范，按 DESIGN.md 风格组织。只有任务涉及页面、组件、交互、样式、表单或视觉呈现时才加载；纯后端、数据、部署、脚本任务不用读。

它包含九个部分：

1. Visual Theme & Atmosphere
2. Color Palette & Roles
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Depth & Elevation
7. Do's and Don'ts
8. Responsive Behavior
9. Agent Prompt Guide

UI 变更的 `tasks.md` 必须包含 `## UI Check`，可从 `examples/standard-ui-change/tasks.md` 复制。

> **⚠️ UI 校验的误判豁免**：归档前的 `validate-ui.ps1` 靠关键词给变更分类。反引号包裹的路径/目录引用（如 `` `examples/standard-ui-change` ``）已被剥离、不参与分类；若变更正文仍不可避免出现 UI 关键词而本身**不是**前端界面变更（如修复 UI 校验器、讨论 UI 规范文档），可在 `tasks.md` 任意位置加一行 `<!-- not-ui: 原因 -->` 跳过该校验。**仅限非界面变更使用**——真界面变更滥用此标记等于绕过 UI Check。

---

## 快速开始

### 1. 使用本模板

**方式 A：GitHub「Use this template」** — 推荐，创建一个干净的新仓库

**方式 B：Clone 后去掉历史**

```bash
git clone https://github.com/chencore/speccoding-template my-project
cd my-project
rm -rf .git
git init && git add -A && git commit -m "chore: bootstrap from SpecCoding template"
```

### 2. 安装前置工具

```bash
# OpenSpec 中文版（核心规格管理工具）
npm install -g @studyzy/openspec-cn@latest

# Claude Code
npm install -g @anthropic-ai/claude-code

# mattpocock/skills（设计澄清、执行、TDD、调试、自查等技能）
# 在本项目根目录逐个安装（装到 .claude/skills/，随仓库共享）：
npx skills@latest add mattpocock/skills/grill-me      # 设计/需求澄清：AI 反过来追问你
npx skills@latest add mattpocock/skills/implement     # 执行：按 tasks.md 逐项推进
npx skills@latest add mattpocock/skills/tdd           # 核心逻辑：红绿重构
npx skills@latest add mattpocock/skills/diagnose      # 调试：系统化定位 bug 根因
npx skills@latest add mattpocock/skills/code-review   # 收尾：归档前自查
npx skills@latest add mattpocock/skills/caveman       # 可选：压缩 AI 输出，执行阶段降噪
```

### 3. 运行最小纵切样例

模板内置一个无外部依赖的最小可运行纵切，用来验证“前端界面 → 后端 API → 领域逻辑 → 测试 → 模板校验”这条链路。

#### 3.1 样例目录结构

```text
.
├── package.json
├── backend/
│   ├── server.js       # Node HTTP server：静态前端 + API
│   ├── tasks.js        # 任务领域逻辑
│   └── tasks.test.js   # Node 内置测试
└── frontend/
    ├── index.html      # 页面入口
    ├── app.js          # 前端交互和 API 调用
    ├── styles.css      # 样例样式，遵守 frontend/design.md
    └── design.md       # UI 设计规范，仅前端界面任务加载
```

接口和页面：

- 页面入口：`GET /`
- 健康检查：`GET /api/health`
- 任务列表：`GET /api/tasks`
- 创建任务：`POST /api/tasks`
- 切换状态：`POST /api/tasks/:id/toggle`

#### 3.2 编译 / 安装

当前样例只使用 Node.js 内置模块，没有第三方依赖，不需要 `npm install`，也没有构建步骤。

要求：

- Node.js 18+（需要内置 `node:test` 和 `fetch`）

#### 3.3 测试与模板验证

```bash
npm test
npm run validate
```

其中：

- `npm test`：运行 `backend/tasks.test.js`
- `npm run validate`：运行 `validation/validate-template.cmd`，检查 Hardness / UI 规则

#### 3.4 启动运行

```bash
npm start
```

如果 PowerShell 提示 `npm.ps1` 被执行策略禁止，改用：

```powershell
npm.cmd test
npm.cmd run validate
npm.cmd start
```

启动后打开：

```text
http://localhost:3000
```

也可以直接检查 API：

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/tasks
```

这个样例只用于证明模板流程可跑通，不规定你真实项目必须使用 Node 或这个目录结构。

### 4. 版本 kickoff（Phase 0）

每个版本启动一次。**先开版本分支，再让 AI 进入讨论阶段**——不要让 AI 一上来就动 spec 文件。

```bash
# 从 main 拉版本分支（命名必须为 version/v<semver>）
git checkout main && git pull
git checkout -b version/v0.1
```

然后在 Claude Code 中触发 kickoff：

> "开始做 v0.1 版本的 kickoff"

AI 会按 CLAUDE.md 里的「维护节奏」执行：

1. **前置检查**：读分支版本号、读 `git config --get user.initials` 拿你的缩写、提醒先 `git pull`
2. **多轮讨论澄清**：把本次要写入的需求边界一条条聊清楚（可配合 `grill-me`），未确认前不动任何 spec 文档
3. **本地化 confirm**：AI 汇总"新增 X 条 / 修订 Y 条 / 架构是否动"，等你说"确认"
4. **批量写入** `requirements.md` / `tasks.md` /（必要时）`design.md` / `devlog.md`，每条需求带版本标签 `[v0.1 新增]` 与唯一 ID `R-v0.1-<缩写>-<序号>`，修订老需求时旧条目保留并标"已由 X 取代"

> 💡 在 `main` 等非版本分支上触发 kickoff 时，AI 会降级为"无版本"模式（用日期作标签）。完整规则见 `CLAUDE.md` 的「维护节奏 → ① 版本 kickoff」。

### 5. 单任务开发循环（Phase 1~N）

版本分支下每个 task 走一次完整七阶段工作流。**feature 分支从当前所在分支拉出**（通常是版本分支），合并时回到**它被拉出时的那条分支**——所以创建时必须显式记下父分支：

#### 5.1 先判断复杂度

创建 OpenSpec 变更后，先按 `spec/hardness.md` 选择复杂度等级。等级决定流程轻重：

| 等级 | 典型场景 | 怎么操作 |
|------|----------|----------|
| S | 文档、测试、本地修复、单模块小改动、不新增契约 | 轻流程：可以只写 `tasks.md`，但必须包含 `Hardness Check`；如果涉及 UI，再加 `UI Check` |
| M | 单模块新行为、一个公开接口变化、普通页面/组件 | 标准流程：写 proposal / design / specs / tasks，再执行、自查、归档 |
| L | 跨模块、数据模型、新依赖、安全鉴权、异步任务、发布风险、跨页面 UI 流程 | 先讨论架构或 UI 方案；`design.md` 必须写取舍、边界、失败处理和回滚，再继续执行 |

不确定时按更高等级处理。

#### 5.2 S 级：轻流程

适合小改动，但仍要保留可审计记录：

```bash
parent=$(git rev-parse --abbrev-ref HEAD)
git checkout -b feature/fix-small-thing
git config branch.feature/fix-small-thing.parent "$parent"

openspec-cn new change "fix-small-thing"
```

然后只补最小必要产出物：

- `openspec/changes/fix-small-thing/tasks.md`
- 必须包含 `## Hardness Check`
- 如果是前端界面小改动，先读 `frontend/design.md`，并加 `## UI Check`

随后直接执行、验证、归档（按 `tasks.md` 逐项推进，可用 `implement` 技能驱动）：

```bash
# code-review 自查
.\validation\validate-template.cmd
/opsx:archive
```

#### 5.3 M 级：标准流程

这是默认路径，适合大多数业务功能：

```bash
parent=$(git rev-parse --abbrev-ref HEAD)
git checkout -b feature/add-user-auth
git config branch.feature/add-user-auth.parent "$parent"

openspec-cn new change "add-user-auth"
# 设计对话（可配合 grill-me）→ 写 proposal/design/specs
# 任务拆解 → 写 tasks.md（含 Hardness Check）
# 执行：implement（核心逻辑配合 tdd）按 tasks.md 推进
.\validation\validate-template.cmd
# code-review 自查
/opsx:archive
```

要求：

- `proposal.md` 说明做什么和为什么
- `design.md` 说明怎么做、边界和取舍
- `specs/<feature>/spec.md` 写场景式规格
- `tasks.md` 包含 `Hardness Check`
- UI 变更额外读取 `frontend/design.md` 并包含 `UI Check`

#### 5.4 L 级：先架构讨论

只要命中跨模块、数据模型、新依赖、安全鉴权、异步任务、发布风险，或跨页面 UI 流程，就不要直接进入执行。

先做：

```bash
openspec-cn new change "<name>"
# 架构讨论（可配合 grill-me）
```

在 `openspec/changes/<name>/design.md` 里写清：

- 模块边界和跨模块交互
- 新增依赖或数据模型变化
- 失败模式、超时、重试、幂等
- 发布、灰度、回滚路径
- 如果是 UI：复用/新增的页面模式、响应式策略、截图验证方式

确认方案后再进入：

```bash
# 任务拆解 → 写 tasks.md
# 执行：implement（核心逻辑配合 tdd）
.\validation\validate-template.cmd
# code-review 自查
/opsx:archive
```

L 级变更如果实现过程中发现方案不成立，停下来更新 `design.md`，不要在代码里静默偏离。

#### 5.5 通用命令示例

```bash
# 1. 创建特性分支 + 显式记录父分支
parent=$(git rev-parse --abbrev-ref HEAD)
git checkout -b feature/add-user-auth
git config branch.feature/add-user-auth.parent "$parent"

# 2. 脚手架
openspec-cn new change "add-user-auth"

# 3. 设计对话 —— 多轮问答澄清需求与方案（可配合 grill-me 技能）
# → 产出 proposal.md / design.md / specs/ 写入 openspec/changes/add-user-auth/

# 4. 任务拆解
# → 把确认后的设计拆成可勾选的 tasks.md（含 Hardness Check）
#   落点为 openspec/changes/add-user-auth/tasks.md

# 5. 执行 —— 使用 implement 技能，核心逻辑配合 tdd
# → 严格按 openspec/changes/add-user-auth/tasks.md 逐项推进、逐项勾选

# 6. 自查归档（在合并回父分支前完成）
# → 先用 code-review 技能自查实现与规格的一致性
.\validation\validate-template.cmd
/opsx:archive
# → 整个 add-user-auth/ 目录移入 openspec/changes/archive/
# → AI 会扫 design.md，若含跨模块影响 / 新依赖 / 数据模型变更，
#   会请你确认是否提升到 spec/design.md（点头才写）

# 7. 合并回父分支（不一定是 main）
parent=$(git config --get branch.$(git rev-parse --abbrev-ref HEAD).parent)
git checkout "$parent"
git merge feature/add-user-auth
git branch -d feature/add-user-auth
```

完成后 `spec/tasks.md` 对应 task 由 AI 自动勾选 ✅，`spec/devlog.md` 自动追加一条记录（注明父分支名）。

> ⚠️ **手工创建过、没记父分支**的 feature 分支：AI 在第 7 步读不到 `branch.*.parent` 配置时会向你确认目标分支，**不会**靠 reflog / merge-base 自行猜。
>
> ⚠️ **版本分支 → `main` 的合并**由人工处理；AI 默认不碰 `main`，除非你显式要求。

> **⚠️ 产出物归属铁律**：单次变更的所有产出物（proposal / design / specs / tasks）必须统一放在 `openspec/changes/<name>/` 下，**不可散落**。这是"一键归档、可审计、可回滚"的前提。

---

## 已有项目迁移到本工作流

如果是已有的大型项目，**不需要整体重构或迁移业务代码**，把这套工作流作为"增量治理层"叠加进去即可。

### 迁移原则

| 不要这样做 | 要这样做 |
|-----------|---------|
| 把老代码按模板目录重新摆放 | 在仓库根目录补工作流骨架 |
| 给所有历史功能补 OpenSpec | 只对新变更走 OpenSpec 流程 |
| 要求老代码立即满足 Hardness 全部条款 | 让每个新变更自带 Hardness Check |
| 强制替换现有分支策略 | 把 `version/v*` + `feature/*` 映射到现有流程 |

### 第一步：叠加工作流骨架

在仓库根目录新增这些文件/目录（不改动现有业务代码）：

```text
spec/
  requirements.md   # 累积式整体需求
  design.md         # 现有架构兜底说明
  tasks.md          # 按版本分块的任务清单
  hardness.md       # 生产级底线（直接复制模板）
  devlog.md         # 开发日志
  structure.md      # 目录结构说明
openspec/
  changes/          # 单次变更产出物
examples/           # 标准样例
validation/         # 归档前验证脚本
CLAUDE.md           # 项目协作约定
AGENTS.md           # Agent 规则
```

### 第二步：把现状写进项目级 spec

第一次只做"让 AI 读懂项目"，不改代码：

- `spec/structure.md`：列出已有顶层目录、模块职责、关键入口
- `spec/design.md`：用现有系统的语言写清**当前架构**（模块边界、数据流、外部依赖），不是设计新架构
- `spec/requirements.md`：把已上线/已确认的核心需求用 `[v0.0 基线]` 标签归档，作为后续变更的基准
- `spec/hardness.md`：直接复制模板，作为所有新变更的默认底线

### 第三步：从下一个变更开始走 OpenSpec

老代码保持原样，所有**新需求、重构、bugfix**都按七阶段工作流执行：

```bash
parent=$(git rev-parse --abbrev-ref HEAD)
git checkout -b feature/<name>
git config branch.feature/<name>.parent "$parent"

openspec-cn new change "<name>"
# 设计对话（可配合 grill-me）→ 任务拆解 → implement/tdd 执行
.\validation\validate-template.cmd
# code-review 自查
/opsx:archive
```

### 第四步：按项目现状裁剪分支模型

| 现有流程 | 映射方式 |
|---------|---------|
| 已有 release 分支 | 把 `version/v*` 当作 release 分支使用 |
| 直接从 main 发版 | feature 从 main 拉出，合回 main |
| 使用 Jira/TAPD 等版本概念 | 每个版本对应一个 `version/v<semver>` 分支 |

关键规则保留：每个 feature 分支必须显式记录父分支：

```bash
git config branch.feature/<name>.parent <parent>
```

### 第五步：复杂度自适应

大型项目里不要所有变更都走全套：

| 等级 | 用法 |
|------|------|
| S | 文档、单测、局部修复：只写 `tasks.md` + `Hardness Check` |
| M | 单模块接口/行为变更：标准 OpenSpec 四件套 |
| L | 跨模块、数据模型、新依赖、安全鉴权：先架构讨论，`design.md` 必须写取舍与回滚 |

### 第六步：把 Hardness 当作变更门槛

不要求老代码全部满足 `spec/hardness.md`，但**每个新变更的 `tasks.md` 必须包含 `## Hardness Check`**，覆盖边界、失败处理、验证、可观测性、回滚。老代码会随着每次变更被侵蚀式改进。

### 大型项目额外注意点

- **spec 可以按域拆分**：如果项目很大，可以在 `spec/` 下按业务域再分，比如 `spec/core/`、`spec/billing/`，但变更级产出仍集中在 `openspec/changes/<name>/`
- **openspec 变更粒度要小**：一个变更只交付一个可验证行为，不要把大重构塞成一个变更
- **先跑通一个最小变更**：先用一个真实的 S/M 级需求走完整流，验证分支策略、CI、归档脚本都能跑通，再推广到团队

### 一句话总结

**老代码不动，新变更听话**——把 `spec/`、`openspec/`、分支规则、`Hardness Check` 嫁接到现有仓库，让增量开发按这个流程走，老系统自然逐步被规范覆盖。

---

## 目录结构

```
.
├── CLAUDE.md              # Claude Code 工作指引（重要，勿删）
├── README.md              # 本文件
├── .gitignore             # 全栈通用 ignore
│
├── spec/                  # 【项目级】spec 文档（人工主导）
│   ├── requirements.md    #   整体需求
│   ├── design.md          #   整体架构与设计
│   ├── tasks.md           #   里程碑级任务清单
│   ├── hardness.md        #   生产级代码底线
│   ├── devlog.md          #   开发日志（AI 自动维护）
│   └── structure.md       #   目录结构说明
│
├── openspec/              # 【需求级】单次变更 spec
│   ├── config.yaml        #   OpenSpec 配置
│   ├── changes/
│   │   └── archive/       #   已完成的变更归档
│   └── specs/             #   单独提炼的长期规格
│
├── examples/              # Agent 可复制的标准样例
├── validation/            # 轻量验证脚本
│
├── .claude/               # Claude Code 配置、命令与技能
│   ├── commands/opsx/     #   /opsx:apply /opsx:archive 等斜杠命令
│   └── skills/            #   OpenSpec 相关技能
│
├── .codebuddy/            # CodeBuddy 配置（若使用 CodeBuddy 国际版）
│
├── backend/               # 最小纵切后端样例
│   ├── server.js          # Node HTTP server + API
│   ├── tasks.js           # 任务领域逻辑
│   └── tasks.test.js      # 单元测试
├── frontend/              # 最小纵切前端样例
│   ├── index.html         # 页面入口
│   ├── app.js             # 前端交互
│   ├── styles.css         # 样例样式
│   └── design.md          # UI 设计规范（仅前端界面任务加载）
└── prototype/             # 原型设计（待填）
```

---

## 核心原则

### 1. Spec 必须分两级

| 层级 | 位置 | 回答的问题 | 变更频率 |
|------|------|-----------|---------|
| 项目级 | `spec/` | "我们做什么产品、为什么做" | 低频，人工主导 |
| 需求级 | `openspec/changes/<name>/` | "这次变更做什么、怎么做" | 高频，AI 产出 |

**混在一起是灾难的开始**——单次变更细节会污染全局设计，全局决策会被埋在 PR 里。

### 2. 谁写谁改 / 何时写

项目级 spec 仅在 **版本 kickoff** 与 **openspec 归档** 两个边界上同步。变更开发过程中不动；openspec 变更内部的产出物可自由书写，不污染项目级文档。

| 文档 | AI 何时可动 |
|------|------------|
| `spec/requirements.md` | ✅ 仅版本 kickoff 时由人工触发后批量写入（带版本标签 + R-ID） |
| `spec/design.md` | ✅ kickoff 涉及新架构决策时；归档时检测到跨模块影响 / 新依赖 / 数据模型变更，**人工点头**后才提升 |
| `spec/tasks.md` 内容 | ✅ 仅 kickoff 时按版本块追加（不得改他人已写的 tasks） |
| `spec/tasks.md` 状态 | ✅ openspec 归档后自动勾选 ✅ |
| `spec/devlog.md` | ✅ kickoff 写入摘要 + feature 合回父分支时追加 |
| `spec/structure.md` | ✅ 添加或删除顶层目录时即时更新 |
| `openspec/changes/*` | ✅ 工作流中由设计对话 / 任务拆解 / 执行阶段自动生成 |

### 3. 物理上分开"思考 / 拆解 / 执行"

- **设计对话** 只产出设计文档（proposal / design / specs），**不碰代码**
- **任务拆解** 只产出 `tasks.md`（含 Hardness Check），**不碰代码**
- **执行** 才动代码，而且必须严格按 `tasks.md` 逐项推进

这是对抗 AI 失忆的物理防线——即使某一步 AI 上下文全丢，下一步也能从磁盘上的 spec 文档重新加载继续。

### 4. 单次变更产出物归一

所有单次变更产出物必须统一放在 `openspec/changes/<name>/` 下：

```
openspec/changes/add-user-auth/
├── proposal.md        ← 设计对话产出
├── design.md          ← 设计对话产出
├── specs/auth/spec.md ← 设计对话产出
└── tasks.md           ← 任务拆解产出，贯穿执行阶段的任务清单
```

不要让任何变更产出物散落到仓库根、`docs/`、`.claude/` 或任何其他位置——**归档 / 审计 / 回滚**都依赖这个归一原则。

### 5. Hardness Check 必须存在

每个 `openspec/changes/<name>/tasks.md` 必须包含：

```markdown
## Hardness Check

- [ ] Complexity level selected: S / M / L
- [ ] Boundary is clear; no cross-module internal access
- [ ] Failure behavior is handled or explicitly not applicable
- [ ] Core path and important failure path are verified
- [ ] Logs/metrics cover important behavior without leaking sensitive data
- [ ] Rollback path is documented, or not applicable with reason
```

这不是重流程，而是归档前的最低生产线。可从 `examples/standard-change/tasks.md` 复制。

### 6. UI Check 只在前端界面变更中存在

如果变更涉及页面、组件、交互、样式、表单或前端视觉，`openspec/changes/<name>/tasks.md` 还必须包含：

```markdown
## UI Check

- [ ] UI complexity level selected: S / M / L
- [ ] Existing pattern/component is reused, or new pattern is documented
- [ ] Visual values use tokens or established style variables
- [ ] Required states are covered: loading / empty / error / disabled
- [ ] Keyboard access and accessible names are handled
- [ ] Screenshot or visual verification is provided, or not applicable with reason
```

纯后端、数据、部署、脚本、普通文档任务不要添加 UI Check，也不要加载 `frontend/design.md`。

### 7. 归档前统一验证

归档前运行：

```powershell
.\validation\validate-template.cmd
```

该命令会依次执行：

- `validate-hardness.cmd`：检查 active OpenSpec change 是否包含 Hardness Check
- `validate-ui.cmd`：仅对 active UI change 检查 UI Check，并确认 `frontend/design.md` 存在

---

## 样例：照着抄就行

`examples/` 提供 Agent 可复制的最小样例：

- `examples/standard-change/tasks.md` — 通用变更任务模板，包含 Hardness Check
- `examples/standard-change/design.md` — M/L 变更的轻量设计模板
- `examples/standard-ui-change/tasks.md` — UI 变更任务模板，包含 UI Check + Hardness Check
- `examples/standard-ui-change/design.md` — UI 变更设计模板
- `examples/standard-module/README.md` — 模块边界样例

新手第一次用，直接照着这个结构填就行。

---


## License

MIT
