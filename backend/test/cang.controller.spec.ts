import { describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { CangController } from "../src/cang/cang.controller";
import { CangItemNotFound, CangService } from "../src/cang/cang.service";
import type { AuthedRequest } from "../src/common/device-id.middleware";

// vitest 已沉淀约束：工厂函数建全新 mock；不用 beforeEach + mockReset。

function makeController(opts?: {
  collectImpl?: () => Promise<{ id: number; themes: string[]; createdAt: string }>;
  deleteImpl?: () => Promise<void>;
}) {
  const service = {
    collect: vi
      .fn()
      .mockImplementation(
        opts?.collectImpl ??
          (async () => ({
            id: 9,
            themes: ["选择"],
            createdAt: "2026-08-21T02:00:00.000Z",
          })),
      ),
    getMap: vi.fn().mockResolvedValue({ themes: [], ungrouped: [] }),
    deleteItem: vi.fn().mockImplementation(opts?.deleteImpl ?? (async () => {})),
  };
  const controller = new CangController(service as unknown as CangService);
  const req = { userId: 7 } as AuthedRequest;
  return { controller, service, req };
}

const validBody = {
  text: "打动我的一句话。",
  sourceType: "mirror_answer",
  sourceLabel: "镜子 · 8月21日",
};

describe("CangController.collect", () => {
  it("正向：201 结构透传，text trim 后入服务", async () => {
    const { controller, service, req } = makeController();
    const result = await controller.collect(req, {
      ...validBody,
      text: "  打动我的一句话。  ",
    });
    expect(result).toEqual({
      id: 9,
      themes: ["选择"],
      createdAt: "2026-08-21T02:00:00.000Z",
    });
    expect(service.collect).toHaveBeenCalledWith(7, {
      text: "打动我的一句话。",
      sourceType: "mirror_answer",
      sourceLabel: "镜子 · 8月21日",
    });
  });

  it("打标失败（themes 空）也照常返回 201 结构", async () => {
    const { controller, req } = makeController({
      collectImpl: async () => ({
        id: 9,
        themes: [],
        createdAt: "2026-08-21T02:00:00.000Z",
      }),
    });
    const result = await controller.collect(req, validBody);
    expect(result.themes).toEqual([]);
  });

  it("参数非法：四码分别 400", async () => {
    const { controller, service, req } = makeController();
    await expect(
      controller.collect(req, { ...validBody, text: "   " }),
    ).rejects.toThrow(new BadRequestException("empty_text"));
    await expect(
      controller.collect(req, { ...validBody, text: "字".repeat(2001) }),
    ).rejects.toThrow(new BadRequestException("text_too_long"));
    await expect(
      controller.collect(req, { ...validBody, sourceType: "weibo" }),
    ).rejects.toThrow(new BadRequestException("invalid_source"));
    await expect(
      controller.collect(req, { ...validBody, sourceLabel: "标".repeat(65) }),
    ).rejects.toThrow(new BadRequestException("label_too_long"));
    expect(service.collect).not.toHaveBeenCalled();
  });

  it("manual 无 sourceLabel：传 null", async () => {
    const { controller, service, req } = makeController();
    await controller.collect(req, { text: "随手一记。", sourceType: "manual" });
    expect(service.collect).toHaveBeenCalledWith(7, {
      text: "随手一记。",
      sourceType: "manual",
      sourceLabel: null,
    });
  });
});

describe("CangController.getMap / deleteItem", () => {
  it("getMap 透传分组结构，并剥掉内部字段 userId", async () => {
    const { controller, service, req } = makeController();
    service.getMap.mockResolvedValueOnce({
      themes: [
        {
          name: "选择",
          count: 1,
          items: [
            {
              id: 1,
              userId: 7,
              text: "t",
              sourceType: "manual",
              sourceLabel: null,
              createdAt: "2026-08-21T02:00:00.000Z",
            },
          ],
        },
      ],
      ungrouped: [],
    });
    const result = await controller.getMap(req);
    expect(result.themes[0].items[0]).toEqual({
      id: 1,
      text: "t",
      sourceType: "manual",
      sourceLabel: null,
      createdAt: "2026-08-21T02:00:00.000Z",
    });
    expect(result.themes[0].items[0]).not.toHaveProperty("userId");
  });

  it("deleteItem 正向 204；CangItemNotFound → 404", async () => {
    const { controller, service, req } = makeController({
      deleteImpl: async () => {
        throw new CangItemNotFound();
      },
    });
    await expect(controller.deleteItem(req, "999")).rejects.toThrow(
      new NotFoundException("item_not_found"),
    );
    expect(service.deleteItem).toHaveBeenCalledWith(7, 999);

    const ok = makeController();
    await expect(ok.controller.deleteItem(req, "9")).resolves.toBeUndefined();
  });

  it("deleteItem 非法 id → 400 invalid_id", async () => {
    const { controller, service, req } = makeController();
    await expect(controller.deleteItem(req, "abc")).rejects.toThrow(
      new BadRequestException("invalid_id"),
    );
    expect(service.deleteItem).not.toHaveBeenCalled();
  });
});
