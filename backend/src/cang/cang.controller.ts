import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { AuthedRequest } from "../common/device-id.middleware";
import { CangItemNotFound, CangService } from "./cang.service";

const TEXT_MAX_LEN = 2000;
const LABEL_MAX_LEN = 64;
const SOURCE_TYPES = new Set([
  "mirror_answer",
  "mentor_reply",
  "renwen_reply",
  "manual",
]);

@Controller("cang")
export class CangController {
  constructor(@Inject(CangService) private readonly cang: CangService) {}

  /** 收藏：三处一键 + 手动。参数 400 先于任何落库/LLM。 */
  @Post("items")
  @HttpCode(201)
  async collect(@Req() req: AuthedRequest, @Body() body: unknown) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("invalid_body");
    }
    const { text, sourceType, sourceLabel } = body as {
      text?: unknown;
      sourceType?: unknown;
      sourceLabel?: unknown;
    };

    if (typeof text !== "string" || !text.trim()) {
      throw new BadRequestException("empty_text");
    }
    if (text.trim().length > TEXT_MAX_LEN) {
      throw new BadRequestException("text_too_long");
    }
    if (typeof sourceType !== "string" || !SOURCE_TYPES.has(sourceType)) {
      throw new BadRequestException("invalid_source");
    }
    let label: string | null = null;
    if (sourceLabel !== undefined && sourceLabel !== null) {
      if (typeof sourceLabel !== "string" || sourceLabel.length > LABEL_MAX_LEN) {
        throw new BadRequestException("label_too_long");
      }
      label = sourceLabel.trim() || null;
    }

    return this.cang.collect(req.userId, {
      text: text.trim(),
      sourceType,
      sourceLabel: label,
    });
  }

  /** 思想地图：主题分组（条数降序）+ 未归组在尾；剥掉内部字段 userId */
  @Get("map")
  async getMap(@Req() req: AuthedRequest) {
    const map = await this.cang.getMap(req.userId);
    const strip = ({ id, text, sourceType, sourceLabel, createdAt }: {
      id: number;
      text: string;
      sourceType: string;
      sourceLabel: string | null;
      createdAt: string;
    }) => ({ id, text, sourceType, sourceLabel, createdAt });
    return {
      themes: map.themes.map((t) => ({
        name: t.name,
        count: t.count,
        items: t.items.map(strip),
      })),
      ungrouped: map.ungrouped.map(strip),
    };
  }

  /** 删除本人条目；他人/不存在一律 404（不泄露存在性） */
  @Delete("items/:id")
  @HttpCode(204)
  async deleteItem(@Req() req: AuthedRequest, @Param("id") id: string) {
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestException("invalid_id");
    }
    try {
      await this.cang.deleteItem(req.userId, itemId);
    } catch (err) {
      if (err instanceof CangItemNotFound) {
        throw new NotFoundException("item_not_found");
      }
      throw err;
    }
  }
}
