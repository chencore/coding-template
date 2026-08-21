import { describe, expect, it, vi } from "vitest";
import { CangItemNotFound, CangService } from "../src/cang/cang.service";
import type { CangRepository } from "../src/cang/cang.repository";
import type { MentorService } from "../src/mentor/mentor.service";

// vitest 已沉淀约束：工厂函数建全新 mock；不用 beforeEach + mockReset。

function makeService(opts: {
  themes?: string[] | null;
  existing?: string[];
  taggingThrows?: boolean;
}) {
  const repo = {
    insertItem: vi.fn().mockResolvedValue({
      id: 9,
      userId: 7,
      text: "打动我的一句话。",
      sourceType: "mirror_answer",
      sourceLabel: "镜子 · 8月21日",
      createdAt: "2026-08-21T02:00:00.000Z",
    }),
    listThemeNames: vi.fn().mockResolvedValue(opts.existing ?? []),
    upsertTheme: vi.fn().mockResolvedValue(3),
    linkItemThemes: vi.fn().mockResolvedValue(undefined),
    listMap: vi.fn().mockResolvedValue({ themes: [], ungrouped: [] }),
    deleteItem: vi.fn().mockResolvedValue(true),
  };
  const mentor = {
    askCangThemes: opts.taggingThrows
      ? vi.fn().mockRejectedValue(new Error("boom"))
      : vi.fn().mockResolvedValue("themes" in opts ? opts.themes : ["选择"]),
  };
  const service = new CangService(
    repo as unknown as CangRepository,
    mentor as unknown as MentorService,
  );
  return { service, repo, mentor };
}

const input = {
  text: "打动我的一句话。",
  sourceType: "mirror_answer",
  sourceLabel: "镜子 · 8月21日",
};

describe("CangService.collect", () => {
  it("正向：先落库，再打标并关联（upsert 幂等），返回主题名", async () => {
    const { service, repo, mentor } = makeService({ existing: ["选择"] });
    const result = await service.collect(7, input);
    expect(result).toEqual({
      id: 9,
      themes: ["选择"],
      createdAt: "2026-08-21T02:00:00.000Z",
    });
    expect(mentor.askCangThemes).toHaveBeenCalledWith(7, {
      text: input.text,
      existingThemes: ["选择"],
    });
    expect(repo.upsertTheme).toHaveBeenCalledWith(7, "选择");
    expect(repo.linkItemThemes).toHaveBeenCalledWith(9, [3]);
  });

  it("打标返回 null：收藏仍成功，themes 为空，不写关联", async () => {
    const { service, repo } = makeService({ themes: null });
    const result = await service.collect(7, input);
    expect(result.themes).toEqual([]);
    expect(repo.upsertTheme).not.toHaveBeenCalled();
    expect(repo.linkItemThemes).not.toHaveBeenCalled();
  });

  it("打标链路抛错：静默跳过，收藏仍成功", async () => {
    const { service, repo } = makeService({ taggingThrows: true });
    const result = await service.collect(7, input);
    expect(result.id).toBe(9);
    expect(result.themes).toEqual([]);
    expect(repo.linkItemThemes).not.toHaveBeenCalled();
  });
});

describe("CangService.getMap / deleteItem", () => {
  it("getMap 透传 repository 结构", async () => {
    const { service, repo } = makeService({});
    const map = {
      themes: [{ name: "选择", count: 1, items: [] }],
      ungrouped: [],
    };
    repo.listMap.mockResolvedValue(map);
    expect(await service.getMap(7)).toBe(map);
  });

  it("deleteItem 正向；删不到抛 CangItemNotFound", async () => {
    const { service, repo } = makeService({});
    await service.deleteItem(7, 9);
    expect(repo.deleteItem).toHaveBeenCalledWith(7, 9);
    repo.deleteItem.mockResolvedValueOnce(false);
    await expect(service.deleteItem(7, 999)).rejects.toThrow(CangItemNotFound);
  });
});
