import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { MirrorService } from "../src/mirror/mirror.service";
import type { MirrorEntry, MirrorRepository } from "../src/mirror/mirror.repository";
import type { MentorService } from "../src/mentor/mentor.service";
import type { UsersRepository } from "../src/users/users.repository";

// 固定「今天」：2026-08-18（Asia/Shanghai）——UTC 2026-08-18T02:00 = 上海 10:00
const NOW = new Date("2026-08-18T02:00:00Z").getTime();

function entry(over: Partial<MirrorEntry>): MirrorEntry {
  return {
    id: 1,
    userId: 7,
    entryDate: "2026-08-18",
    question: "今天的问题？",
    questionSource: "bank",
    answer: null,
    answeredAt: null,
    mentorReply: null,
    ...over,
  };
}

interface RepoBehavior {
  today?: MirrorEntry | null;
  yesterday?: MirrorEntry | null;
  /** mentor_reply 场景：null 模拟 LLM 失败 */
  reply?: string | null;
}

function makeService(behavior: RepoBehavior = {}) {
  // 假 repository 持有可变状态：updateAnswer/updateMentorReply 后 findByDate 反映新值
  let todayEntry = behavior.today ?? null;
  const repo = {
    findByDate: vi.fn().mockImplementation((_u: number, date: string) =>
      Promise.resolve(
        date === "2026-08-18" ? todayEntry : (behavior.yesterday ?? null),
      ),
    ),
    createEntry: vi.fn().mockImplementation((_u: number, date: string, q: string, s: string) => {
      todayEntry = entry({ entryDate: date, question: q, questionSource: s as "bank" });
      return Promise.resolve(todayEntry);
    }),
    updateAnswer: vi.fn().mockImplementation((_u: number, date: string, text: string) => {
      todayEntry = entry({
        ...(todayEntry ?? {}),
        entryDate: date,
        answer: text,
        answeredAt: "2026-08-18T02:01:00.000Z",
      });
      return Promise.resolve(todayEntry);
    }),
    updateMentorReply: vi.fn().mockImplementation((_u: number, _d: string, reply: string) => {
      if (todayEntry) todayEntry = { ...todayEntry, mentorReply: reply };
      return Promise.resolve();
    }),
    findRecentAnswers: vi.fn().mockResolvedValue([]),
    findYesterdayAnswer: vi.fn().mockResolvedValue(behavior.yesterday ?? null),
    findEntries: vi.fn().mockResolvedValue({ entries: [], nextBefore: null }),
  };
  const mentor = {
    askMirrorQuestion: vi.fn().mockResolvedValue({ question: "生成的问题？", source: "llm" }),
    askMentorReply: vi.fn().mockImplementation(() =>
      Promise.resolve(behavior.reply !== undefined ? behavior.reply : "嗯，记下了。"),
    ),
  };
  const users = {
    getMentorProfile: vi.fn().mockResolvedValue({ name: "默", style: "gentle" }),
  };
  const svc = new MirrorService(
    repo as unknown as MirrorRepository,
    mentor as unknown as MentorService,
    users as unknown as UsersRepository,
  );
  return { svc, repo, mentor, users };
}

describe("MirrorService.getToday", () => {
  it("当天已有问题：直接返回，不再调 LLM（幂等）", async () => {
    const { svc, mentor } = makeService({ today: entry({}) });
    const r = await svc.getToday(7, NOW);
    expect(r).toMatchObject({ date: "2026-08-18", question: "今天的问题？", answer: null });
    expect(mentor.askMirrorQuestion).not.toHaveBeenCalled();
  });

  it("当天无问题：经导师生成并落库", async () => {
    const { svc, repo, mentor } = makeService({});
    const r = await svc.getToday(7, NOW);
    expect(mentor.askMirrorQuestion).toHaveBeenCalledOnce();
    expect(repo.createEntry).toHaveBeenCalledWith(7, "2026-08-18", "生成的问题？", "llm");
    expect(r.questionSource).toBe("llm");
  });

  it("昨日有回答：带出 yesterday 供回顾区展示", async () => {
    const { svc } = makeService({
      today: entry({}),
      yesterday: entry({
        entryDate: "2026-08-17",
        answer: "昨天说了橘猫",
        answeredAt: "2026-08-17T13:00:00.000Z",
      }),
    });
    const r = await svc.getToday(7, NOW);
    expect(r.yesterday).toEqual({ date: "2026-08-17", text: "昨天说了橘猫" });
  });

  it("响应带导师名与 mentorReply", async () => {
    const { svc } = makeService({
      today: entry({
        answer: "回答",
        answeredAt: "2026-08-18T01:00:00.000Z",
        mentorReply: "嗯，记下了。",
      }),
    });
    const r = await svc.getToday(7, NOW);
    expect(r.mentor).toEqual({ name: "默" });
    expect(r.mentorReply).toBe("嗯，记下了。");
  });
});

