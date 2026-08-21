# 照见后端部署手册

> 目标：单台 VPS 跑起全栈（Postgres + NestJS + Caddy HTTPS），App 真机可连。
> 读法：按顺序执行，每一步末尾有**验证命令**，通过再进下一步。
> 占位符：`api.example.com` = 你的域名；`<VPS_IP>` = 服务器公网 IP。

## 0. 架构总览

```
手机 App ──HTTPS──▶ Caddy（443，自动证书）
                       │ reverse_proxy 127.0.0.1:3000
                       ▼
                    NestJS 后端（node dist/main.js，pm2 守护）
                       │ 启动时自动跑 migrations/*.sql
                       ▼
                    Postgres 16 + pgvector（docker compose，仅监听 127.0.0.1）

后端 ──HTTPS──▶ 火山方舟 LLM（ARK_* 环境变量）
```

一台 1C2G 的 VPS 足够 MVP 内测。香港免备案；国内延迟更低但域名需 ICP 备案。

## 1. 前置准备

| 事项 | 说明 |
|------|------|
| VPS | 香港/国内，Ubuntu 22.04+，≥1C2G，开放安全组 22/80/443 |
| 域名 | 已有域名加一条 **A 记录**：`api.example.com → <VPS_IP>`，等 DNS 生效（`dig +short api.example.com` 能解析到 IP） |
| 火山方舟 | `ARK_API_KEY` 与模型 ID（现用 `glm-5.2`） |
| 本地 | 能 ssh 上 VPS；代码仓库可 clone（私有仓库先配 deploy key） |

## 2. VPS 初始化

```bash
ssh root@<VPS_IP>

# Docker（官方一键脚本，国内 VPS 可用 --mirror Aliyun）
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Node 20+（后端运行时需要；本仓库开发用 v24，生产 ≥20 即可）
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Caddy（HTTPS 反代，自动申请/续期证书）
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

# pm2（后端进程守护：崩溃自启、开机自启、日志切割）
npm install -g pm2

# 防火墙：只开 22/80/443
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

**验证**：`docker version`、`node -v`（≥v20）、`caddy version`、`ufw status` 均正常。

## 3. 拉代码 + 配置

```bash
git clone <仓库地址> /opt/zhaojian && cd /opt/zhaojian
git checkout version/v1.0   # 或你要部署的分支/标签
```

写配置（仓库根目录 `.env`，后端启动时从这里读）：

```bash
cat > /opt/zhaojian/.env <<'EOF'
# 数据库（密码务必改掉，不要用默认值）
DB_USER=zhaojian
DB_PASSWORD=<换一个强密码>
DB_NAME=zhaojian
DB_HOST=127.0.0.1
DB_PORT=5432

# 火山方舟
ARK_API_KEY=<你的 key>
ARK_MODEL_ID=<你的模型 ID>
# ARK_BASE_URL 可不写，默认 https://ark.cn-beijing.volces.com/api/v3

# 后端监听端口（Caddy 反代到这里）
PORT=3000
EOF
chmod 600 /opt/zhaojian/.env
```

**注意**：`.env` 不进 git（已在 .gitignore），只存在于服务器上；换 key = 改文件 + 重启后端。

## 4. 起数据库

仓库自带 `docker-compose.yml` 的 db 服务（postgres:16 + pgvector）。**但它默认把 5432 绑到所有网卡**——在 VPS 上必须先收口，只监听本机：

```bash
cd /opt/zhaojian
sed -i 's/"${DB_PORT:-5432}:5432"/"127.0.0.1:${DB_PORT:-5432}:5432"/' docker-compose.yml
docker compose up -d db
```

**验证**：

```bash
docker compose ps                      # db 状态 healthy
ss -tlnp | grep 5432                   # 必须是 127.0.0.1:5432，不能是 0.0.0.0
```

数据在 docker volume `pgdata` 里，容器删了数据不丢。

## 5. 起后端

```bash
cd /opt/zhaojian/backend
npm ci                  # 严格按 lock 安装
npm run build           # tsc → dist/
npm start               # 先前台试跑一次
```

首次启动会看到：

- `Migrator` 自动按序执行 `migrations/0001~0004`（任一条失败则启动失败，不会半迁移运行）
- `database connection on startup: up`
- `server listening on port 3000`

另开一个 ssh 会话验证，通过后 Ctrl+C 停掉前台进程：

```bash
curl -s 127.0.0.1:3000/api/health       # {"status":"ok","db":"up"}
curl -s 127.0.0.1:3000/api/health/llm   # {"llm":"up",...}（验证方舟 key 通不通）
```

然后用 pm2 常驻：

```bash
cd /opt/zhaojian/backend
pm2 start dist/main.js --name zhaojian-api
pm2 save && pm2 startup   # 按提示执行输出里的 systemctl 命令，实现开机自启
```

**验证**：`pm2 status` 为 online；`curl -s 127.0.0.1:3000/api/health` 返回 ok。

## 6. Caddy HTTPS

```bash
cat > /etc/caddy/Caddyfile <<'EOF'
api.example.com {
    reverse_proxy 127.0.0.1:3000
}
EOF
systemctl reload caddy
```

Caddy 首次收到请求时自动向 Let's Encrypt 申请证书（所以第 1 步的 DNS 必须先生效，且 80/443 已开）。

**验证**（本地 Mac 上跑）：

```bash
curl -s https://api.example.com/api/health      # {"status":"ok","db":"up"}，注意是 https
curl -s https://api.example.com/api/health/llm  # {"llm":"up"}
curl -s -X POST https://api.example.com/api/cang/items \
  -H 'Content-Type: application/json' \
  -d '{"text":"部署验证","sourceType":"manual"}'  # 400 missing_device_id = 中间件活着，路由通了
