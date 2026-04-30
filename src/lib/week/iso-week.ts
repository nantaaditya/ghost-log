import { addDays, startOfISOWeek } from "date-fns";

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
