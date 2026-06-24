# SpecCoding Template

**基于 Claude Code + OpenSpec + Superpowers 三件套的全栈 AI 开发模板。**

> 让 AI 稳定交付全栈项目——告别"AI 改崩代码 / 失忆 / 跑偏"。

---

## 这是什么

一套**可直接 Clone 即用**的项目骨架，实现文章《让 AI 稳定交付全栈项目》里讲的完整工作流：

- ✅ **两级 Spec 体系**：`spec/` 管项目全局，`openspec/` 管单次变更
- ✅ **两级分支模型**：`version/v*` 承载一批需求，`feature/*` 隔离单次变更
- ✅ **七阶段工作流**：`git branch → scaffold → brainstorm → plan → execute → archive → merge`
- ✅ **协作姿态明确**：方案制定多问 / 列 tradeoff，执行落地尽量自主推进
- ✅ **Hardness 宪法**：用 5 条生产级底线约束所有变更，不堆重流程
- ✅ **UI 设计规范**：`frontend/design.md` 只在前端界面任务加载，保证界面一致性
- ✅ **复杂度自适应**：S/M/L 分级，小改动轻流程，大变更先架构讨论
- ✅ **样例 + 验证**：`examples/` 给 AI 可复制形状，`validation/` 给归档前检查
- ✅ **三工具协同**：Claude Code 执行、OpenSpec 规格、Superpowers 流程
- ✅ **全栈骨架**：预留 backend / frontend / prototype 目录
- ✅ **示例变更**：`openspec/changes/archive/` 里附一个完整示例，可直接照抄

---

## 协作模式：设计靠人决策，执行尽量自主

| 阶段 | 对应工具 | AI 姿态 |
|------|----------|---------|
| **方案制定** | brainstorming、writing-plans、需求澄清、架构决策 | **多问、列 tradeoff、设 checkpoint**——关键判断交给人类 |
| **执行落地** | executing-plans、写代码、跑测试、走 git/openspec 流程 | **尽量自主推进**，方案确认后不要每一步都请示 |

执行阶段只在四种情况下停下来请示：方案与实际冲突、不可逆操作（如 `git push --force` / 改 `main`）、反复尝试同一思路失败、CLAUDE.md 明确要求人工确认的节点（如归档时的 design 提升）。详见 `CLAUDE.md`。

**一句话**：设计前多问，执行中少问。

---

## OpenSpec 与 Superpowers 的区别

OpenSpec 和 Superpowers 不是同一类工具，它们在本模板里负责两件不同的事：

| 工具 | 负责什么 | 产出在哪里 | 本质 |
|------|----------|------------|------|
| **OpenSpec** | 管理单次变更的规格、任务、状态和归档 | `openspec/changes/<name>/` | 磁盘上的变更记录系统 |
| **Superpowers** | 约束 AI 在某个阶段的工作方式 | 对应阶段生成或修改 OpenSpec 产物 / 代码 | AI 工作姿态和执行方法 |

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
├── plan.md
└── tasks.md
```

这些文件是 AI 失忆后的恢复点，也是团队审计、回滚、复盘的依据。换句话说，OpenSpec 不负责“怎么思考”，它负责把思考结果和执行状态稳定地写到磁盘。

### Superpowers：AI 的“阶段姿态”

Superpowers 回答的是：

- 现在应该探索，还是计划，还是执行？
- AI 能不能直接写代码？
- 什么时候应该多问？
- 什么时候应该按计划自主推进？
- 当前阶段应该产出什么？

在本模板中常用三种姿态：

| 阶段 | Superpowers | AI 应该做什么 | 不应该做什么 |
|------|-------------|---------------|--------------|
| 设计 | `/superpowers:brainstorming` | 澄清需求、比较方案、写 proposal/design/specs | 不直接写业务代码 |
| 计划 | `/superpowers:writing-plans` | 把设计拆成可执行计划，写 `plan.md` | 不直接写业务代码 |
| 执行 | `/superpowers:executing-plans` | 严格按 `plan.md` 实现、测试、更新任务状态 | 不静默偏离计划 |

Superpowers 更像“驾驶模式”：同一个 AI，在 brainstorming 时要多问和权衡，在 executing-plans 时要少问并推进到底。

### 两者如何配合

完整关系是：

```text
OpenSpec 创建变更目录
        ↓
