import { describe, expect, it, vi } from "vitest";
import { HealthService } from "../src/health/health.service";
import type { DbProbe } from "../src/health/db.probe";

function makeService(ping: () => Promise<"up" | "down">) {
  const db = { ping, close: vi.fn() } as unknown as DbProbe;
  return new HealthService(db);
}

describe("HealthService.checkDb", () => {
  it("db 可达时返回 up", async () => {
    const svc = makeService(() => Promise.resolve("up"));
    expect(await svc.checkDb()).toBe("up");
  });

  it("db 不可达时返回 down（由探针归一，service 不抛错）", async () => {
    const svc = makeService(() => Promise.resolve("down"));
    expect(await svc.checkDb()).toBe("down");
  });
});
