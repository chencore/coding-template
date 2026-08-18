# Development Log

> **维护规则**：每次 PR 合并后，由 AI 自动追加一条记录。
>
> 每条记录应包含：日期、变更名、摘要、关键决策/坑点。

---

## Entry Template

```markdown
### YYYY-MM-DD · <change-name>

**摘要**：一句话说清楚这次变更做了什么。

**关键决策**：
- 决策点 1 — 选了什么、放弃了什么、为什么
- 决策点 2 — ...

**踩坑 / 经验**：
- 坑点描述 + 如何解决（可选）

**相关产出**：
- 归档位置：`openspec/changes/archive/<change-name>/`
- PR：#xxx（如适用）
```

---

## Log Entries

<!-- 最新条目在最上面 -->

### 2026-08-18 · bootstrap-app-scaffold（父分支：version/v1.0）

**摘要**：照见全栈骨架落地——NestJS 后端（/api/health db 探针 + /api/health/llm 火山方舟三态探针）、Flutter 前端（iOS+Android 工程、健康状态启动页）、docker-compose 本地 postgres:16+pgvector、GitHub Actions 双 job CI。spec 场景 1~11 全部实跑验证通过（场景 8 经 Android 模拟器，Xcode 未装）。

**关键决策**：
- 模板示例代码（server.js/tasks.js/app.js 等）删除，README 第 3 节改写为真实项目本地开发指引
- 执行期修正×3：①Docker Hub/容器 apt 网络受阻→本地构建 pgvector 镜像（宿主机代理 build-arg）②Xcode 缺失→开放 Android 平台作开发验证目标（首发仍仅 iOS）③LLM 实际用方舟 Coding Plan（base URL `.../api/coding/v1`，model 填模型名）

**踩坑 / 经验**：
- tsx/esbuild 不保证 emitDecoratorMetadata，NestJS 按类型注入静默失效——**约定：所有构造器注入显式 @Inject()**
- vitest 两坑：mock 工厂里 class+参数属性、mockResolvedValue 后 mockReset 再 reject，都会把已 catch 的 rejection 误报 unhandled——用 vi.fn() 构造器 + Once 变体
- macOS 无 pwsh/cmd，validate-template 用 python 等价复刻校验（hardness + ui 均通过）

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-18-bootstrap-app-scaffold/`
- CI run：32099389370（backend/frontend 均 success）
- 遗留：iOS 模拟器验证待 Xcode 安装后补；validate-template 的 macOS 原生支持可另开变更

### 2026-08-17 · 版本 v1.0 首次 kickoff · 由 CK 追加：新增 R-v1.0-CK-1~12

**摘要**：基于 `docs/照见-PRD-v1.md` 完成项目首次 kickoff——`spec/requirements.md` 写入 12 条 Must Have 需求（含非目标/Future/成功标准），`spec/tasks.md` 拆出 M1~M4 共 15 条任务，`spec/design.md` 初始化架构方向。

**关键决策**：
- 跨端框架（Flutter/RN 待定）但仅 iOS 首发——拦截等 iOS 能力仍需原生模块，审核风险在 M3 早验证
- 国内大模型路线——可直连、合规低、成本可承受
- 镜子时刻 V1 文字先行，语音（ASR）后置
- 拦截「只打断不阻止」，写入非目标防范围蔓延

**相关产出**：
- 版本分支：`version/v1.0`（本地，未推远程）
- 需求 ID 段：R-v1.0-CK-1 ~ R-v1.0-CK-12

### 2026-07-30 · fix-ui-validation-fp（父分支：main）

**摘要**：修复 `validate-ui.ps1` 对非界面变更的关键词误判——关键词扫描前剥离反引号行内代码（路径/目录引用不参与分类），并新增显式豁免标记 `<!-- not-ui: 原因 -->`。

**关键决策**：
- 两刀并施：反引号剥离解决"引用 `standard-ui-change` 目录名"类误报；`not-ui` 豁免标记解决"正文不可避免含 UI 关键词但非界面变更"（如修 UI 校验器本身）
- 豁免标记是显式契约，在 CLAUDE.md/AGENTS.md/README.md/examples 同步记录，并警示"真界面变更滥用等于绕过 UI Check"

**踩坑 / 经验**：
- 回归夹具用 bash heredoc 写中文致编码乱码、关键词匹配假阴性，改用 PowerShell `WriteAllText`（UTF-8 无 BOM）后真 UI 缺 Check 的场景正确失败——测试夹具编码是被测逻辑成立的前提
- 三个回归场景（反引号引用通过 / 豁免生效 / 真 UI 缺 Check 仍失败）确认不误伤正常校验

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-07-30-fix-ui-validation-fp/`
- 闭环了 2026-07-23 doc-task-decomposition-guide 条目预告的 validate-ui 修复

### 2026-07-23 · doc-task-decomposition-guide（父分支：main）

**摘要**：为「任务拆解」阶段补齐编写指引——CLAUDE.md/AGENTS.md 新增「任务拆解规则」六条小节，工作流.mdc 补内联速记，examples 两个 tasks.md 骨架补规则指针。

**关键决策**：
- 规则沉淀在 CLAUDE.md 一处，examples 骨架只放指针，避免多处维护漂移
- 工作流.mdc 用内联速记而非指针——它是独立精简版，引用 CLAUDE.md 会制造耦合

**踩坑 / 经验**：
- 执行期发现 tasks.md 与实现偏差（mdc 指针→速记），按规则 6"执行期可修正"停下来改 tasks.md 再继续——该机制首次实战验证有效
- **发现 validate-ui.ps1 误报 bug**：变更目录内文本引用 `standard-ui-change` 时，`ui` 被 `\b(ui|...)\b` 关键词命中，非 UI 变更被误判。待另开变更修复

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-07-23-doc-task-decomposition-guide/`

### 2026-04-16 · bootstrap-speccoding-template

**摘要**：从 SpecCoding Template 初始化项目骨架。

**关键决策**：
- 采用「两级 Spec 体系」：`spec/` 管全局、`openspec/` 管单次变更
- 开发工作流固化为七阶段：git branch → scaffold → brainstorm → plan → execute → archive → merge

**相关产出**：
- 项目级 spec 文档骨架（requirements / design / tasks / devlog / structure）
- OpenSpec 配置 + 示例归档变更 `example-add-user-auth`
