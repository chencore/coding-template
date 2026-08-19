import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { AuthedRequest } from "../common/device-id.middleware";
import { RenwenReplyFailed } from "../mentor/mentor.service";
import { FIGURES, getFigure } from "./canon";
import { RenwenDailyLimitReached, RenwenService } from "./renwen.service";

const CONFUSION_MAX_LEN = 200;

@Controller("renwen")
export class RenwenController {
  constructor(@Inject(RenwenService) private readonly renwen: RenwenService) {}

  /** 选择器数据：不含出处原文（决策 7） */
  @Get("figures")
  getFigures() {
    return {
      figures: FIGURES.map(({ id, name, epithet, styleHint }) => ({
        id,
        name,
        epithet,
        styleHint,
      })),
    };
  }

  /**
   * 召唤：figureId / confusion 均可空。
   * 参数 400 先于上限 429（参数不合法不消耗当日次数的语义更清晰）。
   */
  @Post("summon")
  @HttpCode(201)
  async summon(@Req() req: AuthedRequest, @Body() body: unknown) {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("invalid_body");
    }
    const { figureId, confusion } = body as {
      figureId?: unknown;
      confusion?: unknown;
    };

    if (figureId !== undefined && figureId !== null) {
      if (typeof figureId !== "string" || !getFigure(figureId)) {
        throw new BadRequestException("invalid_figure");
      }
    }
    let confusionText: string | null = null;
    if (confusion !== undefined && confusion !== null) {
      if (typeof confusion !== "string") throw new BadRequestException("confusion_too_long");
      confusionText = confusion.trim() || null;
      if (confusionText && confusionText.length > CONFUSION_MAX_LEN) {
        throw new BadRequestException("confusion_too_long");
      }
    }

    try {
      const result = await this.renwen.summon(req.userId, {
        figureId: (figureId as string | undefined) ?? null,
        confusion: confusionText,
      });
      return {
        id: result.session.id,
        figure: {
          id: result.figure.id,
          name: result.figure.name,
          epithet: result.figure.epithet,
        },
        response: result.session.response,
        source: { title: result.sourceTitle },
        remainingToday: result.remainingToday,
        createdAt: result.session.createdAt,
      };
    } catch (err) {
      if (err instanceof RenwenDailyLimitReached) {
        throw new HttpException("daily_limit_reached", 429);
      }
      if (err instanceof RenwenReplyFailed) {
        throw new ServiceUnavailableException("renwen_unavailable");
      }
      throw err;
    }
  }

  /** 历史回看：最近 20 条倒序 */
  @Get("sessions")
  async getSessions(@Req() req: AuthedRequest) {
    const sessions = await this.renwen.listSessions(req.userId);
    return {
      sessions: sessions.map((s) => {
        const figure = getFigure(s.figure);
        return {
          id: s.id,
          figure: {
            id: s.figure,
            name: figure?.name ?? s.figure,
            epithet: figure?.epithet ?? "",
          },
          confusion: s.confusion,
          response: s.response,
          source: { title: s.sourceTitle },
          createdAt: s.createdAt,
        };
      }),
    };
  }
}
