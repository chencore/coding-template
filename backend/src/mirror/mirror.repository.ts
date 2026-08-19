import { Inject, Injectable } from "@nestjs/common";
import { Database } from "../database/database";

export type QuestionSource = "llm" | "bank";

export interface MirrorEntry {
  id: number;
  userId: number;
  /** 'YYYY-MM-DD'，Asia/Shanghai 日历日 */
  entryDate: string;
  question: string;
  questionSource: QuestionSource;
  answer: string | null;
  answeredAt: string | null;
  /** 导师回应，NULL = 无（未回答 / 生成失败） */
  mentorReply: string | null;
}

interface EntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  question: string;
  question_source: QuestionSource;
  answer: string | null;
  answered_at: Date | null;
  mentor_reply: string | null;
}

function toEntry(row: EntryRow): MirrorEntry {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    entryDate: row.entry_date,
    question: row.question,
    questionSource: row.question_source,
    answer: row.answer,
    answeredAt: row.answered_at ? row.answered_at.toISOString() : null,
    mentorReply: row.mentor_reply,
  };
}

const ENTRY_COLS =
  "id, user_id, entry_date, question, question_source, answer, answered_at, mentor_reply";

/**
 * 镜子时刻数据访问：一天一问题一回答（UNIQUE(user_id, entry_date)）。
 */
@Injectable()
export class MirrorRepository {
  constructor(@Inject(Database) private readonly db: Database) {}

  async findByDate(userId: number, entryDate: string): Promise<MirrorEntry | null> {
    const { rows } = await this.db.pool.query<EntryRow>(
      `SELECT ${ENTRY_COLS} FROM mirror_entries WHERE user_id = $1 AND entry_date = $2`,
      [userId, entryDate],
    );
    return rows[0] ? toEntry(rows[0]) : null;
  }

  /** 落库当天问题；并发首访由 UNIQUE 兜底，冲突时返回已有行 */
  async createEntry(
    userId: number,
    entryDate: string,
    question: string,
    questionSource: QuestionSource,
  ): Promise<MirrorEntry> {
    const { rows } = await this.db.pool.query<EntryRow>(
      `INSERT INTO mirror_entries(user_id, entry_date, question, question_source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, entry_date) DO NOTHING
       RETURNING ${ENTRY_COLS}`,
      [userId, entryDate, question, questionSource],
    );
    if (rows[0]) return toEntry(rows[0]);
    const existing = await this.findByDate(userId, entryDate);
    if (!existing) throw new Error("createEntry: conflict but no existing row");
    return existing;
  }

  /**
   * 更新当天回答（当天条目须已由 createEntry 建立——空问题行不得出现）。
   * 是否首次回答由服务层在调用前判断（entry.answer 是否为 null）。
   */
  async updateAnswer(userId: number, entryDate: string, text: string): Promise<MirrorEntry> {
    const { rows } = await this.db.pool.query<EntryRow>(
      `UPDATE mirror_entries
         SET answer = $3, answered_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND entry_date = $2
       RETURNING ${ENTRY_COLS}`,
      [userId, entryDate, text],
    );
    if (!rows[0]) throw new Error("updateAnswer: entry not found");
    return toEntry(rows[0]);
  }

  /** 近 N 天已回答内容（供 LLM 个性化生成问题 / 导师记忆注入），日期倒序 */
  async findRecentAnswers(userId: number, sinceDate: string): Promise<MirrorEntry[]> {
    const { rows } = await this.db.pool.query<EntryRow>(
      `SELECT ${ENTRY_COLS} FROM mirror_entries
       WHERE user_id = $1 AND answer IS NOT NULL AND entry_date >= $2
       ORDER BY entry_date DESC`,
      [userId, sinceDate],
    );
    return rows.map(toEntry);
  }

  /** 写入导师回应（当天改回答时服务层会重新生成并覆盖） */
  async updateMentorReply(userId: number, entryDate: string, reply: string): Promise<void> {
    const { rowCount } = await this.db.pool.query(
      `UPDATE mirror_entries
         SET mentor_reply = $3, updated_at = NOW()
       WHERE user_id = $1 AND entry_date = $2`,
      [userId, entryDate, reply],
    );
    if (!rowCount) throw new Error("updateMentorReply: entry not found");
  }

  /** 昨日已回答条目（供「昨日回顾」展示），无则 null */
  async findYesterdayAnswer(userId: number, yesterday: string): Promise<MirrorEntry | null> {
    return this.findByDate(userId, yesterday);
  }

  /**
   * 声音档案：仅已回答条目，日期倒序游标分页。
   * 多取 1 条判断是否还有更早数据，计算 nextBefore。
   */
  async findEntries(
    userId: number,
    before: string | null,
    limit: number,
  ): Promise<{ entries: MirrorEntry[]; nextBefore: string | null }> {
    const { rows } = await this.db.pool.query<EntryRow>(
      `SELECT ${ENTRY_COLS} FROM mirror_entries
       WHERE user_id = $1 AND answer IS NOT NULL AND ($2::date IS NULL OR entry_date < $2)
       ORDER BY entry_date DESC
       LIMIT $3`,
      [userId, before, limit + 1],
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).map(toEntry);
    return {
      entries: page,
      nextBefore: hasMore ? page[page.length - 1].entryDate : null,
    };
  }
}
