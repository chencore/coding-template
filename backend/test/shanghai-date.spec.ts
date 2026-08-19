import { describe, expect, it } from "vitest";
import { shanghaiDayStartMs, shanghaiToday } from "../src/common/shanghai-date";

describe("shanghaiDayStartMs（renwen 每日上限的「当日」口径）", () => {
  it("UTC 16:00 已是上海次日：dayStart 为上海 0 点（UTC 前一日 16:00）", () => {
    // 2026-08-19T16:00:00Z = 上海 2026-08-20 00:00
    const now = Date.parse("2026-08-19T16:00:00Z");
    expect(shanghaiToday(now)).toBe("2026-08-20");
    expect(shanghaiDayStartMs(now)).toBe(Date.parse("2026-08-19T16:00:00Z"));
  });

  it("UTC 15:59:59 仍是上海当日 23:59：dayStart 为上海当日 0 点", () => {
    const now = Date.parse("2026-08-19T15:59:59Z");
    expect(shanghaiToday(now)).toBe("2026-08-19");
    expect(shanghaiDayStartMs(now)).toBe(Date.parse("2026-08-18T16:00:00Z"));
  });

  it("同一上海日内任意时刻的 dayStart 相同", () => {
    const morning = Date.parse("2026-08-19T01:00:00Z"); // 上海 09:00
    const evening = Date.parse("2026-08-19T13:00:00Z"); // 上海 21:00
    expect(shanghaiDayStartMs(morning)).toBe(shanghaiDayStartMs(evening));
  });
});
