import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";

export interface RenwenSession {
  id: number;
  userId: number;
  figure: string;
  confusion: string | null;
  response: string;
  sourceId: string;
  sourceTitle: string;
  createdAt: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  figure: string;
  confusion: string | null;
  response: string;
  source_id: string;
  source_title: string;
  created_at: Date;
}

function toSession(row: SessionRow): RenwenSession {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    figure: row.figure,
    confusion: row.confusion,
    response: row.response,
    sourceId: row.source_id,
    sourceTitle: row.source_title,
    createdAt: row.created_at.toISOString(),
  };
}

const SESSION_COLS =
  "id, user_id, figure, confusion, response, source_id, source_title, created_at";

/**
 * 人文导师团召唤记录的数据访问。
 * 计数方法（每日上限 / 轮转）与写入都在此；无更新、无删除（召唤即历史）。
 */
@Injectable()
export class RenwenRepository {
  constructor(@Inject(Database) private readonly db: Database) {}

  async insertSession(
    userId: number,
    session: {
      figure: string;
      confusion: string | null;
      response: string;
      sourceId: string;
      sourceTitle: string;
    },
  ): Promise<RenwenSession> {
    const { rows } = await this.db.pool.query<SessionRow>(
      `INSERT INTO renwen_sessions(user_id, figure, confusion, response, source_id, source_title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SESSION_COLS}`,
      [
        userId,
        session.figure,
        session.confusion,
        session.response,
        session.sourceId,
        session.sourceTitle,
      ],
    );
    return toSession(rows[0]);
  }

  /** 当日已召唤次数（dayStartMs 为上海当日 00:00 的 epoch ms）——每日上限判定 */
  async countToday(userId: number, dayStartMs: number): Promise<number> {
    const { rows } = await this.db.pool.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM renwen_sessions
       WHERE user_id = $1 AND created_at >= $2`,
      [userId, new Date(dayStartMs)],
    );
    return Number(rows[0].n);
  }

  /** 该用户对该人物的累计召唤数——出处轮转取模 */
  async countByFigure(userId: number, figure: string): Promise<number> {
    const { rows } = await this.db.pool.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM renwen_sessions WHERE user_id = $1 AND figure = $2`,
      [userId, figure],
    );
    return Number(rows[0].n);
  }

  /** 该用户累计召唤总数——导师代选轮转取模 */
  async countAll(userId: number): Promise<number> {
    const { rows } = await this.db.pool.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM renwen_sessions WHERE user_id = $1`,
      [userId],
    );
    return Number(rows[0].n);
  }

  /** 最近 N 条召唤（时间倒序）——历史回看 */
  async listRecent(userId: number, limit: number): Promise<RenwenSession[]> {
    const { rows } = await this.db.pool.query<SessionRow>(
      `SELECT ${SESSION_COLS} FROM renwen_sessions
       WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
      [userId, limit],
    );
    return rows.map(toSession);
  }
}
