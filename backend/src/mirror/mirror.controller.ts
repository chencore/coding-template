import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthedRequest } from "./device-id.middleware";
import { MirrorService } from "./mirror.service";

@Controller("mirror")
export class MirrorController {
  constructor(@Inject(MirrorService) private readonly mirror: MirrorService) {}

  @Get("today")
  async today(@Req() req: AuthedRequest) {
    return this.mirror.getToday(req.userId);
  }

  /** 首次回答 201，当天重复提交为更新 200 */
  @Put("today/answer")
  async answer(
    @Req() req: AuthedRequest,
    @Body() body: { text?: unknown },
    @Res({ passthrough: true }) res: Response,
  ) {
    const text = typeof body?.text === "string" ? body.text : "";
    const { response, created } = await this.mirror.submitAnswer(req.userId, text);
    res.status(created ? 201 : 200);
    return response;
  }

  @Get("entries")
  @HttpCode(200)
  async entries(
    @Req() req: AuthedRequest,
    @Query("before") before?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;
    return this.mirror.listEntries(
      req.userId,
      before ?? null,
      parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    );
  }
}
