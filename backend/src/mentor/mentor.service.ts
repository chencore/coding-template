import { Inject, Injectable, Logger } from "@nestjs/common";
import { LlmClient, LlmNotConfigured } from "./llm.client";
import { MEMORY_PROVIDER, type MemoryProvider } from "./memory";
import { buildSystemPrompt } from "./persona";
import { pickBankQuestion } from "./question-bank";
import { UsersRepository } from "../users/users.repository";

const MAX_QUESTION_LEN = 40;
const MAX_REPLY_LEN = 60;

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
} as const;

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
