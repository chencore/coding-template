# Tasks: doc-task-decomposition-guide

> 实现任务清单。S 级文档变更，由「任务拆解」阶段在设计确认后直接编写；执行阶段（`implement`）逐项推进、逐项勾选。

## 1. 文档补全

- [x] 1.1 在 `CLAUDE.md`「流程步骤」表格第 4 步补充任务拆解的简要规则指针（实际产出：指针 + 新增「任务拆解规则」完整小节）
- [x] 1.2 在 `AGENTS.md`「流程步骤」表格第 4 步同步相同指针（实际产出：指针 + 镜像小节）
- [x] 1.3 在 `.codebuddy/rules/工作流.mdc` 第 4 步补充规则（执行期修正：采用内联速记而非指针——该文件是独立精简版，引用 CLAUDE.md 会制造耦合；速记与 CLAUDE.md 六条规则一致）
- [x] 1.4 在 `examples/standard-change/tasks.md` 骨架顶部规则说明中补一句，指向 CLAUDE.md 的详细拆解规则（standard-ui-change 同步）

## 2. 收尾

- [x] 2.1 运行 `.\validation\validate-template.cmd` 确认通过（Hardness ✅；UI ❌ 为 validate-ui.ps1 误报——本变更非 UI 变更，但 1.4 条目引用了目录名 `standard-ui-change`，其中 `ui` 被 `\b(ui|...)\b` 词边界命中。**该误报属验证脚本 bug，超出本变更边界，记录于此，归档后另开变更修复**）
- [x] 2.2 code-review 自查实现与规格一致（逐项核对通过；mdc 内联速记偏差已按规则 6 修正并记录）
- [ ] 2.3 `/opsx:archive` 归档本变更

## Hardness Check

- [x] Complexity level selected: S（纯文档变更，不新增公开契约）
- [x] Boundary is clear; no cross-module internal access — 仅改 4 个文档文件，不碰代码 / spec/hardness 架构
- [x] Failure behavior is handled or explicitly not applicable — 文档变更，无运行期失败路径，不适用
- [x] Core path and important failure path are verified — 验证方式为后续 validate-template.cmd + 人工通读一致性
- [x] Logs/metrics cover important behavior without leaking sensitive data — 不适用（无运行期行为）
- [x] Rollback path is documented, or not applicable with reason — `git revert` 单 commit 即可回滚
