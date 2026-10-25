import { describe, it, expect } from "vitest";
import { ALL_SKILLS, HARD_SKILLS, SOFT_SKILLS } from "..";
import { goalTemplateFromSkill } from "../templates";

describe("goalTemplateFromSkill", () => {
  it("starts a hard-skill goal from the skill's title and first example KPI, leaving the action for the manager", () => {
    const skill = HARD_SKILLS[0];
    expect(goalTemplateFromSkill(skill.key)).toEqual({
      type: "hard",
      skillKey: skill.key,
      title: skill.title,
      measure: skill.exampleKpis[0],
      developmentAction: "",
      evidenceSource: "",
      milestones: [],
    });
  });

  it("starts a soft-skill goal with its first suggested development action", () => {
    const skill = SOFT_SKILLS[0];
    const template = goalTemplateFromSkill(skill.key);
    expect(template).toMatchObject({
      type: "soft",
      skillKey: skill.key,
      title: skill.title,
      measure: skill.exampleKpis[0],
      developmentAction: skill.developmentActions[0],
    });
  });

  it("is undefined for an unknown skill", () => {
    expect(goalTemplateFromSkill("no-such-skill")).toBeUndefined();
  });

  it.each(ALL_SKILLS.map((skill) => [skill.key] as const))(
    "%s: the title and measure fit a saved goal's limits",
    (key) => {
      const template = goalTemplateFromSkill(key)!;
      expect(template.title.length).toBeLessThanOrEqual(150);
      expect(template.measure.length).toBeLessThanOrEqual(500);
      expect(template.measure).toMatch(/\d/);
    },
  );

  it("returns a fresh object each time, so a form can edit it freely", () => {
    const first = goalTemplateFromSkill(HARD_SKILLS[0].key)!;
    const second = goalTemplateFromSkill(HARD_SKILLS[0].key)!;
    expect(first).not.toBe(second);
    expect(first.milestones).not.toBe(second.milestones);
  });
});
