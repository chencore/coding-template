import { Inject, Injectable, Logger } from "@nestjs/common";
import { Database } from "../database/database";

/**
 * 数据库探针：基于共享 Pool 的健康检查。
 */
@Injectable()
export class DbProbe {
  private readonly logger = new Logger(DbProbe.name);

  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(@Inject(Database) private readonly db: Database) {}

  async ping(): Promise<"up" | "down"> {
    try {
      await this.db.pool.query("SELECT 1");
      return "up";
    } catch (err) {
      this.logger.warn(`db ping failed: ${(err as Error).message}`);
      return "down";
    }
  }
}
