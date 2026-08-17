# 基于本地已有的 postgres:16 安装 pgvector——避免拉取 pgvector/pgvector 镜像
#（Docker Hub 在当前网络下不可达）。若网络环境改善，可改回 pgvector/pgvector:pg16。
FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
