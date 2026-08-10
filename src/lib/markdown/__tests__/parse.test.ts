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

  it("round-trips two escalation items (regression: only first item survived parsing)", () => {
    const data: ReportData = {
      ...base,
      escalations: [
        { project: "CMS-BCAS", topic: "Irrational Timeline", problem: "Timeline risk.", impact: "Scope-wide.", actionsTaken: "Escalated.", ask: "Need approval.", jiraLinks: [] },
        { project: "Multiple Products", topic: "The Headcount Request (Operational Blocker)", problem: "Scaled beyond one node.", impact: "Severe execution risk.", actionsTaken: "Prioritized reviews.", ask: "Open headcount.", jiraLinks: [] },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.escalations).toHaveLength(2);
    expect(result?.escalations[0].project).toBe("CMS-BCAS");
    expect(result?.escalations[1].project).toBe("Multiple Products");
    expect(result?.escalations[1].topic).toBe("The Headcount Request (Operational Blocker)");
  });

  it("round-trips two items in productionHealth, techDebt, and delivery", () => {
    const data: ReportData = {
      ...base,
      productionHealth: [
        { project: "A", topic: "T1", problem: "p1", impact: "i1", rootCause: "r1", nextAction: "n1", jiraLinks: [] },
        { project: "B", topic: "T2", problem: "p2", impact: "i2", rootCause: "r2", nextAction: "n2", jiraLinks: [] },
      ],
      techDebt: [
        { project: "A", debtType: "Incurred", description: "d1", mitigation: "m1", jiraLinks: [] },
        { project: "B", debtType: "Paid down", description: "d2", mitigation: "m2", jiraLinks: [] },
      ],
      delivery: [
        { project: "A", sprintGoalStatus: "Achieved", progress: "p1", nextSteps: "n1", risks: "", jiraLinks: [] },
        { project: "B", sprintGoalStatus: "Missed", progress: "p2", nextSteps: "n2", risks: "slipping", jiraLinks: [] },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.productionHealth).toHaveLength(2);
    expect(result?.productionHealth[1].project).toBe("B");
    expect(result?.techDebt).toHaveLength(2);
    expect(result?.techDebt[1].project).toBe("B");
    expect(result?.delivery).toHaveLength(2);
    expect(result?.delivery[1].project).toBe("B");
    expect(result?.delivery[1].risks).toBe("slipping");
  });

  it("round-trips a Textarea field containing an embedded newline (regression: broke item matching)", () => {
    const data: ReportData = {
      ...base,
      escalations: [
        {
          project: "CMS-BCAS",
          topic: "Irrational Timeline",
          problem: "Timeline risk.",
          impact: "Severe execution risk and pipeline stalling.\n\nDriving strategic delivery across product lines.",
          actionsTaken: "Escalated.",
          ask: "Need approval.",
          jiraLinks: [],
        },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.escalations).toHaveLength(1);
    expect(result?.escalations[0].impact).toBe(
      "Severe execution risk and pipeline stalling.\n\nDriving strategic delivery across product lines.",
    );
  });

  it("round-trips productionHealth/techDebt/delivery Textarea fields with embedded newlines", () => {
    const data: ReportData = {
      ...base,
      productionHealth: [
        { project: "A", topic: "T", problem: "line1\nline2", impact: "i", rootCause: "r1\nr2", nextAction: "n", jiraLinks: [] },
      ],
      techDebt: [
        { project: "A", debtType: "Incurred", description: "d1\n\nd2", mitigation: "m", jiraLinks: [] },
      ],
      delivery: [
        { project: "A", sprintGoalStatus: "Ongoing", progress: "p1\np2", nextSteps: "n1\nn2", risks: "", jiraLinks: [] },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.productionHealth[0].problem).toBe("line1\nline2");
    expect(result?.productionHealth[0].rootCause).toBe("r1\nr2");
    expect(result?.techDebt[0].description).toBe("d1\n\nd2");
    expect(result?.delivery[0].progress).toBe("p1\np2");
    expect(result?.delivery[0].nextSteps).toBe("n1\nn2");
  });

  it("round-trips lookAhead priorities containing embedded newlines", () => {
    const data: ReportData = {
      ...base,
      lookAhead: {
        priority1: "Finish migration.\n\nCoordinate with infra team.",
        priority2: "Review roadmap.\nPrep for Q3.",
      },
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.lookAhead.priority1).toBe("Finish migration.\n\nCoordinate with infra team.");
    expect(result?.lookAhead.priority2).toBe("Review roadmap.\nPrep for Q3.");
  });

  it("round-trips delivery.nextSteps containing an embedded blank line, followed by a second item", () => {
    const data: ReportData = {
      ...base,
      delivery: [
        {
          project: "A",
          sprintGoalStatus: "Ongoing",
          progress: "p1",
          nextSteps: "Ship the fix.\n\nCoordinate rollback plan with infra.",
          risks: "",
          jiraLinks: [],
        },
        { project: "B", sprintGoalStatus: "Achieved", progress: "p2", nextSteps: "n2", risks: "", jiraLinks: [] },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.delivery).toHaveLength(2);
    expect(result?.delivery[0].nextSteps).toBe("Ship the fix.\n\nCoordinate rollback plan with infra.");
    expect(result?.delivery[1].project).toBe("B");
    expect(result?.delivery[1].nextSteps).toBe("n2");
  });

  it("round-trips a Textarea field containing a standalone '---' line without swallowing sibling items", () => {
    const data: ReportData = {
      ...base,
      escalations: [
        {
          project: "CMS-BCAS",
          topic: "Irrational Timeline",
          problem: "Timeline risk.",
          impact: "Severe impact.\n---\nStill part of the same field.",
          actionsTaken: "Escalated.",
          ask: "Need approval.",
          jiraLinks: [],
        },
        { project: "Second", topic: "Item", problem: "p", impact: "i", actionsTaken: "a", ask: "ask", jiraLinks: [] },
      ],
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.escalations).toHaveLength(2);
    expect(result?.escalations[0].impact).toBe("Severe impact.\n---\nStill part of the same field.");
    expect(result?.escalations[1].project).toBe("Second");
  });

  it("round-trips lookAhead with only priority1 set (no priority2 line present)", () => {
    const data: ReportData = {
      ...base,
      lookAhead: { priority1: "Only this.\nWith a newline.", priority2: "" },
    };
    const md = serializeReport(data);
    const result = parseReport(md);
    expect(result?.lookAhead.priority1).toBe("Only this.\nWith a newline.");
    expect(result?.lookAhead.priority2).toBe("");
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
