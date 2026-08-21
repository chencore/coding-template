# Tasks

## 1. 文档

- [x] 1.1 核实代码事实（env 变量、迁移时机、健康检查路由、compose 端口绑定）——已完成于设计阶段
- [x] 1.2 写 `docs/deploy-backend.md`：架构总览 + 前置准备 + 分步部署 + 每步验证 + 安全清单 + 运维（备份/更新/回滚）
- [x] 1.3 自查：文档中每条命令与代码现状一致（端口、路径、env 名、路由前缀）

## 2. 收尾

- [x] 2.1 `spec/devlog.md` 追加变更记录（注明父分支 version/v1.0）
- [x] 2.2 运行 `validation/validate-template.cmd`（macOS 用 python 等价复刻）并 `/opsx:archive` 归档

## Hardness Check

- [x] Complexity level selected: **S**（纯文档变更，无代码）
- [x] Boundary is clear; no cross-module internal access（只新增 docs/deploy-backend.md，不动代码）
- [x] Failure behavior is handled or explicitly not applicable（不适用——无运行时代码；文档含故障排查节）
- [x] Core path and important failure path are verified（文档中的命令、路由、env 名逐一与源码核对）
- [x] Logs/metrics cover important behavior without leaking sensitive data（不适用；文档要求 .env 不落库、示例不含真实密钥）
- [x] Rollback path is documented（纯新增文档，删除即回滚；文档本身含服务回滚节）
