import { describe, expect, it, vi } from "vitest";
import { RenwenRepository } from "../src/renwen/renwen.repository";
import type { Database } from "../src/database/database";

// vitest 已沉淀约束：工厂函数建全新 mock；不用 beforeEach + mockReset。

function makeRepo(rows: unknown[], rowCount = 1) {
  const query = vi.fn().mockResolvedValue({ rows, rowCount });
  const repo = new RenwenRepository({ pool: { query } } as unknown as Database);
  return { repo, query };
}

function sessionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "1",
    user_id: "7",
    figure: "wangyangming",
    confusion: "想辞职又怕选错。",
    response: "事上磨练，答案在做之中。",
    source_id: "wym-chuanxilu-1",
    source_title: "《传习录》",
    created_at: new Date("2026-08-19T02:00:00Z"),
    ...overrides,
  };
}

describe("RenwenRepository.insertSession", () => {
  it("插入并映射为 camelCase（created_at 转 ISO 字符串）", async () => {
    const { repo, query } = makeRepo([sessionRow()]);
    const s = await repo.insertSession(7, {
      figure: "wangyangming",
      confusion: "想辞职又怕选错。",
      response: "事上磨练，答案在做之中。",
      sourceId: "wym-chuanxilu-1",
      sourceTitle: "《传习录》",
    });
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO renwen_sessions");
    expect(query.mock.calls[0][1]).toEqual([
      7,
      "wangyangming",
      "想辞职又怕选错。",
      "事上磨练，答案在做之中。",
      "wym-chuanxilu-1",
      "《传习录》",
    ]);
    expect(s).toMatchObject({
      id: 1,
      figure: "wangyangming",
      sourceTitle: "《传习录》",
      createdAt: "2026-08-19T02:00:00.000Z",
    });
  });

  it("confusion 可空", async () => {
    const { repo, query } = makeRepo([sessionRow({ confusion: null })]);
    const s = await repo.insertSession(7, {
      figure: "socrates",
      confusion: null,
      response: "r",
      sourceId: "soc-apology-1",
      sourceTitle: "《申辩篇》",
    });
    expect(query.mock.calls[0][1]?.[2]).toBeNull();
    expect(s.confusion).toBeNull();
  });
});

describe("RenwenRepository 计数", () => {
  it("countToday：以 dayStartMs（Date）为下界过滤", async () => {
    const { repo, query } = makeRepo([{ n: "2" }]);
    const dayStart = Date.parse("2026-08-18T16:00:00Z");
    expect(await repo.countToday(7, dayStart)).toBe(2);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("created_at >=");
    expect(params).toEqual([7, new Date(dayStart)]);
  });

  it("countByFigure / countAll：按人物与全量计数", async () => {
    const { repo, query } = makeRepo([{ n: "3" }]);
    expect(await repo.countByFigure(7, "aurelius")).toBe(3);
    expect(query.mock.calls[0][1]).toEqual([7, "aurelius"]);
    const { repo: repo2, query: query2 } = makeRepo([{ n: "5" }]);
    expect(await repo2.countAll(7)).toBe(5);
    expect(query2.mock.calls[0][1]).toEqual([7]);
  });
});

describe("RenwenRepository.listRecent", () => {
  it("按时间倒序取 N 条", async () => {
    const { repo, query } = makeRepo([sessionRow(), sessionRow({ id: "2" })]);
    const list = await repo.listRecent(7, 20);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("ORDER BY created_at DESC");
    expect(params).toEqual([7, 20]);
    expect(list).toHaveLength(2);
  });
});
