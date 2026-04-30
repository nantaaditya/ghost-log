import matter from "gray-matter";
import type {
  ReportData,
  HealthIndicator,
  EscalationItem,
  ProductionHealthItem,
  TechDebtItem,
  DeliveryItem,
  SprintGoalStatus,
} from "@/types/report";

const HEALTH_MAP: Record<string, HealthIndicator> = {
  "🟢 On Track": "on-track",
  "🟡 At Risk": "at-risk",
  "🔴 Off Track": "off-track",
};

export function parseReport(markdown: string): ReportData | null {
  const { content } = matter(markdown);

  const reporterMatch = content.match(/\*\*Reporter\*\*:\s*(.+)/);
  const dateMatch = content.match(/\*\*Date:\*\*\s*`([^`]+)`/);
  const healthMatch = content.match(/\*\*Overall Health:\*\*\s*`([^`]+)`/);

  if (!reporterMatch || !dateMatch || !healthMatch) return null;

  const reporterName = reporterMatch[1].trim();
  const weekId = dateMatch[1].trim();
  const healthLabel = healthMatch[1].trim();
  const healthIndicator: HealthIndicator = HEALTH_MAP[healthLabel] ?? "on-track";

  return {
    reporterName,
    weekId,
    healthIndicator,
    escalations: parseEscalations(content),
    productionHealth: parseProductionHealth(content),
    techDebt: parseTechDebt(content),
    delivery: parseDelivery(content),
    lookAhead: parseLookAhead(content),
    ghibah: parseGhibah(content),
  };
}

function extractSection(content: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `${escapedHeading}[\\s\\S]*?(?=\\n---\\n|\\n#### |$)`,
    "m"
  );
  const match = content.match(regex);
  return match ? match[0] : "";
}

function parseEscalations(content: string): EscalationItem[] {
  const section = extractSection(content, "#### 🚨 1\\. Escalations");
  const items: EscalationItem[] = [];

  const itemRegex =
    /- \*\*([^\n]+?) — ([^\n]+?)\*\* \*\(Escalation\)\*\n\t- \*\*Problem:\*\* ([^\n]+)\n\t- \*\*Impact:\*\* ([^\n]+)\n\t- \*\*Actions taken:\*\* ([^\n]+)\n\t- \*\*Ask:\*\* ([^\n]+)(?:\n\t- \*\*Jira:\*\* ([^\n]+))?/g;

  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    items.push({
      project: match[1].trim(),
      topic: match[2].trim(),
      problem: match[3].trim(),
      impact: match[4].trim(),
      actionsTaken: match[5].trim(),
      ask: match[6].trim(),
      ...(match[7] ? { jiraLink: match[7].trim() } : {}),
    });
  }
  return items;
}

function parseProductionHealth(content: string): ProductionHealthItem[] {
  const section = extractSection(content, "#### 📉 2\\. Production Health");
  const items: ProductionHealthItem[] = [];

  const itemRegex =
    /- \*\*([^\n]+?) — ([^\n]+?)\*\* \*\(Report Problem\)\*\n\t- \*\*Problem:\*\* ([^\n]+)\n\t- \*\*Impact:\*\* ([^\n]+)\n\t- \*\*Root cause:\*\* ([^\n]+)\n\t- \*\*Next action:\*\* ([^\n]+)(?:\n\t- \*\*Jira:\*\* ([^\n]+))?/g;

  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    items.push({
      project: match[1].trim(),
      topic: match[2].trim(),
      problem: match[3].trim(),
      impact: match[4].trim(),
      rootCause: match[5].trim(),
      nextAction: match[6].trim(),
      ...(match[7] ? { jiraLink: match[7].trim() } : {}),
    });
  }
  return items;
}

function parseTechDebt(content: string): TechDebtItem[] {
  const section = extractSection(content, "#### 🛠 3\\. Technical Debt");
  const items: TechDebtItem[] = [];

  const itemRegex =
    /- \*\*([^\n]+?) — ([^\n]+?):\*\* ([^\n]+)\n\t- \*\*Proposed Mitigation:\*\* ([^\n]+)(?:\n\t- \*\*Jira:\*\* ([^\n]+))?/g;

  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    items.push({
      project: match[1].trim(),
      debtType: match[2].trim(),
      description: match[3].trim(),
      mitigation: match[4].trim(),
      ...(match[5] ? { jiraLink: match[5].trim() } : {}),
    });
  }
  return items;
}

function parseDelivery(content: string): DeliveryItem[] {
  const section = extractSection(content, "#### 🚀 4\\. Delivery");
  const items: DeliveryItem[] = [];

  const itemRegex =
    /- \*\*([^\n]+?)\*\* \*\(Update\)\* — Sprint goal \*\*([^\n]+?)\*\*\.\n\t- \*\*Progress:\*\* ([^\n]+)\n\t- \*\*Next steps:\*\* ([^\n]+)(?:\n\t- \*\*Risks:\*\* ([^\n]+))?(?:\n\t- \*\*Jira:\*\* ([^\n]+))?/g;

  let match;
  while ((match = itemRegex.exec(section)) !== null) {
    items.push({
      project: match[1].trim(),
      sprintGoalStatus: match[2].trim() as SprintGoalStatus,
      progress: match[3].trim(),
      nextSteps: match[4].trim(),
      risks: match[5]?.trim() ?? "",
      ...(match[6] ? { jiraLink: match[6].trim() } : {}),
    });
  }
  return items;
}

function parseLookAhead(content: string): { priority1: string; priority2: string } {
  const section = extractSection(content, "#### 🔮 5\\. Look Ahead");
  const p1Match = section.match(/\*\*Priority 1:\*\* (.+)/);
  const p2Match = section.match(/\*\*Priority 2:\*\* (.+)/);
  return {
    priority1: p1Match?.[1]?.trim() ?? "",
    priority2: p2Match?.[1]?.trim() ?? "",
  };
}

function parseGhibah(content: string): string {
  const match = content.match(/#### 💬 6\. Ghibah Online\n\n([\s\S]+?)(?:\n\n---|$)/);
  return match?.[1]?.trim() ?? "";
}
