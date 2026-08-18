import { describe, expect, it, vi } from "vitest";
import { QuestionGenerator, validateQuestion } from "../src/mirror/question-generator";
import { QUESTION_BANK } from "../src/mirror/question-bank";
import type { MirrorEntry } from "../src/mirror/mirror.repository";
import type { ConfigService } from "@nestjs/config";

// vitest 已沉淀约束：vi.mock 工厂里不用 class+参数属性；用 vi.fn().mockImplementation 构造器形态；
// 不用 beforeEach + mockReset；串联行为用 Once 变体。

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}));

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (k: string, d?: string) => values[k] ?? d } as ConfigService;
}

function answerEntry(text: string): MirrorEntry {
  return {
    id: 1,
    userId: 7,
    entryDate: "2026-08-17",
    question: "昨天的问题？",
    questionSource: "bank",
    answer: text,
    answeredAt: "2026-08-17T13:00:00.000Z",
  };
}

const CONFIGURED = { ARK_API_KEY: "k", ARK_MODEL_ID: "m", ARK_BASE_URL: "https://x" };
const recent = [answerEntry("想给妈妈打电话")];

describe("QuestionGenerator.generate", () => {
  it("无历史回答 → 问题库轮换，不调 LLM", async () => {
    const gen = new QuestionGenerator(makeConfig(CONFIGURED));
    const callsBefore = createMock.mock.calls.length;
    const r = await gen.generate("2026-08-18", []);
    expect(r.source).toBe("bank");
    expect(QUESTION_BANK).toContain(r.question);
    expect(createMock.mock.calls.length).toBe(callsBefore);
  });

  it("有历史 + LLM 成功 → llm 来源的个性化问题", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "今天给妈妈打电话了吗？" } }],
    });
    const gen = new QuestionGenerator(makeConfig(CONFIGURED));
    const r = await gen.generate("2026-08-18", recent);
    expect(r).toEqual({ question: "今天给妈妈打电话了吗？", source: "llm" });
  });

  it("LLM 抛错 → 问题库兜底，用户无感", async () => {
    createMock.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    const gen = new QuestionGenerator(makeConfig(CONFIGURED));
    const r = await gen.generate("2026-08-18", recent);
    expect(r.source).toBe("bank");
    expect(QUESTION_BANK).toContain(r.question);
  });

  it("LLM 输出不合格（超 40 字 / 非问句）→ 问题库兜底", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "这不是一个问句，而是一段很长的解释说明文字，远远超出四十个字的限制范围。" } }],
    });
    const gen = new QuestionGenerator(makeConfig(CONFIGURED));
    const r = await gen.generate("2026-08-18", recent);
    expect(r.source).toBe("bank");
  });

  it("密钥未配置 → 问题库兜底，不调 LLM", async () => {
    const gen = new QuestionGenerator(makeConfig({}));
    const callsBefore = createMock.mock.calls.length;
    const r = await gen.generate("2026-08-18", recent);
    expect(r.source).toBe("bank");
    expect(createMock.mock.calls.length).toBe(callsBefore);
  });
});

describe("validateQuestion", () => {
  it("接受正常问句并剥离引号", () => {
    expect(validateQuestion("「今天怎么样？」")).toBe("今天怎么样？");
  });
  it("拒绝非问句 / 超长 / 多行 / 空", () => {
    expect(validateQuestion("陈述句。")).toBeNull();
    expect(validateQuestion("啊".repeat(41) + "？")).toBeNull();
    expect(validateQuestion("第一行？\n第二行？")).toBeNull();
    expect(validateQuestion("   ")).toBeNull();
  });
});