```

## 7. App 打包（真机连云端）

本地开发机执行：

```bash
cd frontend
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com/api
# 产出：frontend/build/app/outputs/flutter-apk/app-release.apk
```

装到手机 → 打开 → 镜子页能加载出今日问题 = 全链路通。

**排错顺序**（从外往里查）：

1. 手机浏览器开 `https://api.example.com/api/health` —— 不通 = DNS/证书/防火墙问题
2. VPS 上 `curl 127.0.0.1:3000/api/health` —— 不通 = 后端问题，`pm2 logs zhaojian-api`
3. 后端日志报 db —— `docker compose ps` 看 db 是否 healthy
4. LLM 相关功能失败 —— `curl .../api/health/llm` 看三态（up / not_configured / unreachable）

## 8. 安全清单（上线前逐项过）

- [ ] 5432 只绑 127.0.0.1（第 4 步的 sed 已做，`ss -tlnp | grep 5432` 复核）
- [ ] `ufw status` 只放行 22/80/443
- [ ] `.env` 权限 600，DB_PASSWORD 不是默认值 `zhaojian_dev`
- [ ] `.env` 不在 git 里（`git status` 看不到它）
- [ ] ssh 建议改密钥登录并禁用密码登录（内测期可暂缓）
- [ ] 健康检查不泄露敏感信息（`/api/health` 只回 status/db 两字段，已满足）

## 9. 日常运维

**更新版本**（后端代码变了）：

```bash
cd /opt/zhaojian && git pull
cd backend && npm ci && npm run build
pm2 restart zhaojian-api        # 重启时自动跑新迁移（若有）
curl -s 127.0.0.1:3000/api/health
```

**回滚**：`git checkout <上一个 commit>` → `npm run build` → `pm2 restart`。
注意：数据库迁移是**单向**的（无 down 脚本），代码回滚后多余的表/列闲置无害；
若迁移本身出事，用备份恢复（见下）。

**备份**（每天一次 pg_dump，保留 14 天）：

```bash
mkdir -p /opt/backups
cat > /opt/backup-db.sh <<'EOF'
#!/bin/bash
docker exec zhaojian-db pg_dump -U zhaojian zhaojian | gzip > /opt/backups/zhaojian-$(date +%F).sql.gz
find /opt/backups -name 'zhaojian-*.sql.gz' -mtime +14 -delete
EOF
chmod +x /opt/backup-db.sh
(crontab -l 2>/dev/null; echo '17 3 * * * /opt/backup-db.sh') | crontab -
```

恢复：`gunzip -c /opt/backups/zhaojian-YYYY-MM-DD.sql.gz | docker exec -i zhaojian-db psql -U zhaojian zhaojian`

**日志**：

- 后端：`pm2 logs zhaojian-api`（日志不含用户文本，可安全查看）
- Caddy：`journalctl -u caddy`
- DB：`docker logs zhaojian-db`

## 10. 后续扩容路线（现在不用做）

1. 用户量上来：DB 换云 RDS（改 `.env` 的 `DB_HOST` 即可，代码零改动）
2. 需要备案上架：整体迁国内轻量云，步骤与本文档相同
3. 多实例：后端无状态（会话只在 DB），前面挂负载均衡即可水平扩

## 11. 合规提醒（正式上架前）

- 国内上架 + AI 生成内容 → 需算法备案/安全评估（生成式 AI 暂行办法）
- 内测（TestFlight / 蒲公英直发 APK）阶段不受影响
