import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import pg from "pg";

// DATE(1082) 保持 'YYYY-MM-DD' 字符串，不做 JS Date 时区转换——entry_date 是 Asia/Shanghai 日历日
pg.types.setTypeParser(1082, (v: string) => v);

/**
 * 共享数据库连接池（全应用单例）。
 * 所有业务模块通过注入本 Pool 做数据访问，不得各自建池。
 */
@Injectable()
export class Database implements OnModuleDestroy {
  private readonly logger = new Logger(Database.name);
  readonly pool: pg.Pool;

  // 显式 @Inject：tsx/esbuild 不保证 emitDecoratorMetadata，不能依赖按类型注入
  constructor(@Inject(ConfigService) config: ConfigService) {
    this.pool = new pg.Pool({
      user: config.get<string>("DB_USER", "zhaojian"),
      password: config.get<string>("DB_PASSWORD", "zhaojian_dev"),
      database: config.get<string>("DB_NAME", "zhaojian"),
      host: config.get<string>("DB_HOST", "localhost"),
      port: config.get<number>("DB_PORT", 5432),
      connectionTimeoutMillis: 3000,
      max: 10,
    });
    // 池内空闲连接报错不应打爆进程；记录即可
    this.pool.on("error", (err) => {
      this.logger.warn(`idle db client error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
