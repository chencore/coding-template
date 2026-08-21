# doc-deploy-backend：后端部署文档

## 背景

cang-knowledge-base 归档后，App 要装到真机内测，服务端必须从开发机搬到云上。
当前无任何部署资产：`docker-compose.yml` 只起数据库，后端靠本地 `tsx watch`。

## 本次做什么

写一份**可照着执行**的部署文档 `docs/deploy-backend.md`：单台 VPS（香港/国内皆可）跑全栈——
Postgres（现有 compose）+ NestJS 后端（node 直跑，pm2 守护）+ Caddy 自动 HTTPS。

文档必须忠于代码现状（已逐一核实）：

- 迁移在应用启动时自动执行（`Migrator.onModuleInit`，失败即启动失败）
- 全局前缀 `api`；健康检查 `GET /api/health` / `GET /api/health/llm`
- 环境变量：`PORT`、`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`、`ARK_API_KEY/ARK_MODEL_ID/ARK_BASE_URL`；配置来源为仓库根 `.env`（`ConfigModule.envFilePath: ["../.env", ".env"]`）
- 现有 compose 把 5432 绑到所有网卡——文档必须覆盖 VPS 上的收口（绑定 127.0.0.1 或防火墙）

## 明确不做（Out of Scope）

- 不写 backend Dockerfile / 不改 compose / 不加 CI 部署（用户选择「只要部署文档」）
- 不实际操作任何云资源；域名用占位符 `api.example.com`
- 备案、算法合规等正式上架事项（仅一节提醒，不展开）

## 验收

- 文档步骤按序可执行：买 VPS → 装 docker → 起 db → 起后端 → Caddy HTTPS → 真机打包验证
- 每一步有验证命令（curl 预期响应）
- 含安全清单（5432 收口、.env 权限、防火墙只开 22/80/443）与运维节（备份、更新流程、回滚）
