/**
 * 日期口径：固定 Asia/Shanghai（UTC+8）日历日，不读设备时区（design.md §6）。
 * 返回 'YYYY-MM-DD'。
 */

const DAY_MS = 24 * 3600 * 1000;
const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;

function toShanghaiDateString(epochMs: number): string {
  return new Date(epochMs + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

export function shanghaiToday(now: number = Date.now()): string {
  return toShanghaiDateString(now);
}

/** 相对今天的偏移：daysAgo(1) = 昨天，daysAgo(7) = 7 天前 */
export function shanghaiDaysAgo(days: number, now: number = Date.now()): string {
  return toShanghaiDateString(now - days * DAY_MS);
}
