import { Inject, Injectable, Logger } from "@nestjs/common";
import { LlmClient, LlmNotConfigured } from "./llm.client";
import { MEMORY_PROVIDER, type MemoryProvider } from "./memory";
import { buildFigureSystemPrompt, buildSystemPrompt } from "./persona";
import { pickBankQuestion } from "./question-bank";
import { UsersRepository } from "../users/users.repository";

const MAX_QUESTION_LEN = 40;
const MAX_REPLY_LEN = 60;
const MAX_RENWEN_REPLY_LEN = 200;

export interface GeneratedQuestion {
  question: string;
  source: "llm" | "bank";
}

export type QuestionFallbackReason =
  | "no_history"
  | "not_configured"
  | "llm_error"
  | "invalid_output";

/** 场景规则：注入 system prompt 的第三段（人格与守则之后） */
const SCENE_RULES = {
  mirror_question: `场景：每天的镜子时刻，你要给用户提一个反思问题。
- 只输出一句问句，不超过 40 字
- 可以轻轻呼应用户最近提到的具体事，但不要复述隐私细节`,
  mentor_reply: `场景：用户刚回答完今天的镜子问题，你要接住这句话。
- 只输出一句回应，不超过 60 字
- 不追问（不以问号结尾），不复述用户的原话
- 承接 > 建议；像深夜里回的一句话`,
  renwen_reply: `场景：用户迷茫时请到了你。请结合注入的那条你的思想，回应用户当下的处境。
- 输出一段回应，不超过 200 字
- 允许追问（提问式人物可以用问句结尾）
- 不要直接照抄出处原文，把那条思想说到用户的处境上
- 只输出回应正文`,
} as const;

/** renwen 场景失败原因：日志与 503 判定用，不含用户内容 */
export type RenwenFailReason = "not_configured" | "llm_error" | "invalid_output";

/** 人文导师团场景失败：统一抛出，由调用方（renwen 模块）映射 503（决策 5：召唤是主动作，不做假兜底） */
export class RenwenReplyFailed extends Error {
  constructor(public readonly reason: RenwenFailReason) {
    super(`renwen_reply failed: ${reason}`);
    this.name = "RenwenReplyFailed";
  }
}

/**
 * 导师服务：所有 AI 出口的统一网关（design.md 决策 2）。
 * 每个场景 = 人格 + 记忆 + 场景规则 → LLM → 输出校验 → 场景降级。
 * 新场景在 SCENE_RULES 注册并加 ask 分支，不复制管道。
 */
@Injectable()
export class MentorService {
  private readonly logger = new Logger(MentorService.name);

  constructor(
    @Inject(LlmClient) private readonly llm: LlmClient,
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(MEMORY_PROVIDER) private readonly memory: MemoryProvider,
  ) {}

  /** 场景：每日镜子问题。无历史 → bank；LLM 失败 → bank + warn（用户无感） */
  async askMirrorQuestion(userId: number, entryDate: string): Promise<GeneratedQuestion> {
    const persona = await this.users.getMentorProfile(userId);
    const memory = await this.memory.recall(userId);
    if (!memory) return this.bankQuestion(entryDate, "no_history");

    const startedAt = Date.now();
    try {
      const raw = await this.llm.chat(
        buildSystemPrompt(persona, SCENE_RULES.mirror_question),
        `这是用户最近几天的镜子回答：\n${memory}请生成今天的镜子问题。`,
        800,
      );
      const question = validateQuestion(raw);
      if (!question) {
        return this.bankQuestion(entryDate, "invalid_output", Date.now() - startedAt);
      }
      this.logger.log(`ask mirror_question: llm ok (${Date.now() - startedAt}ms)`);
      return { question, source: "llm" };
    } catch (err) {
      const reason: QuestionFallbackReason =
        err instanceof LlmNotConfigured ? "not_configured" : "llm_error";
      return this.bankQuestion(entryDate, reason, Date.now() - startedAt);
    }
  }

