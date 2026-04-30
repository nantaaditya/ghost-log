import { describe, it, expect } from "vitest";
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

describe("serializeReport", () => {
  it("includes reporter name and week id in header", () => {
    const md = serializeReport(base);
    expect(md).toContain("**Reporter**: Nanta Pramuditya");
    expect(md).toContain("`W4-04-2026`");
    expect(md).toContain("`🟡 At Risk`");
  });

  it("skips empty sections entirely", () => {
    const md = serializeReport(base);
    expect(md).not.toContain("Escalations & Blockers");
    expect(md).not.toContain("Production Health");
    expect(md).not.toContain("Technical Debt");
    expect(md).not.toContain("Delivery");
    expect(md).not.toContain("Look Ahead");
    expect(md).not.toContain("Ghibah");
  });

  it("serializes escalation with all fields", () => {
    const data: ReportData = {
      ...base,
      escalations: [{
        project: "CMS-JAGO",
        topic: "WAF Blocked",
        problem: "WAF is blocking traffic",
        impact: "Users cannot access",
        actionsTaken: "Raised ticket",
        ask: "Unblock WAF rule",
      }],
    };
    const md = serializeReport(data);
    expect(md).toContain("**CMS-JAGO — WAF Blocked** *(Escalation)*");
    expect(md).toContain("**Problem:** WAF is blocking traffic");
    expect(md).toContain("**Ask:** Unblock WAF rule");
  });

  it("emits jiraLink when set on an escalation", () => {
    const data: ReportData = {
      ...base,
      escalations: [{
        project: "CMS-JAGO",
        topic: "WAF Blocked",
        problem: "p",
        impact: "i",
        actionsTaken: "a",
        ask: "q",
        jiraLink: "https://jira.example.com/browse/CMS-123",
      }],
    };
    const md = serializeReport(data);
    expect(md).toContain("**Jira:** https://jira.example.com/browse/CMS-123");
  });

  it("omits jiraLink line when not set", () => {
    const data: ReportData = {
      ...base,
      escalations: [{
        project: "CMS-JAGO",
        topic: "WAF Blocked",
        problem: "p",
        impact: "i",
        actionsTaken: "a",
        ask: "q",
      }],
    };
    const md = serializeReport(data);
    expect(md).not.toContain("**Jira:**");
  });

  it("skips risks field in delivery when empty", () => {
    const data: ReportData = {
      ...base,
      delivery: [{
        project: "CMS-JAGO",
        sprintGoalStatus: "Achieved",
        progress: "Done",
        nextSteps: "Deploy",
        risks: "",
      }],
    };
    const md = serializeReport(data);
    expect(md).toContain("Sprint goal **Achieved**");
    expect(md).not.toContain("**Risks:**");
  });

  it("produces frontmatter", () => {
    const md = serializeReport(base);
    expect(md.startsWith("---\ntags:\n  - work\n  - report\n---")).toBe(true);
  });
});
