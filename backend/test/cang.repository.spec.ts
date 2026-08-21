import { describe, expect, it, vi } from "vitest";
import { CangRepository } from "../src/cang/cang.repository";
import type { Database } from "../src/database/database";

// vitest 已沉淀约束：工厂函数建全新 mock；不用 beforeEach + mockReset。

function makeRepo() {
  const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  const repo = new CangRepository({ pool: { query } } as unknown as Database);
  return { repo, query };
}

function itemRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "1",
    user_id: "7",
    text: "打动我的一句话。",
    source_type: "mirror_answer",
    source_label: "镜子 · 8月21日",
    created_at: new Date("2026-08-21T02:00:00Z"),
    theme_id: null,
    theme_name: null,
    ...overrides,
  };
}

describe("CangRepository.insertItem", () => {
  it("插入并映射为 camelCase（created_at 转 ISO）", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [itemRow()], rowCount: 1 });
    const item = await repo.insertItem(7, {
      text: "打动我的一句话。",
      sourceType: "mirror_answer",
      sourceLabel: "镜子 · 8月21日",
    });
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO cang_items");
    expect(query.mock.calls[0][1]).toEqual([
      7,
      "打动我的一句话。",
      "mirror_answer",
      "镜子 · 8月21日",
    ]);
    expect(item).toMatchObject({
      id: 1,
      sourceType: "mirror_answer",
      sourceLabel: "镜子 · 8月21日",
      createdAt: "2026-08-21T02:00:00.000Z",
    });
  });

  it("sourceLabel 可空（manual）", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({
      rows: [itemRow({ source_type: "manual", source_label: null })],
      rowCount: 1,
    });
    const item = await repo.insertItem(7, {
      text: "随手一记。",
      sourceType: "manual",
      sourceLabel: null,
    });
    expect(query.mock.calls[0][1]?.[3]).toBeNull();
    expect(item.sourceLabel).toBeNull();
  });
});

describe("CangRepository 主题", () => {
  it("listThemeNames：按创建先后返回主题名", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({
      rows: [{ name: "选择" }, { name: "怕输" }],
      rowCount: 2,
    });
    expect(await repo.listThemeNames(7)).toEqual(["选择", "怕输"]);
    expect(query.mock.calls[0][1]).toEqual([7]);
  });

  it("upsertTheme：ON CONFLICT 幂等返回 id", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({ rows: [{ id: "3" }], rowCount: 1 });
    expect(await repo.upsertTheme(7, "选择")).toBe(3);
    expect(String(query.mock.calls[0][0])).toContain("ON CONFLICT");
  });

  it("linkItemThemes：逐条关联且冲突忽略", async () => {
    const { repo, query } = makeRepo();
    await repo.linkItemThemes(9, [3, 4]);
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[0][0])).toContain("ON CONFLICT DO NOTHING");
    expect(query.mock.calls[1][1]).toEqual([9, 4]);
  });
});

describe("CangRepository.listMap", () => {
  it("主题分组按条数降序，未归组单列", async () => {
    const { repo, query } = makeRepo();
    query.mockResolvedValueOnce({
      rows: [
        itemRow({ id: "1", theme_id: "10", theme_name: "选择" }),
        itemRow({ id: "2", theme_id: "10", theme_name: "选择" }),
        itemRow({ id: "3", theme_id: "11", theme_name: "怕输" }),
        itemRow({ id: "4" }),
      ],
      rowCount: 4,
    });
    const map = await repo.listMap(7);
    expect(map.themes.map((t) => [t.name, t.count])).toEqual([
      ["选择", 2],
      ["怕输", 1],
    ]);
    expect(map.ungrouped.map((i) => i.id)).toEqual([4]);
  });

  it("空藏返回空结构", async () => {
    const { repo } = makeRepo();
    const map = await repo.listMap(7);
    expect(map).toEqual({ themes: [], ungrouped: [] });
  });
});

describe("CangRepository.deleteItem", () => {
  it("删到本人条目返回 true，并清理 0 条主题", async () => {
    const { repo, query } = makeRepo();
    query
      .mockResolvedValueOnce({ rows: [{ theme_id: "10" }], rowCount: 1 }) // 查关联主题
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // 删条目
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // 清 0 条主题
    expect(await repo.deleteItem(7, 1)).toBe(true);
    expect(String(query.mock.calls[1][0])).toContain(
      "DELETE FROM cang_items WHERE id = $1 AND user_id = $2",
    );
    expect(String(query.mock.calls[2][0])).toContain("DELETE FROM cang_themes");
    expect(query.mock.calls[2][1]).toEqual([10]);
  });

  it("删他人/不存在条目返回 false", async () => {
    const { repo, query } = makeRepo();
    query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.deleteItem(7, 999)).toBe(false);
    expect(query).toHaveBeenCalledTimes(2); // 不触发主题清理
  });
});
