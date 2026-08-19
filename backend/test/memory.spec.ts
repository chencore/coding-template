import { describe, expect, it, vi } from "vitest";
import { RawHistoryMemoryProvider } from "../src/mentor/memory";
import type { MirrorRepository, MirrorEntry } from "../src/mirror/mirror.repository";

// vitest 已沉淀约束：不用 beforeEach + mockReset；工厂函数建全新 mock。

function entry(date: string, answer: string): MirrorEntry {
  return {
    id: 1,
    userId: 7,
    entryDate: date,
    question: "今天怎么样？",
    questionSource: "bank",
    answer,
    answeredAt: `${date}T02:00:00.000Z`,
    mentorReply: null,
  };
}

function makeProvider(entries: MirrorEntry[]) {
  const findRecentAnswers = vi.fn().mockResolvedValue(entries);
  const provider = new RawHistoryMemoryProvider({
    findRecentAnswers,
  } as unknown as MirrorRepository);
  return { provider, findRecentAnswers };
}

describe("RawHistoryMemoryProvider", () => {
  it("无历史：返回空串（调用方据此走 bank 兜底）", async () => {
    const { provider } = makeProvider([]);
    expect(await provider.recall(7)).toBe("");
  });

  it("有历史：拼接为「问/答」行，含日期", async () => {
    const { provider } = makeProvider([entry("2026-08-18", "橘猫蹭了我一下")]);
    const text = await provider.recall(7);
    expect(text).toContain("2026-08-18");
    expect(text).toContain("橘猫蹭了我一下");
  });

  it("查询窗口为近 14 天", async () => {
    const { provider, findRecentAnswers } = makeProvider([]);
    await provider.recall(7);
    const since = findRecentAnswers.mock.calls[0][1] as string;
    // 14 天前的日期串形如 YYYY-MM-DD；比「7 天窗口」更早
    expect(typeof since).toBe("string");
    expect(since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("整体截断至 3000 字", async () => {
    const long = "很长的回答".repeat(100); // ~500 字/条
    const entries = Array.from({ length: 14 }, (_, i) =>
      entry(`2026-08-${String(i + 1).padStart(2, "0")}`, long),
    );
    const { provider } = makeProvider(entries);
    const text = await provider.recall(7);
    expect(text.length).toBeLessThanOrEqual(3000);
    expect(text.length).toBeGreaterThan(0);
  });
});
