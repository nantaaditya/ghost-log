import { HARD_SKILLS } from "./hard-skills";
import { SOFT_SKILLS } from "./soft-skills";
import type { HardSkill, SkillKind, SoftSkill } from "./types";

export { HARD_SKILLS, SOFT_SKILLS };
export { SURVEY_DIMENSIONS } from "./types";
export type { HardSkill, SoftSkill, SurveyDimension, LevelDescriptor, SkillKind } from "./types";

export type TaggedSkill =
  | (HardSkill & { kind: Extract<SkillKind, "hard"> })
  | (SoftSkill & { kind: Extract<SkillKind, "soft"> });

export const ALL_SKILLS: readonly TaggedSkill[] = [
  ...HARD_SKILLS.map((skill) => ({ ...skill, kind: "hard" as const })),
  ...SOFT_SKILLS.map((skill) => ({ ...skill, kind: "soft" as const })),
];

const SKILLS_BY_KEY: ReadonlyMap<string, TaggedSkill> = new Map(
  ALL_SKILLS.map((skill) => [skill.key, skill]),
);

export function findSkill(key: string): TaggedSkill | undefined {
  return SKILLS_BY_KEY.get(key);
}
