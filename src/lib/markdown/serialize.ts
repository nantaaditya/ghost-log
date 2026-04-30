import type { ReportData, HealthIndicator } from "@/types/report";

const HEALTH_LABELS: Record<HealthIndicator, string> = {
  "on-track": "🟢 On Track",
  "at-risk": "🟡 At Risk",
  "off-track": "🔴 Off Track",
};

export function serializeReport(data: ReportData): string {
  const parts: string[] = [];

  parts.push("---\ntags:\n  - work\n  - report\n---");
  parts.push("### 📝 Weekly Engineering Report");
  parts.push(
    `**Reporter**: ${data.reporterName}\n**Date:** \`${data.weekId}\` | **Overall Health:** \`${HEALTH_LABELS[data.healthIndicator]}\``
  );
  parts.push("---");

  if (data.escalations.length > 0) {
    const items = data.escalations
      .map((e) => {
        let item = `- **${e.project} — ${e.topic}** *(Escalation)*\n\t- **Problem:** ${e.problem}\n\t- **Impact:** ${e.impact}\n\t- **Actions taken:** ${e.actionsTaken}\n\t- **Ask:** ${e.ask}`;
        if (e.jiraLink) item += `\n\t- **Jira:** ${e.jiraLink}`;
        return item;
      })
      .join("\n\n");
    parts.push(
      `#### 🚨 1. Escalations & Blockers (Action Required)\n\n_Structure: **Escalation** — Problem (BLUF) → Impact → Actions already taken → Support/decision needed_\n\n${items}`
    );
    parts.push("---");
  }

  if (data.productionHealth.length > 0) {
    const items = data.productionHealth
      .map((p) => {
        let item = `- **${p.project} — ${p.topic}** *(Report Problem)*\n\t- **Problem:** ${p.problem}\n\t- **Impact:** ${p.impact}\n\t- **Root cause:** ${p.rootCause}\n\t- **Next action:** ${p.nextAction}`;
        if (p.jiraLink) item += `\n\t- **Jira:** ${p.jiraLink}`;
        return item;
      })
      .join("\n\n");
    parts.push(
      `#### 📉 2. Production Health & Incidents\n\n_Structure: **Report Problem** — Problem (BLUF) → Impact → Root cause (if known) → Proposed solution / next action_\n\n${items}`
    );
    parts.push("---");
  }

  if (data.techDebt.length > 0) {
    const items = data.techDebt
      .map((t) => {
        let item = `- **${t.project} — ${t.debtType}:** ${t.description}\n\t- **Proposed Mitigation:** ${t.mitigation}`;
        if (t.jiraLink) item += `\n\t- **Jira:** ${t.jiraLink}`;
        return item;
      })
      .join("\n\n");
    parts.push(
      `#### 🛠 3. Technical Debt & Architecture\n\n_What corners did we cut this week to meet deadlines? What underlying systems are showing strain?_\n\n${items}`
    );
    parts.push("---");
  }

  if (data.delivery.length > 0) {
    const items = data.delivery
      .map((d) => {
        let item = `- **${d.project}** *(Update)* — Sprint goal **${d.sprintGoalStatus}**.\n\t- **Progress:** ${d.progress}\n\t- **Next steps:** ${d.nextSteps}`;
        if (d.risks) item += `\n\t- **Risks:** ${d.risks}`;
        if (d.jiraLink) item += `\n\t- **Jira:** ${d.jiraLink}`;
        return item;
      })
      .join("\n\n");
    parts.push(
      `#### 🚀 4. Delivery & Execution (FYI)\n\n_Structure: **Update** — Current status (BLUF) → Progress made → Next steps → (Optional) Risks/blockers_\n\n${items}`
    );
    parts.push("---");
  }

  const hasLookAhead = data.lookAhead.priority1 || data.lookAhead.priority2;
  if (hasLookAhead) {
    const items: string[] = [];
    if (data.lookAhead.priority1)
      items.push(`- **Priority 1:** ${data.lookAhead.priority1}`);
    if (data.lookAhead.priority2)
      items.push(`- **Priority 2:** ${data.lookAhead.priority2}`);
    parts.push(
      `#### 🔮 5. Look Ahead (Next Week)\n\n_What are the top 1-2 priorities for the upcoming week?_\n\n${items.join("\n")}`
    );
    parts.push("---");
  }

  if (data.ghibah) {
    parts.push(`#### 💬 6. Ghibah Online\n\n${data.ghibah}`);
  }

  return parts.join("\n\n") + "\n";
}
