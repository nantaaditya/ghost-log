/** The six dimensions of the 2026 Career Growth survey. Names must match the survey export exactly. */
export const SURVEY_DIMENSIONS = [
  "Ambition",
  "Ownership",
  "Resilience",
  "Learning",
  "People",
  "Vision",
] as const;

export type SurveyDimension = (typeof SURVEY_DIMENSIONS)[number];

export type SkillLevelNumber = 1 | 2 | 3 | 4;

export interface LevelDescriptor {
  level: SkillLevelNumber;
  label: string;
  /** Observable things a person at this level does; never traits or attitudes. */
  behaviors: readonly string[];
}

/** A technical competency. Levels are descriptive, not tied to any company grade. */
export interface HardSkill {
  key: string;
  title: string;
  summary: string;
  levels: readonly LevelDescriptor[];
  /** What a manager can look at to judge progress. */
  evidence: readonly string[];
  /** Measurable goals; each states a target number so progress can be checked. */
  exampleKpis: readonly string[];
}

/** A behavioural competency, mapped to one survey dimension. */
export interface SoftSkill {
  key: string;
  dimension: SurveyDimension;
  title: string;
  summary: string;
  developmentActions: readonly string[];
  exampleKpis: readonly string[];
  /** A caution for the manager when using this track. */
  watchFor: string;
}

export type SkillKind = "hard" | "soft";
