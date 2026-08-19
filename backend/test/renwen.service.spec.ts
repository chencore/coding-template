import { describe, expect, it, vi } from "vitest";
import { RenwenReplyFailed } from "../src/mentor/mentor.service";
import type { MentorService } from "../src/mentor/mentor.service";
import { getFigure } from "../src/renwen/canon";
import {
  DAILY_SUMMON_LIMIT,
  RenwenDailyLimitReached,
  RenwenService,
} from "../src/renwen/renwen.service";
import type { RenwenRepository, RenwenSession } from "../src/renwen/renwen.repository";

// vitest 已沉淀约束：工厂函数建全新 mock；多次调用计数用 delta 断言。

function sessionFixture(overrides: Partial<RenwenSession> = {}): RenwenSession {
  return {
    id: 1,
    userId: 7,
    figure: "wangyangming",
    confusion: null,
    response: "事上磨练。",
    sourceId: "wym-chuanxilu-1",
    sourceTitle: "《传习录》",
    createdAt: "2026-08-19T02:00:00.000Z",
    ...overrides,
  };
}

function makeService(opts: {
  todayCount?: number;
  totalCount?: number;
  figureCount?: number;
  replyImpl?: () => Promise<string>;
}) {
  const repo = {
    countToday: vi.fn().mockResolvedValue(opts.todayCount ?? 0),
    countAll: vi.fn().mockResolvedValue(opts.totalCount ?? 0),
    countByFigure: vi.fn().mockResolvedValue(opts.figureCount ?? 0),
    insertSession: vi.fn().mockImplementation(async (_u: number, s: Record<string, unknown>) =>
      sessionFixture(s as Partial<RenwenSession>),
    ),
  };
  const mentor = {
    askRenwenReply: vi
      .fn()
      .mockImplementation(opts.replyImpl ?? (async () => "事上磨练，答案在做之中。")),
  };
  const service = new RenwenService(
    repo as unknown as RenwenRepository,
    mentor as unknown as MentorService,
  );
  return { service, repo, mentor };
}

describe("RenwenService.summon", () => {
  it("指定人物：按指定人物召唤，remainingToday 递减，落库", async () => {
    const { service, repo, mentor } = makeService({ todayCount: 1, figureCount: 2 });
    const result = await service.summon(7, {
      figureId: "wangyangming",
      confusion: "想辞职又怕选错。",
    });
    expect(result.figure.id).toBe("wangyangming");
    expect(result.remainingToday).toBe(DAILY_SUMMON_LIMIT - 2);
    // 出处轮转：该人物第 3 次召唤 → 取 sources[2]
    const wym = getFigure("wangyangming")!;
    expect(result.sourceTitle).toBe(wym.sources[2].title);
    // LLM 收到人物 persona 与出处原文
    const payload = mentor.askRenwenReply.mock.calls[0][1] as {
      figureName: string;
      source: { title: string; text: string };
    };
    expect(payload.figureName).toBe("王阳明");
    expect(payload.source.text).toBe(wym.sources[2].text);
    expect(repo.insertSession).toHaveBeenCalledTimes(1);
  });

  it("导师代选：按累计召唤数轮转人物", async () => {
    const { service, mentor } = makeService({ totalCount: 3 });
    const result = await service.summon(7, { figureId: null, confusion: null });
    expect(result.figure.id).toBe("zengguofan"); // pickFigure(3)
    const payload = mentor.askRenwenReply.mock.calls[0][1] as { figureName: string };
    expect(payload.figureName).toBe("曾国藩");
  });

  it("达到每日上限：抛 RenwenDailyLimitReached，不调 LLM、不落库", async () => {
    const { service, repo, mentor } = makeService({ todayCount: 3 });
    await expect(
      service.summon(7, { figureId: null, confusion: null }),
    ).rejects.toThrow(RenwenDailyLimitReached);
    expect(mentor.askRenwenReply).not.toHaveBeenCalled();
    expect(repo.insertSession).not.toHaveBeenCalled();
  });

  it("LLM 失败：抛错向上（controller 映 503），不落库", async () => {
    const { service, repo } = makeService({
      replyImpl: async () => {
        throw new RenwenReplyFailed("llm_error");
      },
    });
    await expect(
      service.summon(7, { figureId: "socrates", confusion: null }),
    ).rejects.toThrow(RenwenReplyFailed);
    expect(repo.insertSession).not.toHaveBeenCalled();
  });
});

describe("RenwenService.listSessions", () => {
  it("透传 repository 最近 20 条", async () => {
    const repo = { listRecent: vi.fn().mockResolvedValue([sessionFixture()]) };
    const service = new RenwenService(
      repo as unknown as RenwenRepository,
      {} as MentorService,
    );
    const list = await service.listSessions(7);
    expect(repo.listRecent).toHaveBeenCalledWith(7, 20);
    expect(list).toHaveLength(1);
  });
});
