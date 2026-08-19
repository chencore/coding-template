import { Inject, Injectable, Logger } from "@nestjs/common";
import { shanghaiDayStartMs } from "../common/shanghai-date";
import { MentorService } from "../mentor/mentor.service";
import { getFigure, pickFigure, pickSource, type RenwenFigure } from "./canon";
import { RenwenRepository, type RenwenSession } from "./renwen.repository";

export const DAILY_SUMMON_LIMIT = 3;

/** 每日上限：controller 映射 429 */
export class RenwenDailyLimitReached extends Error {
  constructor() {
    super("daily_limit_reached");
    this.name = "RenwenDailyLimitReached";
  }
}

export interface SummonResult {
  session: RenwenSession;
  figure: RenwenFigure;
  sourceTitle: string;
  remainingToday: number;
}

/**
 * 人文导师团召唤编排（design.md 决策 3/5/6）：
 * 上限检查 → 定人物（指定 / 导师代选轮转）→ 定出处（轮转）→ LLM → 落库。
 * LLM 失败抛错由 controller 映射 503，不落库——召唤是主动作，不做假兜底。
 */
@Injectable()
export class RenwenService {
  private readonly logger = new Logger(RenwenService.name);

  constructor(
    @Inject(RenwenRepository) private readonly repo: RenwenRepository,
    @Inject(MentorService) private readonly mentor: MentorService,
  ) {}

  async summon(
    userId: number,
    input: { figureId: string | null; confusion: string | null },
  ): Promise<SummonResult> {
    const used = await this.repo.countToday(userId, shanghaiDayStartMs());
    if (used >= DAILY_SUMMON_LIMIT) {
      this.logger.log(`summon: daily limit reached (used=${used})`);
      throw new RenwenDailyLimitReached();
    }

    // 人物：用户指定优先；否则「导师代选」= 累计召唤数轮转四位（决策 3）
    const figure = input.figureId
      ? (getFigure(input.figureId) as RenwenFigure) // controller 已校验，此处必中
      : pickFigure(await this.repo.countAll(userId));
    // 出处：该人物累计召唤数轮转条目，同人不同出处
    const source = pickSource(figure, await this.repo.countByFigure(userId, figure.id));

    const response = await this.mentor.askRenwenReply(userId, {
      figurePersona: figure.persona,
      figureName: figure.name,
      source: { title: source.title, text: source.text },
      confusion: input.confusion,
    });

    const session = await this.repo.insertSession(userId, {
      figure: figure.id,
      confusion: input.confusion,
      response,
      sourceId: source.id,
      sourceTitle: source.title,
    });
    this.logger.log(`summon: figure=${figure.id} source=${source.id}`);
    return {
      session,
      figure,
      sourceTitle: source.title,
      remainingToday: DAILY_SUMMON_LIMIT - used - 1,
    };
  }

  listSessions(userId: number): Promise<RenwenSession[]> {
    return this.repo.listRecent(userId, 20);
  }
}
