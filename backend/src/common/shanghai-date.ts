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

/** 当日 00:00（Asia/Shanghai）的 epoch ms——供「当日」口径的计数查询（renwen 每日上限） */
export function shanghaiDayStartMs(now: number = Date.now()): number {
  // now + 8h 对齐到上海时间轴，取整日后再减回 8h
  return Math.floor((now + SHANGHAI_OFFSET_MS) / DAY_MS) * DAY_MS - SHANGHAI_OFFSET_MS;
}
