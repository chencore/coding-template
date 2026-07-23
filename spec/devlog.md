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
