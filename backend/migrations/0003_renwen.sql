-- 0003_renwen.sql
-- renwen-mentors：人文导师团召唤记录
-- 纯新增表；回滚代码后表闲置无害

CREATE TABLE renwen_sessions (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id),
  figure       VARCHAR(16) NOT NULL,         -- 'socrates' | 'aurelius' | 'wangyangming' | 'zengguofan'
  confusion    TEXT,                          -- 用户当下困惑，NULL = 留空
  response     TEXT NOT NULL,                 -- 人物视角回应（≤200 字，校验后落库）
  source_id    VARCHAR(32) NOT NULL,          -- canon 条目 id（如 'wym-chuanxilu-1'）
  source_title VARCHAR(64) NOT NULL,          -- 预置篇名（标注用库内值，不信 LLM 输出）
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_renwen_sessions_user_time ON renwen_sessions(user_id, created_at DESC);
