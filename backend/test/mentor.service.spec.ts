import { describe, expect, it, vi } from "vitest";
import { LlmNotConfigured, LlmClient } from "../src/mentor/llm.client";
import {
  MentorService,
  RenwenReplyFailed,
  validateQuestion,
  validateRenwenReply,
  validateCangThemes,
  validateReply,
} from "../src/mentor/mentor.service";
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

describe("MentorService.askRenwenReply（人文导师团场景）", () => {
  const payload = {
    figurePersona: "你是王阳明，心学的开创者。",
    figureName: "王阳明",
    source: { title: "《传习录》", text: "知是行之始，行是知之成。" },
    confusion: "想辞职又怕选错。",
  };

  it("正常：system 为人物 persona（非导师人格），user 含记忆+困惑+出处原文", async () => {
    const { service, chat } = makeService({
      chatImpl: async () => "事上磨练，答案在做之中。",
      memory: "- 2026-08-18 问：q？\n  答：最近工作提不起劲\n",
    });
    const reply = await service.askRenwenReply(7, payload);
    expect(reply).toBe("事上磨练，答案在做之中。");
    const [system, user] = chat.mock.calls[0] as [string, string, number];
    expect(system).toContain("你是王阳明");
    expect(system).not.toContain("人生导师"); // 人物顶替导师人格位置
    expect(user).toContain("提不起劲"); // 记忆注入
    expect(user).toContain("想辞职又怕选错。"); // 困惑
    expect(user).toContain("知是行之始，行是知之成。"); // 出处原文注入
    expect(user).toContain("《传习录》");
  });

  it("困惑留空：prompt 有替代指令，不含 undefined/null", async () => {
    const { service, chat } = makeService({
      chatImpl: async () => "一句话。",
    });
    await service.askRenwenReply(7, { ...payload, confusion: null });
    const user = chat.mock.calls[0][1] as string;
    expect(user).toContain("没有写下具体困惑");
    expect(user).not.toContain("null");
  });

  it("LLM 失败 / 未配置：抛 RenwenReplyFailed（由调用方映 503），不返回兜底", async () => {
    const a = makeService({
      chatImpl: async () => {
        throw new Error("connect refused");
      },
    });
    await expect(a.service.askRenwenReply(7, payload)).rejects.toThrow(RenwenReplyFailed);
    const b = makeService({
      chatImpl: async () => {
        throw new LlmNotConfigured();
      },
    });
    await expect(
      b.service.askRenwenReply(7, payload),
    ).rejects.toMatchObject({ reason: "not_configured" });
  });

  it("输出超 200 字：判不合格抛 RenwenReplyFailed(invalid_output)", async () => {
    const { service } = makeService({ chatImpl: async () => "长".repeat(201) });
    await expect(service.askRenwenReply(7, payload)).rejects.toMatchObject({
      reason: "invalid_output",
    });
  });
});

describe("validateRenwenReply", () => {
  it("剥引号；允许问号结尾与多行（苏格拉底式追问合法）", () => {
    expect(validateRenwenReply("「你真正害怕的，是选错，还是承认自己不知道要什么？」")).toBe(
      "你真正害怕的，是选错，还是承认自己不知道要什么？",
    );
    expect(validateRenwenReply("第一句。\n第二句。")).toBe("第一句。\n第二句。");
  });

  it("空 / 超 200 字不合格", () => {
    expect(validateRenwenReply("")).toBeNull();
    expect(validateRenwenReply("字".repeat(200))).not.toBeNull();
    expect(validateRenwenReply("字".repeat(201))).toBeNull();
  });
});

describe("MentorService.askCangThemes（藏·思想地图打标）", () => {
  it("正常输出：解析出主题；system 含场景规则，user 含已有主题与收藏文本", async () => {
    const { service, chat } = makeService({
      chatImpl: async () => "选择\n怕输",
    });
    const themes = await service.askCangThemes(7, {
      text: "想辞职又怕选错。",
      existingThemes: ["选择"],
    });
    expect(themes).toEqual(["选择", "怕输"]);
    const [system, user] = chat.mock.calls[0] as [string, string, number];
    expect(system).toContain("思想地图");
    expect(user).toContain("选择");
    expect(user).toContain("想辞职又怕选错。");
  });

  it("复用已有主题忽略空白差异（照抄已有写法）", async () => {
    const { service } = makeService({ chatImpl: async () => " 选 择 " });
    const themes = await service.askCangThemes(7, {
      text: "t",
      existingThemes: ["选择"],
    });
    expect(themes).toEqual(["选择"]);
  });

  it("LLM 失败 / 未配置：返回 null（不抛，收藏主流程继续）", async () => {
    const a = makeService({
      chatImpl: async () => {
        throw new Error("timeout");
      },
    });
    expect(await a.service.askCangThemes(7, { text: "t", existingThemes: [] })).toBeNull();
    const b = makeService({
      chatImpl: async () => {
        throw new LlmNotConfigured();
      },
    });
    expect(await b.service.askCangThemes(7, { text: "t", existingThemes: [] })).toBeNull();
  });

  it("垃圾输出：返回 null", async () => {
    const { service } = makeService({ chatImpl: async () => "\n \n" });
    expect(await service.askCangThemes(7, { text: "t", existingThemes: [] })).toBeNull();
  });
});

describe("validateCangThemes", () => {
  it("剥序号/引号、去重、超 2 截断、单个超 8 字丢弃", () => {
    expect(validateCangThemes("1. 「选择」\n2. 选择\n3. 怕输\n这是一个特别特别长的主题名", [])).toEqual([
      "选择",
      "怕输",
    ]);
  });

  it("空结果 / 全非法行 → null", () => {
    expect(validateCangThemes("", [])).toBeNull();
    expect(validateCangThemes("这是一个特别特别长的主题名", [])).toBeNull();
  });
});
