import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import pg from "pg";

/**
 * 数据库探针：单连接池，仅用于健康检查。
 * 业务数据访问层在后续变更中引入，本模块不得被业务模块复用。
 */
@Injectable()
export class DbProbe {
  private readonly logger = new Logger(DbProbe.name);
  private readonly pool: pg.Pool;

  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(@Inject(ConfigService) config: ConfigService) {
    this.pool = new pg.Pool({
      user: config.get<string>("DB_USER", "zhaojian"),
      password: config.get<string>("DB_PASSWORD", "zhaojian_dev"),
      database: config.get<string>("DB_NAME", "zhaojian"),
      host: config.get<string>("DB_HOST", "localhost"),
      port: config.get<number>("DB_PORT", 5432),
      connectionTimeoutMillis: 3000,
      max: 2,
    });
    // 池内空闲连接报错不应打爆进程；记录即可
    this.pool.on("error", (err) => {
      this.logger.warn(`idle db client error: ${err.message}`);
    });
  }

  async ping(): Promise<"up" | "down"> {
    try {
      await this.pool.query("SELECT 1");
      return "up";
    } catch (err) {
      this.logger.warn(`db ping failed: ${(err as Error).message}`);
      return "down";
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
