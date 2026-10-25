import { findSkill } from ".";

/** The starting values of a new goal, taken from a framework skill. */
export interface GoalTemplate {
  type: "soft" | "hard";
  skillKey: string;
  title: string;
  measure: string;
  developmentAction: string;
  evidenceSource: string;
  milestones: never[];
}

/**
 * Prefills a goal from a skill so the manager edits a good starting point instead of a blank form.
 * A hard skill's development action is left empty on purpose: how someone builds a technical skill
 * (pairing, a project, a course) depends on the person, and the framework cannot know it.
 */
export function goalTemplateFromSkill(key: string): GoalTemplate | undefined {
  const skill = findSkill(key);
  if (!skill) return undefined;

  return {
    type: skill.kind,
    skillKey: skill.key,
    title: skill.title,
    measure: skill.exampleKpis[0],
    developmentAction: skill.kind === "soft" ? skill.developmentActions[0] : "",
    evidenceSource: "",
    milestones: [],
  };
}
