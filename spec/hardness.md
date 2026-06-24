# Hardness 宪法

> 本文件是每个 OpenSpec 变更默认遵守的生产级底线。保持短、硬、可检查。

## 默认规则

每个变更归档前必须满足五条规则：

1. **Boundary**
   - 说清本次修改哪个模块。
   - 不跨模块访问内部文件、内部表或私有 helper。

2. **Failure**
   - 在错误发生的位置处理可预期错误。
   - 涉及外部调用、任务、IO 或数据库写入时，说明超时、重试、幂等行为。

3. **Verification**
   - 核心行为必须有测试。
   - bugfix 必须包含回归测试；无法添加时写明原因。

4. **Observability**
   - 重要状态变化和失败必须能通过日志或指标排查。
   - 日志不得暴露密钥、token、密码或用户隐私数据。

5. **Rollback**
   - 如果变更涉及 schema、配置、外部依赖或发布行为，必须说明回滚路径。
   - 如果不需要回滚，写明原因。

## 复杂度

每个变更开始时先选择一个复杂度等级：

| 等级 | 适用场景 | 必需流程 |
|-------|----------|---------------|
| S | 本地修复、文档、测试、样式，或不新增契约的单模块代码变更 | `tasks.md` 加 Hardness Check；`design.md` 可选 |
| M | 单模块新增行为，或一个公开接口变化 | 标准 OpenSpec：proposal / design / specs / tasks |
| L | 跨模块行为、数据模型变化、新依赖、安全 / 鉴权变化、异步任务或发布风险 | 先做架构讨论；`design.md` 必须包含取舍和回滚 |

不确定时，选择更高等级。

## 必需任务区块

每个 `openspec/changes/<name>/tasks.md` 必须包含以下区块。

注意：下面这组 checklist 文案被 `validation/validate-hardness.ps1` 用来校验，请保持英文原文。

```markdown
## Hardness Check

- [ ] Complexity level selected: S / M / L
- [ ] Boundary is clear; no cross-module internal access
- [ ] Failure behavior is handled or explicitly not applicable
- [ ] Core path and important failure path are verified
- [ ] Logs/metrics cover important behavior without leaking sensitive data
- [ ] Rollback path is documented, or not applicable with reason
```

## 验证

归档前运行：

```powershell
.\validation\validate-hardness.cmd
```

脚本会检查本文件是否存在，以及 active OpenSpec change 是否包含必需的 Hardness Check。
