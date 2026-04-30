import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { ONEDRIVE_BASE_PATH: "nanta-obsidian/work/report" },
}));

const { buildReportPath, buildReporterFolderPath } = await import("../paths");

describe("buildReportPath", () => {
  it("builds a valid path", () => {
    expect(buildReportPath("Pramuditya", "W4-04-2026")).toBe(
      "nanta-obsidian/work/report/Pramuditya/W4-04-2026.md"
    );
  });

  it("throws on path traversal in reporter name", () => {
    expect(() => buildReportPath("../etc", "W4-04-2026")).toThrow();
    expect(() => buildReportPath("../../passwd", "W4-04-2026")).toThrow();
  });

  it("throws on special chars in reporter name", () => {
    expect(() => buildReportPath("name<script>", "W4-04-2026")).toThrow();
    expect(() => buildReportPath("name/inject", "W4-04-2026")).toThrow();
  });

  it("throws on invalid weekId", () => {
    expect(() => buildReportPath("Pramuditya", "../../etc")).toThrow();
    expect(() => buildReportPath("Pramuditya", "W99-04-2026")).toThrow();
  });
});

describe("buildReporterFolderPath", () => {
  it("builds a valid folder path", () => {
    expect(buildReporterFolderPath("Pramuditya")).toBe(
      "nanta-obsidian/work/report/Pramuditya"
    );
  });
});
