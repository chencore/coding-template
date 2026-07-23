# Tasks: <change-name>

> 实现任务清单。由「任务拆解」阶段在设计确认后直接编写；执行阶段（`implement`）逐项推进、逐项勾选。
>
> 完整拆解规则见 `CLAUDE.md` 的「任务拆解规则」小节。要点：
> - 按**分层/模块**分组（数据层 → 工具类 → 业务服务 → 接口层 → 测试 → 收尾），组内按依赖顺序排列
> - 每条任务 = 一次可独立完成并勾选的动作，能指明落点文件
> - 测试任务**内联**在对应层（配合 `tdd`），集成测试单列一组
> - UI 变更需额外包含 `## UI Check`，格式参考 `examples/standard-ui-change/tasks.md`

## 1. 数据层（如适用）

- [ ] 1.1 <migration / 数据模型变更，注明落点文件>
- [ ] 1.2 <repository / 数据访问方法>
- [ ] 1.3 单测：<本层核心行为>

## 2. 业务服务

- [ ] 2.1 <Service.method(...)：正向路径>
- [ ] 2.2 <Service.method(...)：异常/边界路径>
- [ ] 2.3 单测：<正向 + 异常路径>

## 3. 接口层（如适用）

- [ ] 3.1 <路由 / 公开接口，注明方法与路径>
- [ ] 3.2 <错误响应格式 / 参数校验>

## 4. 集成验证

- [ ] 4.1 <spec.md 场景 1：happy path>
- [ ] 4.2 <spec.md 场景 2~N：异常路径>

## 5. 收尾

- [ ] 5.1 `spec/tasks.md` 勾选本变更对应 task
- [ ] 5.2 `spec/devlog.md` 追加变更记录（归档后由 AI 自动完成亦可）
- [ ] 5.3 运行 `.\validation\validate-template.cmd` 并 `/opsx:archive` 归档

## Hardness Check

- [ ] Complexity level selected: S / M / L
- [ ] Boundary is clear; no cross-module internal access
- [ ] Failure behavior is handled or explicitly not applicable
- [ ] Core path and important failure path are verified
- [ ] Logs/metrics cover important behavior without leaking sensitive data
- [ ] Rollback path is documented, or not applicable with reason
