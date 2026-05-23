import { describe, it, expect } from "vitest";
import { parseReport } from "../parse";
import { serializeReport } from "../serialize";
import type { ReportData } from "@/types/report";

const base: ReportData = {
  reporterName: "Nanta Pramuditya",
  weekId: "W4-04-2026",
  healthIndicator: "at-risk",
  escalations: [],
  productionHealth: [],
  techDebt: [],
  delivery: [],
  lookAhead: { priority1: "", priority2: "" },
  ghibah: "",
};

const full: ReportData = {
  reporterName: "Nanta Pramuditya",
  weekId: "W4-04-2026",
  healthIndicator: "on-track",
  escalations: [
    {
      project: "CMS-JAGO",
      topic: "WAF Blocked",
      problem: "WAF is blocking traffic",
      impact: "Users cannot access",
      actionsTaken: "Raised ticket",
      ask: "Unblock WAF rule",
      jiraLinks: ["https://jira.example.com/browse/CMS-123"],
    },
  ],
  productionHealth: [
    {
      project: "Payments",
      topic: "DB timeout",
      problem: "Query timeout spike",
      impact: "Checkout failures",
      rootCause: "Missing index",
      nextAction: "Add index migration",
      jiraLinks: [],
    },
  ],
  techDebt: [
    {
      project: "Auth Service",
      debtType: "Debt Incurred",
      description: "Skipped input validation to meet deadline",
      mitigation: "Add validation in next sprint",
      jiraLinks: [],
    },
  ],
  delivery: [
    {
      project: "CMS-JAGO",
      sprintGoalStatus: "Achieved",
      progress: "Feature shipped",
      nextSteps: "Monitor metrics",
      risks: "None",
      jiraLinks: ["https://jira.example.com/browse/CMS-456"],
    },
  ],
  lookAhead: {
    priority1: "Finish auth migration",
    priority2: "Review Q2 roadmap",
  },
  ghibah: "This week was intense but rewarding.",
};

describe("parseReport", () => {
  it("returns null when required header fields are missing", () => {
    expect(parseReport("# Nothing here")).toBeNull();
  });

  it("parses header fields from a serialized base report", () => {
    const md = serializeReport(base);
    const result = parseReport(md);
    expect(result).not.toBeNull();
    expect(result?.reporterName).toBe("Nanta Pramuditya");
    expect(result?.weekId).toBe("W4-04-2026");
    expect(result?.healthIndicator).toBe("at-risk");
  });

  it("round-trips a report with all sections populated", () => {
    const md = serializeReport(full);
    const result = parseReport(md);
    expect(result).not.toBeNull();
    expect(result).toEqual(full);
  });

  it("round-trips escalation with jira links", () => {
    const md = serializeReport(full);
    const result = parseReport(md);
    expect(result?.escalations[0].jiraLinks).toEqual([
      "https://jira.example.com/browse/CMS-123",
    ]);
  });

  it("round-trips delivery item with risks and jira links", () => {
    const md = serializeReport(full);
    const result = parseReport(md);
    expect(result?.delivery[0]).toEqual(full.delivery[0]);
  });

  it("parses empty sections as empty arrays", () => {
    const md = serializeReport(base);
    const result = parseReport(md);
    expect(result?.escalations).toEqual([]);
    expect(result?.productionHealth).toEqual([]);
    expect(result?.techDebt).toEqual([]);
    expect(result?.delivery).toEqual([]);
  });

  it("parses lookAhead priorities", () => {
    const md = serializeReport(full);
    const result = parseReport(md);
    expect(result?.lookAhead.priority1).toBe("Finish auth migration");
    expect(result?.lookAhead.priority2).toBe("Review Q2 roadmap");
  });

  it("parses ghibah content", () => {
    const md = serializeReport(full);
    const result = parseReport(md);
    expect(result?.ghibah).toBe("This week was intense but rewarding.");
  });

  it("round-trips an escalation with all empty field values", () => {
    const data: ReportData = {
      ...base,
      escalations: [{ project: "CMS-Vanilla", topic: "other", problem: "", impact: "", actionsTaken: "", ask: "", jiraLinks: [] }],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.escalations).toHaveLength(1);
    expect(result?.escalations[0].project).toBe("CMS-Vanilla");
    expect(result?.escalations[0].topic).toBe("other");
    expect(result?.escalations[0].problem).toBe("");
  });

  it("round-trips delivery with empty progress and next steps", () => {
    const data: ReportData = {
      ...base,
      delivery: [{ project: "CMS", sprintGoalStatus: "Ongoing", progress: "", nextSteps: "", risks: "", jiraLinks: [] }],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.delivery).toHaveLength(1);
    expect(result?.delivery[0].project).toBe("CMS");
    expect(result?.delivery[0].progress).toBe("");
  });

  it("round-trips productionHealth item with empty topic", () => {
    const data: ReportData = {
      ...base,
      productionHealth: [{ project: "Test", topic: "", problem: "", impact: "", rootCause: "", nextAction: "", jiraLinks: [] }],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.productionHealth).toHaveLength(1);
    expect(result?.productionHealth[0].project).toBe("Test");
    expect(result?.productionHealth[0].topic).toBe("");
  });

  it("round-trips techDebt item with empty debtType", () => {
    const data: ReportData = {
      ...base,
      techDebt: [{ project: "Test", debtType: "", description: "", mitigation: "", jiraLinks: [] }],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.techDebt).toHaveLength(1);
    expect(result?.techDebt[0].project).toBe("Test");
    expect(result?.techDebt[0].debtType).toBe("");
  });

  it("parses CRLF line endings (Windows/OneDrive sync) correctly for all sections", () => {
    const md = serializeReport(full);
    const crlf = md.replace(/\n/g, "\r\n");
    const result = parseReport(crlf);
    expect(result).not.toBeNull();
    expect(result?.escalations).toHaveLength(1);
    expect(result?.productionHealth).toHaveLength(1);
    expect(result?.techDebt).toHaveLength(1);
    expect(result?.delivery).toHaveLength(1);
    expect(result?.lookAhead.priority1).toBe("Finish auth migration");
    expect(result?.ghibah).toBe("This week was intense but rewarding.");
  });
});
