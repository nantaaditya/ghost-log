import { addDays, format, startOfISOWeek } from "date-fns";

export function getCurrentWeekId(date = new Date()): string {
  return formatWeekId(date);
}

export function formatWeekId(date: Date): string {
  // Thursday of the ISO week determines month and year (ISO 8601 convention)
  const thursday = addDays(startOfISOWeek(date), 3);
  const month = String(thursday.getMonth() + 1).padStart(2, "0");
  const year = thursday.getFullYear();
  const weekOfMonth = Math.ceil(thursday.getDate() / 7);
  return `W${weekOfMonth}-${month}-${year}`;
}

export function parseWeekId(weekId: string): Date | null {
  const match = weekId.match(/^W([1-5])-(0[1-9]|1[0-2])-(\d{4})$/);
  if (!match) return null;
  const week = Number(match[1]);
  const month = Number(match[2]) - 1; // 0-indexed
  const year = Number(match[3]);

  // Find the first Thursday of the month
  const firstOfMonth = new Date(year, month, 1);
  const daysToFirstThursday = (4 - firstOfMonth.getDay() + 7) % 7;
  const firstThursday = new Date(year, month, 1 + daysToFirstThursday);

  // Advance to the w-th Thursday
  const targetThursday = addDays(firstThursday, (week - 1) * 7);

  // Reject if the Thursday fell into the next month
  if (targetThursday.getMonth() !== month) return null;

  return startOfISOWeek(targetThursday);
}

export function isValidWeekId(weekId: string): boolean {
  return parseWeekId(weekId) !== null;
}

/** Returns the last `count` weekIds strictly before the current week, most-recent-first. */
export function getRecentPastWeekIds(count: number, date = new Date()): string[] {
  const weekIds: string[] = [];
  let cursor = startOfISOWeek(date);
  while (weekIds.length < count) {
    cursor = addDays(cursor, -7);
    weekIds.push(formatWeekId(cursor));
  }
  return weekIds;
}

/** Human-readable month label for a weekId, e.g. "W4-04-2026" -> "April 2026". */
export function getWeekMonthLabel(weekId: string): string {
  const monday = parseWeekId(weekId);
  if (!monday) throw new Error(`Invalid weekId: ${weekId}`);
  // parseWeekId returns the Monday of the week; the month itself is Thursday-based
  // (same ISO 8601 convention formatWeekId uses), so re-derive the Thursday here.
  return format(addDays(monday, 3), "MMMM yyyy");
}

/**
 * Sorts weekIds newest-first by actual calendar week (year, then month, then week-of-month),
 * not by string order — weekIds like "W5-01-2026" otherwise sort above "W1-12-2026" even
 * though they're chronologically earlier. Unparseable ids are dropped.
 */
export function sortWeekIdsDesc(weekIds: readonly string[]): string[] {
  return weekIds
    .filter(isValidWeekId)
    .sort((a, b) => (parseWeekId(b)?.getTime() ?? 0) - (parseWeekId(a)?.getTime() ?? 0));
}

/**
 * Sorts weekId-keyed items newest-first by actual calendar week, then groups consecutive
 * same-month items. Items with an unparseable weekId are dropped rather than throwing, so
 * one corrupt row can't break rendering for every item in the list.
 */
export function groupWeekIdsByMonth<T extends { weekId: string }>(
  items: readonly T[],
): { monthLabel: string; items: T[] }[] {
  const order = sortWeekIdsDesc(items.map((item) => item.weekId));
  const rank = new Map(order.map((weekId, index) => [weekId, index]));
  const sorted = items
    .filter((item) => rank.has(item.weekId))
    .sort((a, b) => rank.get(a.weekId)! - rank.get(b.weekId)!);

  const groups: { monthLabel: string; items: T[] }[] = [];
  for (const item of sorted) {
    const monthLabel = getWeekMonthLabel(item.weekId);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.monthLabel === monthLabel) {
      lastGroup.items.push(item);
    } else {
      groups.push({ monthLabel, items: [item] });
    }
  }
  return groups;
}
