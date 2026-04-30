export type HealthIndicator = "on-track" | "at-risk" | "off-track";

export const HEALTH_LABELS: Record<HealthIndicator, string> = {
  "on-track": "🟢 On Track",
  "at-risk": "🟡 At Risk",
  "off-track": "🔴 Off Track",
};

export interface EscalationItem {
  project: string;
  topic: string;
  problem: string;
  impact: string;
  actionsTaken: string;
  ask: string;
  jiraLink?: string;
}

export interface ProductionHealthItem {
  project: string;
  topic: string;
  problem: string;
  impact: string;
  rootCause: string;
  nextAction: string;
  jiraLink?: string;
}

export interface TechDebtItem {
  project: string;
  debtType: string;
  description: string;
  mitigation: string;
  jiraLink?: string;
}

export type SprintGoalStatus = "Achieved" | "Ongoing" | "Missed";

export interface DeliveryItem {
  project: string;
  sprintGoalStatus: SprintGoalStatus;
  progress: string;
  nextSteps: string;
  risks: string;
  jiraLink?: string;
}

export interface LookAhead {
  priority1: string;
  priority2: string;
}

export interface ReportData {
  reporterName: string;
  weekId: string;
  healthIndicator: HealthIndicator;
  escalations: EscalationItem[];
  productionHealth: ProductionHealthItem[];
  techDebt: TechDebtItem[];
  delivery: DeliveryItem[];
  lookAhead: LookAhead;
  ghibah: string;
}

export type ReportStatus = "draft" | "submitted";

export interface ReportMeta {
  weekId: string;
  onedrivePath: string;
  status: ReportStatus;
  submittedAt: Date | null;
  updatedAt: Date;
}
