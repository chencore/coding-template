import { Global, Module } from "@nestjs/common";
import { Database } from "./database";
import { Migrator } from "./migrator";

/**
 * 共享数据库模块：全局单例 Pool + 启动迁移。
 * 业务模块直接注入 Database，无需重复 import。
 */
@Global()
@Module({
  providers: [Database, Migrator],
  exports: [Database],
})
export class DatabaseModule {}
