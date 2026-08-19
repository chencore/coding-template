import { Inject, Injectable } from "@nestjs/common";
import { shanghaiDaysAgo } from "../common/shanghai-date";
import { MirrorRepository } from "../mirror/mirror.repository";

/** 导师记忆提供者：返回可注入 prompt 的记忆文本（无记忆返回空串） */
export interface MemoryProvider {
  recall(userId: number): Promise<string>;
}

/** 注入令牌：蒸馏记忆落地时换实现，场景方不改（design.md 决策 3） */
export const MEMORY_PROVIDER = "MEMORY_PROVIDER";

const MEMORY_DAYS = 14;
const MEMORY_MAX_CHARS = 3000;

/**
 * 记忆 V1 = 原始历史注入：近 14 天镜子回答原文（日期倒序），整体截断至 3000 字。
 * 日志不落此内容（含用户回答）。
 */
@Injectable()
export class RawHistoryMemoryProvider implements MemoryProvider {
  constructor(@Inject(MirrorRepository) private readonly repo: MirrorRepository) {}

  async recall(userId: number): Promise<string> {
    const entries = await this.repo.findRecentAnswers(
      userId,
      shanghaiDaysAgo(MEMORY_DAYS),
    );
    let text = "";
    for (const e of entries) {
      const line = `- ${e.entryDate} 问：${e.question}\n  答：${e.answer ?? ""}\n`;
      if (text.length + line.length > MEMORY_MAX_CHARS) break;
      text += line;
    }
    return text;
  }
}
