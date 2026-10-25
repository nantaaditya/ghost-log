import { describe, it, expect } from "vitest";
import { ALL_SKILLS, HARD_SKILLS, SOFT_SKILLS, SURVEY_DIMENSIONS, findSkill } from "..";

// Core areas of card management and financial systems. Dropping one should be a deliberate act.
const CORE_HARD_SKILL_KEYS = [
  "card-lifecycle",
  "authorization-flow",
  "card-security",
  "ledger-accounting",
  "payment-consistency",
  "clearing-settlement",
  "fraud-risk",
  "regulatory-compliance",
  "reliability-operations",
  "financial-correctness-testing",
];

const isFilled = (value: string) => value.trim().length > 0 && value === value.trim();

describe("hard skills", () => {
  it("cover the core areas of card management and financial systems", () => {
    const keys = HARD_SKILLS.map((skill) => skill.key);
    for (const required of CORE_HARD_SKILL_KEYS) expect(keys).toContain(required);
  });

  it("have unique kebab-case keys", () => {
    const keys = HARD_SKILLS.map((skill) => skill.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it.each(HARD_SKILLS.map((skill) => [skill.key, skill] as const))(
    "%s describes four ascending levels with observable behaviours",
    (_key, skill) => {
      expect(skill.levels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
      expect(new Set(skill.levels.map((level) => level.label)).size).toBe(4);
      for (const level of skill.levels) {
        expect(level.behaviors.length).toBeGreaterThanOrEqual(2);
        for (const behavior of level.behaviors) expect(isFilled(behavior)).toBe(true);
      }
    },
  );

  it.each(HARD_SKILLS.map((skill) => [skill.key, skill] as const))(
    "%s names evidence and example KPIs",
    (_key, skill) => {
      expect(isFilled(skill.title)).toBe(true);
      expect(isFilled(skill.summary)).toBe(true);
      expect(skill.evidence.length).toBeGreaterThanOrEqual(2);
      expect(skill.exampleKpis.length).toBeGreaterThanOrEqual(2);
      for (const text of [...skill.evidence, ...skill.exampleKpis]) expect(isFilled(text)).toBe(true);
    },
  );
});

describe("soft skills", () => {
  it("have exactly one track per survey dimension, using the survey's own dimension names", () => {
    expect(SOFT_SKILLS.map((skill) => skill.dimension).sort()).toEqual([...SURVEY_DIMENSIONS].sort());
    expect([...SURVEY_DIMENSIONS].sort()).toEqual(
      ["Ambition", "Learning", "Ownership", "People", "Resilience", "Vision"],
    );
  });

  it.each(SOFT_SKILLS.map((skill) => [skill.dimension, skill] as const))(
    "%s has development actions, example KPIs and a caution",
    (_dimension, skill) => {
      expect(isFilled(skill.title)).toBe(true);
      expect(isFilled(skill.summary)).toBe(true);
      expect(skill.developmentActions.length).toBeGreaterThanOrEqual(3);
      expect(skill.exampleKpis.length).toBeGreaterThanOrEqual(2);
      expect(isFilled(skill.watchFor)).toBe(true);
      for (const text of [...skill.developmentActions, ...skill.exampleKpis]) expect(isFilled(text)).toBe(true);
    },
  );
});

describe("example KPIs", () => {
  const all = ALL_SKILLS.flatMap((skill) => skill.exampleKpis.map((kpi) => [skill.key, kpi] as const));

  it("exist for every skill", () => {
    expect(all.length).toBeGreaterThan(30);
  });

  it.each(all)("%s: states a measurable target (contains a number): %s", (_key, kpi) => {
    expect(kpi).toMatch(/\d/);
  });

  it("fit in a goal's `measure` field (max 500 characters)", () => {
    for (const [, kpi] of all) expect(kpi.length).toBeLessThanOrEqual(500);
  });
});

describe("keys and lookup", () => {
  it("never collide between hard and soft skills", () => {
    const keys = ALL_SKILLS.map((skill) => skill.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("findSkill returns a hard or soft skill by key", () => {
    expect(findSkill("authorization-flow")?.kind).toBe("hard");
    expect(findSkill(SOFT_SKILLS[0].key)?.kind).toBe("soft");
  });

  it("findSkill returns undefined for an unknown key", () => {
    expect(findSkill("no-such-skill")).toBeUndefined();
  });
});