describe("MirrorService.submitAnswer", () => {
  it("空回答 / 纯空白 → 400 empty_answer，不写库", async () => {
    const { svc, repo } = makeService({ today: entry({}) });
    await expect(svc.submitAnswer(7, "   ", NOW)).rejects.toThrow(BadRequestException);
    await expect(svc.submitAnswer(7, "   ", NOW)).rejects.toThrow("empty_answer");
    expect(repo.updateAnswer).not.toHaveBeenCalled();
  });

  it("超过 2000 字符 → 400 answer_too_long", async () => {
    const { svc, repo } = makeService({ today: entry({}) });
    await expect(svc.submitAnswer(7, "长".repeat(2001), NOW)).rejects.toThrow("answer_too_long");
    expect(repo.updateAnswer).not.toHaveBeenCalled();
  });

  it("首次回答 → created=true（接口层 201），生成并落库导师回应", async () => {
    const { svc, repo, mentor } = makeService({ today: entry({}), reply: "做得好。" });
    const { created, response } = await svc.submitAnswer(7, "橘猫蹭了我一下", NOW);
    expect(created).toBe(true);
    expect(repo.updateAnswer).toHaveBeenCalledWith(7, "2026-08-18", "橘猫蹭了我一下");
    expect(mentor.askMentorReply).toHaveBeenCalledWith(7, {
      question: "今天的问题？",
      answer: "橘猫蹭了我一下",
    });
    expect(repo.updateMentorReply).toHaveBeenCalledWith(7, "2026-08-18", "做得好。");
    expect(response.mentorReply).toBe("做得好。");
  });

  it("当天已有回答 → created=false（接口层 200），回应重新生成", async () => {
    const { svc, mentor } = makeService({
      today: entry({ answer: "旧回答", answeredAt: "2026-08-18T01:00:00.000Z", mentorReply: "旧回应。" }),
      reply: "新回应。",
    });
    const { created, response } = await svc.submitAnswer(7, "新回答", NOW);
    expect(created).toBe(false);
    expect(response.answer?.text).toBe("新回答");
    expect(mentor.askMentorReply).toHaveBeenCalledOnce();
    expect(response.mentorReply).toBe("新回应。");
  });

  it("回应生成失败（null）：回答正常写入，不落 mentor_reply", async () => {
    const { svc, repo } = makeService({ today: entry({}), reply: null });
    const { created, response } = await svc.submitAnswer(7, "橘猫蹭了我一下", NOW);
    expect(created).toBe(true);
    expect(repo.updateMentorReply).not.toHaveBeenCalled();
    expect(response.mentorReply).toBeNull();
  });

  it("回答前后空白被裁剪", async () => {
    const { svc, repo } = makeService({ today: entry({}) });
    await svc.submitAnswer(7, "  有内容  ", NOW);
    expect(repo.updateAnswer).toHaveBeenCalledWith(7, "2026-08-18", "有内容");
  });
});

describe("MirrorService.listEntries", () => {
  it("before 非法格式 → 400 invalid_before", async () => {
    const { svc } = makeService();
    await expect(svc.listEntries(7, "2026/08/18")).rejects.toThrow("invalid_before");
  });

  it("limit 超上限被截到 50，缺省 20", async () => {
    const { svc, repo } = makeService();
    await svc.listEntries(7, null, 999);
    expect(repo.findEntries).toHaveBeenCalledWith(7, null, 50);
    await svc.listEntries(7, null);
    expect(repo.findEntries).toHaveBeenCalledWith(7, null, 20);
  });
});
