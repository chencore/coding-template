-- 0001_init.sql
-- 首批业务表：users（匿名设备用户）+ mirror_entries（镜子时刻）+ schema_migrations（迁移记录）
-- 日期口径：entry_date 为 Asia/Shanghai（UTC+8）日历日，应用层计算后写入

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  device_id  VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mirror_entries (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  entry_date      DATE NOT NULL,               -- Asia/Shanghai 日历日
  question        TEXT NOT NULL,
  question_source VARCHAR(8) NOT NULL,          -- 'llm' | 'bank'
  answer          TEXT,                         -- NULL = 未回答
  answered_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, entry_date)
);
CREATE INDEX idx_mirror_entries_user_date ON mirror_entries(user_id, entry_date DESC);
