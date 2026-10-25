import { describe, it, expect } from "vitest";
import { importPayloadSchema } from "../import-payload";
import { makePayload, makePerson } from "./fixtures";

describe("importPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(importPayloadSchema.safeParse(makePayload()).success).toBe(true);
  });

  it("trims the person's name", () => {
    const result = importPayloadSchema.safeParse(makePayload([makePerson({ nama: "  Ana Tester  " })]));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.people[0].nama).toBe("Ana Tester");
  });

  it.each([undefined, null, "", "   "])(
    "treats memberSummary %j as not provided, so a re-import keeps the one already stored",
    (value) => {
      const person: Record<string, unknown> = { ...makePerson() };
      if (value === undefined) delete person.memberSummary;
      else person.memberSummary = value;
      const result = importPayloadSchema.safeParse({ ...makePayload(), people: [person] });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.people[0].memberSummary).toBeUndefined();
    },
  );

  it("leaves the manager's notes undefined when the export omits them, but keeps explicit empty lists", () => {
    const omitted: Record<string, unknown> = { ...makePerson() };
    delete omitted.managerSummary;
    delete omitted.managerDecisions;
    const result = importPayloadSchema.safeParse({ ...makePayload(), people: [omitted] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.people[0].managerSummary).toBeUndefined();
      expect(result.data.people[0].managerDecisions).toBeUndefined();
    }

    const explicit = importPayloadSchema.safeParse(
      makePayload([makePerson({ managerSummary: [], managerDecisions: [] })]),
    );
    expect(explicit.success && explicit.data.people[0].managerSummary).toEqual([]);
  });

  it("rejects an unknown version, so a future export is not silently misread", () => {
    expect(importPayloadSchema.safeParse({ ...makePayload(), version: 2 }).success).toBe(false);
  });

  it("rejects a payload with no people", () => {
    expect(importPayloadSchema.safeParse(makePayload([])).success).toBe(false);
  });

  it("rejects a cycleYear before the first supported cycle", () => {
    expect(importPayloadSchema.safeParse({ ...makePayload(), cycleYear: 2019 }).success).toBe(false);
  });

  it.each([
    ["too short", "abc"],
    ["not hex", "z".repeat(64)],
    ["uppercase", "A".repeat(64)],
  ])("rejects a fingerprint that is %s", (_label, fingerprint) => {
    expect(importPayloadSchema.safeParse(makePayload([makePerson({ fingerprint })])).success).toBe(false);
  });

  it("requires exactly six scores and 22 answers", () => {
    const person = makePerson();
    expect(
      importPayloadSchema.safeParse(makePayload([{ ...person, scores: person.scores.slice(0, 5) }])).success,
    ).toBe(false);
    expect(
      importPayloadSchema.safeParse(makePayload([{ ...person, answers: person.answers.slice(0, 21) }])).success,
    ).toBe(false);
  });

  it("rejects a score count outside 0..12", () => {
    const person = makePerson();
    const scores = person.scores.map((s, i) => (i === 0 ? { ...s, jumlah: 13 } : s));
    expect(importPayloadSchema.safeParse(makePayload([{ ...person, scores }])).success).toBe(false);
  });

  it("rejects an oversized answer, so a pasted blob cannot bloat the database", () => {
    const person = makePerson();
    const answers = person.answers.map((a, i) => (i === 0 ? { ...a, jawaban: "x".repeat(3001) } : a));
    expect(importPayloadSchema.safeParse(makePayload([{ ...person, answers }])).success).toBe(false);
  });

  it("rejects more insight items than the dashboard can produce", () => {
    const item = { judul: "t", isi: "b" };
    const person = makePerson({ managerSummary: Array.from({ length: 9 }, () => item) });
    expect(importPayloadSchema.safeParse(makePayload([person])).success).toBe(false);
  });

  it("rejects an insight item missing its text", () => {
    const person = makePerson({ managerDecisions: [{ judul: "", isi: "b" }] });
    expect(importPayloadSchema.safeParse(makePayload([person])).success).toBe(false);
  });

  describe("goals", () => {
    const goal = {
      type: "hard" as const,
      title: "Own reconciliation",
      measure: "Match rate from 97% to 99.5%",
      developmentAction: "Pair with the settlement owner",
      skillKey: "clearing-settlement",
      evidenceSource: "Role; Q22",
      milestones: [{ quarter: "Q1" as const, description: "Map the flow" }],
    };

    it("defaults to no goals, so exports made before this feature still import", () => {
      const person: Record<string, unknown> = { ...makePerson() };
      delete person.goals;
      const result = importPayloadSchema.safeParse({ ...makePayload(), people: [person] });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.people[0].goals).toEqual([]);
    });

    it("takes an optional goalsCycleYear and rejects an implausible one", () => {
      expect(importPayloadSchema.safeParse({ ...makePayload(), goalsCycleYear: 2027 }).success).toBe(true);
      expect(importPayloadSchema.safeParse({ ...makePayload(), goalsCycleYear: 1999 }).success).toBe(false);
      const without = importPayloadSchema.safeParse(makePayload());
      expect(without.success && without.data.goalsCycleYear).toBeUndefined();
    });

    it("accepts proposed goals", () => {
      expect(importPayloadSchema.safeParse(makePayload([makePerson({ goals: [goal] })])).success).toBe(true);
    });

    it("accepts a custom skillKey the manager typed in, since only the framework's own proposals are strict", () => {
      const custom = { ...goal, skillKey: "my-own-skill" };
      expect(importPayloadSchema.safeParse(makePayload([makePerson({ goals: [custom] })])).success).toBe(true);
    });

    it("rejects an unknown goal type", () => {
      const bad = { ...goal, type: "other" } as unknown as typeof goal;
      expect(importPayloadSchema.safeParse(makePayload([makePerson({ goals: [bad] })])).success).toBe(false);
    });

    it("rejects more than 8 goals for one person", () => {
      const many = Array.from({ length: 9 }, () => goal);
      expect(importPayloadSchema.safeParse(makePayload([makePerson({ goals: many })])).success).toBe(false);
    });
  });

  it("rejects an empty name", () => {
    expect(importPayloadSchema.safeParse(makePayload([makePerson({ nama: "   " })])).success).toBe(false);
  });
});
