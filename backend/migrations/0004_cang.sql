-- 0004_cang.sql
-- cang-knowledge-base：藏（个人知识库）——收藏条目 / 主题 / 条目-主题关联
-- 纯新增表；回滚代码后表闲置无害

CREATE TABLE cang_items (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  text         TEXT NOT NULL,                 -- 收藏内容（trim 后 1~2000 字，应用层校验）
  source_type  VARCHAR(16) NOT NULL,          -- 'mirror_answer' | 'mentor_reply' | 'renwen_reply' | 'manual'
  source_label VARCHAR(64),                   -- 展示用来源标注（客户端写入），NULL = 无
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cang_items_user_time ON cang_items(user_id, created_at DESC);

CREATE TABLE cang_themes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  name       VARCHAR(32) NOT NULL,            -- 主题名（LLM 打标 ≤8 字，应用层校验）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)                       -- upsert 幂等；主题归用户私有
);

CREATE TABLE cang_item_themes (
  item_id  BIGINT NOT NULL REFERENCES cang_items(id) ON DELETE CASCADE,
  theme_id BIGINT NOT NULL REFERENCES cang_themes(id) ON DELETE CASCADE,
  UNIQUE(item_id, theme_id)
);
CREATE INDEX idx_cang_item_themes_theme ON cang_item_themes(theme_id);