Superpowers brainstorming 生成 proposal / design / specs
        ↓
Superpowers writing-plans 生成 plan.md
        ↓
Superpowers executing-plans 按 plan.md 写代码并更新 tasks.md
        ↓
OpenSpec archive 归档完整变更记录
```

一句话：

- **OpenSpec 管“变更产物和生命周期”**
- **Superpowers 管“AI 在每个阶段怎么工作”**

如果没有 OpenSpec，AI 的思考和执行容易散落在聊天上下文里；如果没有 Superpowers，AI 容易在还没想清楚时直接写代码，或在执行阶段反复回到讨论。

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

# Superpowers skills（让 /superpowers:brainstorming 等命令可用）
# 安装方式详见 Superpowers 项目文档
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
2. **多轮讨论澄清**：把本次要写入的需求边界一条条聊清楚（可配合 `/superpowers:brainstorming`），未确认前不动任何 spec 文档
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
| M | 单模块新行为、一个公开接口变化、普通页面/组件 | 标准流程：写 proposal / design / specs / tasks，再 plan / execute / archive |
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

随后直接执行、验证、归档：

```bash
/superpowers:executing-plans
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
/superpowers:brainstorming
/superpowers:writing-plans
/superpowers:executing-plans
.\validation\validate-template.cmd
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
/superpowers:brainstorming
```

在 `openspec/changes/<name>/design.md` 里写清：

- 模块边界和跨模块交互
- 新增依赖或数据模型变化
- 失败模式、超时、重试、幂等
- 发布、灰度、回滚路径
- 如果是 UI：复用/新增的页面模式、响应式策略、截图验证方式

确认方案后再进入：

```bash
/superpowers:writing-plans
/superpowers:executing-plans
.\validation\validate-template.cmd
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

# 3. 设计 —— Claude Code 中运行
/superpowers:brainstorming
# → 产出 proposal.md / design.md / specs/ 写入 openspec/changes/add-user-auth/

# 4. 计划
/superpowers:writing-plans
# → 产出的 plan.md 必须落到 openspec/changes/add-user-auth/plan.md
#   ⚠️ 不要让它散落到仓库根或其他位置

# 5. 执行
/superpowers:executing-plans
# → 严格按 openspec/changes/add-user-auth/plan.md 执行

# 6. 归档（在合并回父分支前完成）
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

> **⚠️ 产出物归属铁律**：单次变更的所有产出物（proposal / design / specs / **plan** / tasks）必须统一放在 `openspec/changes/<name>/` 下，**不可散落**。这是"一键归档、可审计、可回滚"的前提。

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
│   │   └── archive/       #   已完成的变更归档（附示例）
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
| `openspec/changes/*` | ✅ 工作流中由 brainstorming / writing-plans / executing-plans 自动生成 |

### 3. 物理上分开"思考 / 规划 / 执行"

- **brainstorming** 只产出设计文档（proposal / design / specs），**不碰代码**
- **writing-plans** 只产出 `plan.md`，**不碰代码**
- **executing-plans** 才动代码，而且必须严格按 `plan.md` 执行

这是对抗 AI 失忆的物理防线——即使某一步 AI 上下文全丢，下一步也能从磁盘上的 spec 文档重新加载继续。

### 4. 单次变更产出物归一

所有单次变更产出物必须统一放在 `openspec/changes/<name>/` 下：

```
openspec/changes/add-user-auth/
├── proposal.md        ← brainstorming 产出
├── design.md          ← brainstorming 产出
├── specs/auth/spec.md ← brainstorming 产出
├── plan.md            ← writing-plans 产出（⚠️ 必须落这里）
└── tasks.md           ← 贯穿全流程的任务清单
```

不要让 `plan.md` 散落到仓库根、`docs/`、`.claude/` 或任何其他位置——**归档 / 审计 / 回滚**都依赖这个归一原则。

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

`openspec/changes/archive/example-add-user-auth/` 里还存了一个完整示例变更：

- `proposal.md` — 变更提案
- `design.md` — 技术方案
- `specs/auth/spec.md` — 场景式规格
- `plan.md` — writing-plans 生成的详细实现计划
- `tasks.md` — 实现任务清单

新手第一次用，直接照着这个结构填就行。

---


## License

MIT
