import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Database } from "./database";

// 迁移目录：backend/migrations（src 与 dist 结构下 ../../migrations 均指向它）
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");

/**
 * SQL 顺序迁移执行器：启动时比对 schema_migrations 表，执行未跑的 backend/migrations/*.sql。
 * 任一迁移失败 → 抛错 → 应用启动失败，不半迁移运行。
 */
@Injectable()
export class Migrator implements OnModuleInit {
  private readonly logger = new Logger(Migrator.name);

  constructor(@Inject(Database) private readonly db: Database) {}

  async onModuleInit() {
    await this.runPending();
  }

  async runPending(): Promise<string[]> {
    // schema_migrations 由 0001_init.sql 创建；此处先保证存在以支持读取已跑清单
    await this.db.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const applied = new Set(
      (
        await this.db.pool.query<{ filename: string }>(
          "SELECT filename FROM schema_migrations",
        )
      ).rows.map((r) => r.filename),
    );

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const pending = files.filter((f) => !applied.has(f));

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const client = await this.db.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        this.logger.log(`migration applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        // 启动失败语义：抛出即中止 Nest 启动
        throw new Error(`migration failed: ${file}: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
    return pending;
  }
}
