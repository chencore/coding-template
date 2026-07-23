# Tasks: <ui-change-name>

> 实现任务清单。由「任务拆解」阶段在设计确认后直接编写；执行阶段（`implement`）逐项推进、逐项勾选。
>
> 完整拆解规则见 `CLAUDE.md` 的「任务拆解规则」小节；UI 变更额外要求：
> - 动手前已阅读 `frontend/design.md`
> - 优先复用现有页面/组件模式，新模式需在 design.md 中说明

## 1. 组件 / 页面

- [ ] 1.1 <复用的现有模式或组件，注明来源>
- [ ] 1.2 <实现 UI 变更，使用已有 tokens / 样式变量>
- [ ] 1.3 <覆盖必备状态：loading / empty / error / disabled>

## 2. 交互与响应式

- [ ] 2.1 <键盘可达性与无障碍命名>
- [ ] 2.2 <响应式行为验证（断点列表见 frontend/design.md）>

## 3. 视觉验证

- [ ] 3.1 <截图或可视化验证记录，附在变更目录下>

## 4. 收尾

- [ ] 4.1 `spec/tasks.md` 勾选本变更对应 task
- [ ] 4.2 `spec/devlog.md` 追加变更记录
- [ ] 4.3 运行 `.\validation\validate-template.cmd` 并 `/opsx:archive` 归档

## UI Check

- [ ] UI complexity level selected: S / M / L
- [ ] Existing pattern/component is reused, or new pattern is documented
- [ ] Visual values use tokens or established style variables
- [ ] Required states are covered: loading / empty / error / disabled
- [ ] Keyboard access and accessible names are handled
- [ ] Screenshot or visual verification is provided, or not applicable with reason

## Hardness Check

- [ ] Complexity level selected: S / M / L
- [ ] Boundary is clear; no cross-module internal access
- [ ] Failure behavior is handled or explicitly not applicable
- [ ] Core path and important failure path are verified
- [ ] Logs/metrics cover important behavior without leaking sensitive data
- [ ] Rollback path is documented, or not applicable with reason
