-- 0002_mentor.sql
-- ai-mentor-core：导师人格配置（users）+ 导师回应（mirror_entries）
-- 纯加列，存量行由 DEFAULT 自动补齐；回滚代码后新列闲置无害

ALTER TABLE users
  ADD COLUMN mentor_name  VARCHAR(32) NOT NULL DEFAULT '默',
  ADD COLUMN mentor_style VARCHAR(16) NOT NULL DEFAULT 'gentle';  -- 'gentle' | 'socratic' | 'companion'

ALTER TABLE mirror_entries
  ADD COLUMN mentor_reply TEXT;  -- NULL = 无导师回应（未回答 / 生成失败）
