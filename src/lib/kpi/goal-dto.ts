import type { KpiGoal, KpiMilestone } from "@/lib/db/schema";

/** A goal as the editor and the plan view hold it: plain data, no dates, no owner. */
export interface GoalDto {
  id: string;
  type: "soft" | "hard";
  skillKey: string;
  title: string;
  measure: string;
  milestones: KpiMilestone[];
  developmentAction: string;
  evidenceSource: string;
  status: "draft" | "shared";
}

/** What a member sees of a shared goal: no evidence note, no status, no framework key. */
export type MemberGoalDto = Pick<
  GoalDto,
  "id" | "type" | "title" | "measure" | "milestones" | "developmentAction"
>;

/**
 * Built field by field (an allowlist) so the manager-only `evidenceSource` can never ride along
 * to the browser, even if a component that receives this later becomes a client component.
 */
export function toMemberGoalDto(goal: KpiGoal): MemberGoalDto {
  return {
    id: goal.id,
    type: goal.type,
    title: goal.title,
    measure: goal.measure,
    milestones: goal.milestones.map((milestone) => ({ ...milestone })),
    developmentAction: goal.developmentAction,
  };
}

export function toGoalDto(goal: KpiGoal): GoalDto {
  return {
    id: goal.id,
    type: goal.type,
    skillKey: goal.skillKey ?? "",
    title: goal.title,
    measure: goal.measure,
    milestones: goal.milestones.map((milestone) => ({ ...milestone })),
    developmentAction: goal.developmentAction,
    evidenceSource: goal.evidenceSource ?? "",
    status: goal.status,
  };
}
