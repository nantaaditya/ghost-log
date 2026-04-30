import { env } from "@/lib/env";

const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\- ]+$/;

export function buildReportPath(reporterName: string, weekId: string): string {
  assertSafeName(reporterName, "reporterName");
  assertSafeWeekId(weekId);
  return `${env.ONEDRIVE_BASE_PATH}/${reporterName}/${weekId}.md`;
}

export function buildReporterFolderPath(reporterName: string): string {
  assertSafeName(reporterName, "reporterName");
  return `${env.ONEDRIVE_BASE_PATH}/${reporterName}`;
}

function assertSafeName(value: string, field: string): void {
  if (!SAFE_NAME_REGEX.test(value)) {
    throw new Error(`Invalid ${field}: contains disallowed characters`);
  }
  if (value.includes("..")) {
    throw new Error(`Invalid ${field}: path traversal detected`);
  }
}

function assertSafeWeekId(weekId: string): void {
  if (!/^W([1-9]|[1-4]\d|5[0-3])-\d{2}-\d{4}$/.test(weekId)) {
    throw new Error(`Invalid weekId format: ${weekId}`);
  }
}
