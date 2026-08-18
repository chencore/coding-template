import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DbProbe } from "./db.probe";

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);

  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(@Inject(DbProbe) private readonly db: DbProbe) {}

  async onModuleInit() {
    const status = await this.checkDb();
    this.logger.log(`database connection on startup: ${status}`);
  }

  /** 返回 "up" | "down"；任何连接错误都归一为 down，由调用方决定降级响应 */
  checkDb(): Promise<"up" | "down"> {
    return this.db.ping();
  }
}