  /**
   * 场景：镜子回答后的导师回应（≤60 字、不追问）。
   * 失败返回 null——回应是锦上添花，缺省不阻塞主流程（design.md 决策 4）。
   */
  async askMentorReply(
    userId: number,
    payload: { question: string; answer: string },
  ): Promise<string | null> {
    const persona = await this.users.getMentorProfile(userId);
    const memory = await this.memory.recall(userId);

    const startedAt = Date.now();
    try {
      const memoryBlock = memory ? `用户最近的镜子回答：\n${memory}\n` : "";
      const raw = await this.llm.chat(
        buildSystemPrompt(persona, SCENE_RULES.mentor_reply),
        `${memoryBlock}今天的问题：${payload.question}\n用户的回答：${payload.answer}\n请以导师身份回应这句话。`,
        800,
      );
      const reply = validateReply(raw);
      if (!reply) {
        this.logger.warn(`ask mentor_reply: invalid_output (${Date.now() - startedAt}ms)`);
        return null;
      }
      this.logger.log(`ask mentor_reply: llm ok (${Date.now() - startedAt}ms)`);
      return reply;
    } catch (err) {
      // 只记错误类别与耗时；不记请求/响应内容（含用户回答）
      const reason = err instanceof LlmNotConfigured ? "not_configured" : "llm_error";
      this.logger.warn(`ask mentor_reply: ${reason} (${Date.now() - startedAt}ms)`);
      return null;
    }
  }

  /**
   * 场景：人文导师团回应（≤200 字、允许追问）。
   * 出处条目不经过 LLM 生成——由调用方选定后注入，标注用库内篇名（决策 2）。
   * 任何失败都抛 RenwenReplyFailed（不落库、不兜底），由 renwen 模块映射 503（决策 5）。
   */
  async askRenwenReply(
    userId: number,
    payload: {
      figurePersona: string;
      figureName: string;
      source: { title: string; text: string };
      confusion: string | null;
    },
  ): Promise<string> {
    const memory = await this.memory.recall(userId);
    const startedAt = Date.now();
    const memoryBlock = memory ? `用户最近的镜子回答：\n${memory}\n` : "";
    const confusionLine = payload.confusion
      ? `用户当下的困惑：${payload.confusion}`
      : "用户没有写下具体困惑，请从用户最近的表达出发（若没有表达，就从当下普遍的迷茫出发）。";

    try {
      const raw = await this.llm.chat(
        buildFigureSystemPrompt(payload.figurePersona, SCENE_RULES.renwen_reply),
        `${memoryBlock}${confusionLine}\n你的这条思想与此相关：${payload.source.title}——「${payload.source.text}」\n请以${payload.figureName}的身份回应用户。`,
        800,
      );
      const reply = validateRenwenReply(raw);
      if (!reply) {
        this.logger.warn(
          `ask renwen_reply: invalid_output (${Date.now() - startedAt}ms)`,
        );
        throw new RenwenReplyFailed("invalid_output");
      }
      this.logger.log(`ask renwen_reply: llm ok (${Date.now() - startedAt}ms)`);
      return reply;
    } catch (err) {
      if (err instanceof RenwenReplyFailed) throw err;
      // 只记错误类别与耗时；不记请求/响应内容（含用户困惑与记忆）
      const reason: RenwenFailReason =
        err instanceof LlmNotConfigured ? "not_configured" : "llm_error";
      this.logger.warn(`ask renwen_reply: ${reason} (${Date.now() - startedAt}ms)`);
      throw new RenwenReplyFailed(reason);
    }
  }

  private bankQuestion(
    entryDate: string,
    reason: QuestionFallbackReason,
    llmMs?: number,
  ): GeneratedQuestion {
    if (reason !== "no_history") {
      this.logger.warn(
        `ask mirror_question: fallback to bank: ${reason}${llmMs !== undefined ? ` (${llmMs}ms)` : ""}`,
      );
    }
    return { question: pickBankQuestion(entryDate), source: "bank" };
  }
}

/** 镜子问题校验：≤40 字、单行、以问号结尾 */
export function validateQuestion(raw: string): string | null {
  const q = raw.trim().replace(/^[「"']+|[」"']+$/g, "").trim();
  if (q.length === 0 || q.length > MAX_QUESTION_LEN) return null;
  if (q.includes("\n")) return null;
  if (!q.endsWith("？") && !q.endsWith("?")) return null;
  return q;
}

/** 导师回应校验：≤60 字、单行、不以问号结尾（不追问） */
export function validateReply(raw: string): string | null {
  const r = raw.trim().replace(/^[「"']+|[」"']+$/g, "").trim();
  if (r.length === 0 || r.length > MAX_REPLY_LEN) return null;
  if (r.includes("\n")) return null;
  if (r.endsWith("？") || r.endsWith("?")) return null;
  return r;
}

/** 人文导师回应校验：≤200 字、剥引号、允许多行与问号（苏格拉底式本来就是追问） */
export function validateRenwenReply(raw: string): string | null {
  const r = raw.trim().replace(/^[「"']+|[」"']+$/g, "").trim();
  if (r.length === 0 || r.length > MAX_RENWEN_REPLY_LEN) return null;
  return r;
}
