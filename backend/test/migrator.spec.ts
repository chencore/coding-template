import { describe, expect, it, vi } from "vitest";
import { Migrator } from "../src/database/migrator";
import type { Database } from "../src/database/database";

// vitest 已沉淀约束：不用 beforeEach + mockReset（会把已 catch 的 rejection 误报 unhandled）；
// 每个用例用工厂函数建全新 mock，串联行为用 Once 变体。

interface FakeClient {
  query: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
}

function makeDb(appliedFiles: string[], client?: FakeClient) {
  const query = vi.fn();
  // CREATE TABLE IF NOT EXISTS schema_migrations
  query.mockResolvedValueOnce({ rows: [] });
  // SELECT filename FROM schema_migrations
  query.mockResolvedValueOnce({ rows: appliedFiles.map((f) => ({ filename: f })) });
  const connect = vi.fn().mockResolvedValue(client);
  return { pool: { query, connect } } as unknown as Database;
}

function makeClient(opts?: { failOnCall?: number }) {
  const client: FakeClient = { query: vi.fn(), release: vi.fn() };
  let call = 0;
  client.query.mockImplementation(() => {
    call += 1;
    if (opts?.failOnCall === call) return Promise.reject(new Error("boom"));
    return Promise.resolve({ rows: [] });
  });
  return client;
}

describe("Migrator.runPending", () => {
  it("全部迁移已跑过时跳过（返回空）", async () => {
    const migrator = new Migrator(
      makeDb(["0001_init.sql", "0002_mentor.sql", "0003_renwen.sql", "0004_cang.sql"]),
    );
    expect(await migrator.runPending()).toEqual([]);
  });

  it("新迁移按序执行并登记 schema_migrations", async () => {
    const client = makeClient();
    const migrator = new Migrator(makeDb([], client));
    const ran = await migrator.runPending();
    expect(ran).toEqual(["0001_init.sql", "0002_mentor.sql", "0003_renwen.sql", "0004_cang.sql"]);
    const calls = client.query.mock.calls.map((c) => String(c[0]));
    expect(calls[0]).toBe("BEGIN");
    expect(calls.some((s) => s.includes("CREATE TABLE users"))).toBe(true);
    expect(calls.some((s) => s.includes("mentor_name"))).toBe(true);
    expect(calls.some((s) => s.includes("CREATE TABLE renwen_sessions"))).toBe(true);
    expect(calls.some((s) => s.includes("INSERT INTO schema_migrations"))).toBe(true);
    expect(calls[calls.length - 1]).toBe("COMMIT");
    expect(client.release).toHaveBeenCalled();
  });

  it("迁移失败：回滚并抛错（启动失败语义），不登记", async () => {
    const client = makeClient({ failOnCall: 2 }); // BEGIN 后的 SQL 执行失败
    const migrator = new Migrator(makeDb([], client));
    await expect(migrator.runPending()).rejects.toThrow("migration failed: 0001_init.sql");
    const calls = client.query.mock.calls.map((c) => String(c[0]));
    expect(calls[calls.length - 1]).toBe("ROLLBACK");
    expect(calls.some((s) => s.includes("INSERT INTO schema_migrations"))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });
});
