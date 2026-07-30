<!-- not-ui: 本变更修复 UI 校验器本身，内容含大量 UI 关键词但非前端界面变更 -->
# Tasks: fix-ui-validation-fp

> 实现任务清单。S 级变更（修验证脚本 bug + 记录豁免契约），由「任务拆解」阶段在设计确认后直接编写；执行阶段逐项推进、逐项勾选。

## 1. 修复 validate-ui.ps1

- [x] 1.1 关键词扫描前剥离反引号行内代码（`...`），路径/目录引用不参与 UI 分类
- [x] 1.2 新增豁免标记：tasks.md 含 `<!-- not-ui: ... -->` 的变更跳过 UI 校验

## 2. 记录豁免契约

- [x] 2.1 `CLAUDE.md`「UI 设计规范」小节补充：非 UI 变更若被关键词误判，可在 tasks.md 加豁免标记
- [x] 2.2 `AGENTS.md` 镜像同步 2.1
- [x] 2.3 `README.md` UI Check 章节补充相同说明
- [x] 2.4 `examples/standard-change/tasks.md` 骨架补一行豁免标记用法注释

## 3. 验证

- [x] 3.1 在临时目录构造回归夹具（不污染 openspec/changes/）：
  - a. 非 UI 变更但反引号引用 `standard-ui-change` → 应通过（剥离反引号生效）✅ 通过
  - b. tasks.md 含 `<!-- not-ui: ... -->` 但正文有 UI 关键词 → 应通过（豁免生效）✅ 通过
  - c. 真正缺少 `## UI Check` 的 UI 变更 → 应仍失败（不误伤正常校验）✅ 失败 exit=1
  - （备注：case c 初测"假通过"系 bash heredoc 写中文编码问题，改用 PowerShell 写 UTF-8 夹具后正确失败）
- [x] 3.2 运行 `.\validation\validate-template.cmd` 确认本变更（含豁免标记）通过

## 4. 收尾

- [x] 4.1 code-review 自查实现与规格一致（diff 干净、豁免/剥离逻辑正确、文档/脚本/examples 一致）
- [ ] 4.2 `spec/devlog.md` 追加变更记录（合并后）
- [ ] 4.3 `/opsx:archive` 归档本变更

## Hardness Check

- [x] Complexity level selected: S（修单一脚本 bug + 文档契约，不新增公开接口）
- [x] Boundary is clear; no cross-module internal access — 仅改 validation/validate-ui.ps1 与文档，不碰其他脚本/代码
- [x] Failure behavior is handled — 豁免逻辑失败时保持现状（校验照跑），不引入静默跳过正常校验的路径（3.3 回归场景覆盖）
- [x] Core path and important failure path are verified — 3.1~3.3 三个回归场景覆盖正/反/豁免三类路径
- [x] Logs/metrics — 不适用（本地校验脚本，无运行期服务）；脚本输出已有通过/失败提示
- [x] Rollback path — `git revert` 单 commit 即可回滚；豁免标记为纯增量，无数据/配置迁移
