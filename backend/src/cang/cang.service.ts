import { Inject, Injectable, Logger } from "@nestjs/common";
import { CangRepository, type CangItem, type CangThemeGroup } from "./cang.repository";
import { MentorService } from "../mentor/mentor.service";

/** 删除不存在/他人条目 */
export class CangItemNotFound extends Error {
  constructor() {
    super("cang item not found");
    this.name = "CangItemNotFound";
  }
}

export interface CangMap {
  themes: CangThemeGroup[];
  ungrouped: CangItem[];
}

/**
 * 藏（个人知识库）业务服务。
 * 收藏是主行动：先落库再调 LLM 打标；打标任何失败静默跳过（留「未归组」），
 * 不阻塞收藏——design.md 决策 2。
 */
@Injectable()
export class CangService {
  private readonly logger = new Logger(CangService.name);

  constructor(
    @Inject(CangRepository) private readonly repo: CangRepository,
    @Inject(MentorService) private readonly mentor: MentorService,
  ) {}

  async collect(
    userId: number,
    input: { text: string; sourceType: string; sourceLabel: string | null },
  ): Promise<{ id: number; themes: string[]; createdAt: string }> {
    const item = await this.repo.insertItem(userId, input);
    this.logger.log(
      `collect: item ${item.id} from ${input.sourceType} (user ${userId})`,
    );

    let themes: string[] = [];
    try {
      const existing = await this.repo.listThemeNames(userId);
      const picked = await this.mentor.askCangThemes(userId, {
        text: input.text,
        existingThemes: existing,
      });
      if (picked?.length) {
        const ids = await Promise.all(
          picked.map((name) => this.repo.upsertTheme(userId, name)),
        );
        await this.repo.linkItemThemes(item.id, ids);
        themes = picked;
      }
    } catch (err) {
      // 打标链路任何异常（含 DB）都不阻塞收藏——只记类别，不记收藏文本
      this.logger.warn(
        `collect: tagging skipped: ${err instanceof Error ? err.name : "unknown"}`,
      );
    }

    return { id: item.id, themes, createdAt: item.createdAt };
  }

  async getMap(userId: number): Promise<CangMap> {
    return this.repo.listMap(userId);
  }

  async deleteItem(userId: number, id: number): Promise<void> {
    const deleted = await this.repo.deleteItem(userId, id);
    if (!deleted) throw new CangItemNotFound();
    this.logger.log(`deleteItem: item ${id} (user ${userId})`);
  }
}
