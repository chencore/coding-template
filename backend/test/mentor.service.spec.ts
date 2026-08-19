import { describe, expect, it, vi } from "vitest";
import { LlmNotConfigured, LlmClient } from "../src/mentor/llm.client";
import { MentorService, validateQuestion, validateReply } from "../src/mentor/mentor.service";
import type { MemoryProvider } from "../src/mentor/memory";
import type { UsersRepository } from "../src/users/users.repository";

// vitest 已沉淀约束：不用 beforeEach + mockReset；vi.fn().mockImplementation() 构造器形式；
// 多次调用计数用 delta 断言（mock 跨用例累积）。

function makeService(opts: {
  chatImpl?: (system: string, user: string, maxTokens: number) => Promise<string>;
  memory?: string;
  persona?: { name: string; style: "gentle" | "socratic" | "companion" };
}) {
  const chat = vi.fn().mockImplementation(opts.chatImpl ?? (async () => "默认回应。"));
  const recall = vi.fn().mockResolvedValue(opts.memory ?? "- 2026-08-18 问：q？\n  答：a\n");
  const getMentorProfile = vi
    .fn()
    .mockResolvedValue(opts.persona ?? { name: "默", style: "gentle" });
  const service = new MentorService(
    { chat } as unknown as LlmClient,
    { getMentorProfile } as unknown as UsersRepository,
    { recall } as MemoryProvider,
  );
  return { service, chat, recall, getMentorProfile };
}

describe("MentorService.askMirrorQuestion", () => {
  it("无记忆：走题库，不调 LLM", async () => {
    const { service, chat } = makeService({ memory: "" });
    const result = await service.askMirrorQuestion(7, "2026-08-19");
    expect(result.source).toBe("bank");
    expect(chat).not.toHaveBeenCalled();
  });

  it("有记忆：system prompt 含人格（名+风格段），user prompt 含记忆", async () => {
    const { service, chat } = makeService({
      chatImpl: async () => "今天哪件事最像你？",
      persona: { name: "远山", style: "socratic" },
      memory: "- 2026-08-18 问：q？\n  答：橘猫\n",
    });
    const result = await service.askMirrorQuestion(7, "2026-08-19");
    expect(result).toEqual({ question: "今天哪件事最像你？", source: "llm" });
    const [system, user] = chat.mock.calls[0] as [string, string, number];
    expect(system).toContain("远山");
    expect(system).toContain("相信答案在用户心里");
    expect(user).toContain("橘猫");
  });

  it("LLM 抛错：题库兜底", async () => {
    const { service } = makeService({
      chatImpl: async () => {
        throw new Error("timeout");
      },
    });
    expect((await service.askMirrorQuestion(7, "2026-08-19")).source).toBe("bank");
  });

  it("密钥未配置：题库兜底", async () => {
    const { service } = makeService({
      chatImpl: async () => {
        throw new LlmNotConfigured();
      },
    });
    expect((await service.askMirrorQuestion(7, "2026-08-19")).source).toBe("bank");
  });

  it("LLM 输出非问句：题库兜底", async () => {
    const { service } = makeService({ chatImpl: async () => "这不是问句。" });
    expect((await service.askMirrorQuestion(7, "2026-08-19")).source).toBe("bank");
  });
});

describe("MentorService.askMentorReply", () => {
  it("正常：返回回应，prompt 含今天问答与人格", async () => {
    const { service, chat } = makeService({
      chatImpl: async () => "做完了就好，别小看这一小步。",
      persona: { name: "默", style: "companion" },
    });
    const reply = await service.askMentorReply(7, {
      question: "今天发生了什么？",
      answer: "把拖了一周的事做完了。",
    });
    expect(reply).toBe("做完了就好，别小看这一小步。");
    const [system, user] = chat.mock.calls[0] as [string, string, number];
    expect(system).toContain("平辈口吻");
    expect(system).toContain("不追问");
    expect(user).toContain("把拖了一周的事做完了。");
  });

  it("LLM 失败：返回 null，不抛出", async () => {
    const { service } = makeService({
      chatImpl: async () => {
        throw new Error("connect refused");
      },
    });
    expect(
      await service.askMentorReply(7, { question: "q", answer: "a" }),
    ).toBeNull();
  });

  it("输出以问号结尾（追问）：判不合格返回 null", async () => {
    const { service } = makeService({ chatImpl: async () => "是什么让你拖了一周？" });
    expect(await service.askMentorReply(7, { question: "q", answer: "a" })).toBeNull();
  });

  it("输出超 60 字：判不合格返回 null", async () => {
    const { service } = makeService({ chatImpl: async () => "长".repeat(61) });
    expect(await service.askMentorReply(7, { question: "q", answer: "a" })).toBeNull();
  });
});

describe("validateQuestion / validateReply", () => {
  it("剥离引号后校验", () => {
    expect(validateQuestion("「今天怎么样？」")).toBe("今天怎么样？");
    expect(validateReply("「做得好。」")).toBe("做得好。");
  });

  it("空 / 多行不合格", () => {
    expect(validateQuestion("")).toBeNull();
    expect(validateQuestion("第一行？\n第二行？")).toBeNull();
    expect(validateReply("一行。\n二行。")).toBeNull();
  });
});
