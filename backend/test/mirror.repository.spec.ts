import { describe, expect, it, vi } from "vitest";
import { MirrorRepository } from "../src/mirror/mirror.repository";
import type { Database } from "../src/database/database";

// vitest 已沉淀约束：不用 beforeEach + mockReset；工厂函数建全新 mock，Once 变体串联行为。

function makeRepo(rows: unknown[]) {
  const query = vi.fn().mockResolvedValue({ rows });
  const repo = new MirrorRepository({ pool: { query } } as unknown as Database);
  return { repo, query };
}

function entryRow(date: string, answer: string | null = "回答") {
  return {
    id: "1",
    user_id: "7",
    entry_date: date,
    question: "今天发生了什么？",
    question_source: "bank",
    answer,
    answered_at: answer ? new Date("2026-08-18T02:00:00Z") : null,
  };
}

describe("MirrorRepository.findByDate", () => {
  it("有记录：snake_case 行映射为 camelCase，日期保持字符串", async () => {
    const { repo } = makeRepo([entryRow("2026-08-18", null)]);
    const entry = await repo.findByDate(7, "2026-08-18");
    expect(entry).toMatchObject({
      userId: 7,
      entryDate: "2026-08-18",
      questionSource: "bank",
      answer: null,
      answeredAt: null,
    });
  });

  it("无记录返回 null", async () => {
    const { repo } = makeRepo([]);
    expect(await repo.findByDate(7, "2026-08-18")).toBeNull();
  });
});

describe("MirrorRepository.updateAnswer", () => {
  it("更新成功返回映射后的 entry", async () => {
    const { repo, query } = makeRepo([entryRow("2026-08-18", "橘猫蹭了我一下")]);
    const entry = await repo.updateAnswer(7, "2026-08-18", "橘猫蹭了我一下");
    expect(String(query.mock.calls[0][0])).toContain("UPDATE mirror_entries");
    expect(entry.answer).toBe("橘猫蹭了我一下");
    expect(entry.answeredAt).toBe("2026-08-18T02:00:00.000Z");
  });

  it("目标条目不存在时抛错（服务层须先 ensure）", async () => {
    const { repo } = makeRepo([]);
    await expect(repo.updateAnswer(7, "2026-08-18", "x")).rejects.toThrow("entry not found");
  });
});

describe("MirrorRepository.findEntries（声音档案分页）", () => {
  it("多于 limit：截取 limit 条，nextBefore 指向本页最旧日期", async () => {
    const { repo, query } = makeRepo([
      entryRow("2026-08-18"),
      entryRow("2026-08-17"),
      entryRow("2026-08-16"), // 多取的 1 条，用于判断还有更早
    ]);
    const { entries, nextBefore } = await repo.findEntries(7, null, 2);
    expect(entries.map((e) => e.entryDate)).toEqual(["2026-08-18", "2026-08-17"]);
    expect(nextBefore).toBe("2026-08-17");
    expect(query.mock.calls[0][1]).toEqual([7, null, 3]);
  });

  it("不足 limit：nextBefore 为 null", async () => {
    const { repo } = makeRepo([entryRow("2026-08-16")]);
    const { entries, nextBefore } = await repo.findEntries(7, "2026-08-17", 2);
    expect(entries).toHaveLength(1);
    expect(nextBefore).toBeNull();
  });
});
