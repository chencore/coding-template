import { describe, expect, it, vi } from "vitest";
import { BadRequestException, HttpException, ServiceUnavailableException } from "@nestjs/common";
import { RenwenReplyFailed } from "../src/mentor/mentor.service";
import { RenwenController } from "../src/renwen/renwen.controller";
import { RenwenDailyLimitReached } from "../src/renwen/renwen.service";
import type { RenwenService } from "../src/renwen/renwen.service";
import { getFigure } from "../src/renwen/canon";

// controller 参数校验与异常映射：不依赖真实 service（fake 注进构造器）

const authed = { userId: 7 } as never;

function makeController(summonImpl?: () => Promise<never>) {
  const summon = vi.fn().mockImplementation(
    summonImpl ??
      (async () => ({
        session: {
          id: 1,
          response: "事上磨练。",
          createdAt: "2026-08-19T02:00:00.000Z",
        },
        figure: getFigure("wangyangming")!,
        sourceTitle: "《传习录》",
        remainingToday: 2,
      })),
  );
  const controller = new RenwenController({ summon, listSessions: vi.fn() } as unknown as RenwenService);
  return { controller, summon };
}

describe("RenwenController.summon 参数校验（场景 8：非法参数不调 LLM）", () => {
  it("figureId 为枚举外值 → 400 invalid_figure", async () => {
    const { controller, summon } = makeController();
    await expect(
      controller.summon(authed, { figureId: "confucius" }),
    ).rejects.toThrow(BadRequestException);
    expect(summon).not.toHaveBeenCalled();
  });

  it("confusion 超 200 字 → 400 confusion_too_long；trim 后为空视为留空", async () => {
    const { controller, summon } = makeController();
    await expect(
      controller.summon(authed, { confusion: "长".repeat(201) }),
    ).rejects.toThrow(BadRequestException);
    expect(summon).not.toHaveBeenCalled();

    const { controller: c2, summon: s2 } = makeController();
    const res = await c2.summon(authed, { confusion: "   " });
    expect(s2.mock.calls[0][1]).toMatchObject({ confusion: null });
    expect(res.source.title).toBe("《传习录》");
  });

  it("非对象 body → 400 invalid_body", async () => {
    const { controller, summon } = makeController();
    await expect(controller.summon(authed, [1, 2])).rejects.toThrow(BadRequestException);
    await expect(controller.summon(authed, null)).rejects.toThrow(BadRequestException);
    expect(summon).not.toHaveBeenCalled();
  });
});

describe("RenwenController.summon 异常映射", () => {
  it("每日上限 → 429 daily_limit_reached", async () => {
    const { controller } = makeController(async () => {
      throw new RenwenDailyLimitReached();
    });
    const err = await controller.summon(authed, {}).catch((e: HttpException) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
  });

  it("LLM 失败 → 503 renwen_unavailable", async () => {
    const { controller } = makeController(async () => {
      throw new RenwenReplyFailed("invalid_output");
    });
    const err = await controller.summon(authed, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
  });

  it("正常：201 契约含 figure / response / source.title / remainingToday", async () => {
    const { controller } = makeController();
    const res = await controller.summon(authed, { figureId: "wangyangming" });
    expect(res).toMatchObject({
      id: 1,
      figure: { id: "wangyangming", name: "王阳明" },
      response: "事上磨练。",
      source: { title: "《传习录》" },
      remainingToday: 2,
    });
    expect(res.figure).not.toHaveProperty("sources"); // 不泄出处原文
  });
});

describe("RenwenController.getFigures", () => {
  it("返回四位人物且不含出处原文", () => {
    const { controller } = makeController();
    const { figures } = controller.getFigures();
    expect(figures).toHaveLength(4);
    expect(figures[0]).toHaveProperty("styleHint");
    for (const f of figures) {
      expect(f).not.toHaveProperty("sources");
      expect(f).not.toHaveProperty("persona");
    }
  });
});
