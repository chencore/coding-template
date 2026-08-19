import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { shanghaiDaysAgo, shanghaiToday } from "../common/shanghai-date";
import { MentorService } from "../mentor/mentor.service";
import { UsersRepository } from "../users/users.repository";
import { MirrorRepository, type MirrorEntry } from "./mirror.repository";

const ANSWER_MAX_LEN = 2000;
const ENTRIES_DEFAULT_LIMIT = 20;
const ENTRIES_MAX_LIMIT = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface TodayResponse {
  date: string;
  question: string;
  questionSource: "llm" | "bank";
  answer: { text: string; answeredAt: string } | null;
  /** 昨日已回答内容（供「昨日回顾」展示），无则 null */
  yesterday: { date: string; text: string } | null;
  /** 导师人格（前端署名「{name} · 你的导师」） */
  mentor: { name: string };
  /** 导师回应；null = 未回答或回应生成失败（前端回落固定文案） */
  mentorReply: string | null;
}

export interface EntriesResponse {
  entries: Array<{
    date: string;
    question: string;
    answer: string;
    answeredAt: string;
  }>;
  nextBefore: string | null;
}

@Injectable()
export class MirrorService {
  private readonly logger = new Logger(MirrorService.name);

  constructor(
    @Inject(MirrorRepository) private readonly repo: MirrorRepository,
    @Inject(MentorService) private readonly mentor: MentorService,
    @Inject(UsersRepository) private readonly users: UsersRepository,
  ) {}

  async getToday(userId: number, now: number = Date.now()): Promise<TodayResponse> {
    const today = shanghaiToday(now);
    const entry = await this.ensureToday(userId, today);
    const yesterdayEntry = await this.repo.findYesterdayAnswer(
      userId,
      shanghaiDaysAgo(1, now),
    );
    const persona = await this.users.getMentorProfile(userId);
    return {
      date: entry.entryDate,
      question: entry.question,
      questionSource: entry.questionSource,
      answer:
        entry.answer !== null && entry.answeredAt !== null
          ? { text: entry.answer, answeredAt: entry.answeredAt }
          : null,
      yesterday:
        yesterdayEntry?.answer != null
          ? { date: yesterdayEntry.entryDate, text: yesterdayEntry.answer }
          : null,
      mentor: { name: persona.name },
      mentorReply: entry.mentorReply,
    };
  }

  /**
   * 提交/修改当天回答：先 ensure 当天条目（顺带生成问题），再更新回答，
   * 最后请导师给一句回应（每次提交重新生成；失败为 null，不阻塞主流程）。
   * 返回 created=true 表示首次回答（201），false 为当天更新（200）。
   */
  async submitAnswer(
    userId: number,
    text: string,
    now: number = Date.now(),
  ): Promise<{ response: TodayResponse; created: boolean }> {
    const trimmed = text.trim();
    if (trimmed.length === 0) throw new BadRequestException("empty_answer");
    if (trimmed.length > ANSWER_MAX_LEN) throw new BadRequestException("answer_too_long");

    const today = shanghaiToday(now);
    const entry = await this.ensureToday(userId, today);
    const created = entry.answer === null;
    await this.repo.updateAnswer(userId, today, trimmed);
    this.logger.log(
      `answer ${created ? "created" : "updated"}: user=${userId} date=${today} len=${trimmed.length}`,
    );

    const reply = await this.mentor.askMentorReply(userId, {
      question: entry.question,
      answer: trimmed,
    });
    if (reply !== null) {
      await this.repo.updateMentorReply(userId, today, reply);
      this.logger.log(`mentor reply saved: user=${userId} date=${today} len=${reply.length}`);
    }

    const response = await this.getToday(userId, now);
    return { response, created };
  }

  async listEntries(
    userId: number,
    before: string | null,
    limit?: number,
  ): Promise<EntriesResponse> {
    if (before !== null && !DATE_RE.test(before)) {
      throw new BadRequestException("invalid_before");
    }
    const effectiveLimit = Math.min(
      Math.max(limit ?? ENTRIES_DEFAULT_LIMIT, 1),
      ENTRIES_MAX_LIMIT,
    );
    const { entries, nextBefore } = await this.repo.findEntries(userId, before, effectiveLimit);
    return {
      entries: entries.map((e) => ({
        date: e.entryDate,
        question: e.question,
        answer: e.answer as string,
        answeredAt: e.answeredAt as string,
      })),
      nextBefore,
    };
  }

  /** 当天条目存在则返回；不存在则经导师人格生成问题并落库（当天幂等，LLM 不重复调用） */
  private async ensureToday(userId: number, today: string): Promise<MirrorEntry> {
    const existing = await this.repo.findByDate(userId, today);
    if (existing) return existing;

    const { question, source } = await this.mentor.askMirrorQuestion(userId, today);
    const entry = await this.repo.createEntry(userId, today, question, source);
    this.logger.log(
      `question created: user=${userId} date=${today} source=${entry.questionSource}`,
    );
    return entry;
  }
}
