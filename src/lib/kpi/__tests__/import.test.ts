import { describe, it, expect, vi } from "vitest";
import type { KpiProfile } from "@/lib/db/schema";
import { profileUpdateSet, runImport, toNewProfile, type ImportDeps } from "../import";
import { importPayloadSchema } from "../import-payload";
import type { ImportUser } from "../resolve-members";
import { makePayload, makePerson } from "./fixtures";

const ana: ImportUser = { id: "u-ana", name: "Ana Tester", email: "ana@example.com", status: "active" };
const budi: ImportUser = { id: "u-budi", name: "Budi Santoso", email: "budi@example.com", status: "active" };

function parse(payload: unknown) {
  return importPayloadSchema.parse(payload);
}

function makeDeps(
  existing: Record<string, KpiProfile | null> = {},
  goalCounts: Record<string, number> = {},
): ImportDeps & {
  upsert: ReturnType<typeof vi.fn>;
  insertGoals: ReturnType<typeof vi.fn>;
  countGoals: ReturnType<typeof vi.fn>;
} {
  return {
    findExisting: vi.fn(async (userId: string) => existing[userId] ?? null),
    upsert: vi.fn(async () => undefined),
    countGoals: vi.fn(async (userId: string) => goalCounts[userId] ?? 0),
    insertGoals: vi.fn(async () => undefined),
  };
}

const goal = (title: string) => ({
  type: "hard" as const,
  title,
  measure: "Match rate from 97% to 99.5%",
  developmentAction: "Pair with the settlement owner",
  skillKey: "clearing-settlement",
  evidenceSource: "Role; Q22",
  milestones: [{ quarter: "Q1" as const, description: "Map the flow" }],
});

function stored(userId: string, person = makePerson()): KpiProfile {
  return { ...toNewProfile(person, userId, 2026), id: "p-1", importedAt: new Date("2026-10-01T00:00:00Z") } as KpiProfile;
}

describe("toNewProfile", () => {
  it("maps the person onto a profile row for the user and cycle", () => {
    const person = parse(makePayload([makePerson({ memberSummary: "Untuk Ana" })])).people[0];
    const row = toNewProfile(person, "u-ana", 2026);
    expect(row).toMatchObject({
      userId: "u-ana",
      cycleYear: 2026,
      fingerprint: person.fingerprint,
      memberSummary: "Untuk Ana",
      scores: person.scores,
      profile: person.profile,
      answers: person.answers,
      managerSummary: person.managerSummary,
      managerDecisions: person.managerDecisions,
    });
  });
});

describe("profileUpdateSet", () => {
  it("replaces every field the export provides and refreshes importedAt, but never the owner", () => {
    const person = parse(makePayload([makePerson({ memberSummary: "Untuk Ana" })])).people[0];
    const set = profileUpdateSet(toNewProfile(person, "u-ana", 2026));
    expect(Object.keys(set).sort()).toEqual(
      ["answers", "fingerprint", "importedAt", "managerDecisions", "managerSummary", "memberSummary", "profile", "scores"].sort(),
    );
    expect(set.importedAt).toBeInstanceOf(Date);
  });

  it("leaves stored notes alone when the export does not provide them", () => {
    const person = parse(
      makePayload([makePerson({ managerSummary: undefined, managerDecisions: undefined })]),
    ).people[0];
    const set = profileUpdateSet(toNewProfile(person, "u-ana", 2026));
    expect(Object.keys(set)).not.toContain("managerSummary");
    expect(Object.keys(set)).not.toContain("managerDecisions");
    expect(Object.keys(set)).not.toContain("memberSummary");
  });

  it("does overwrite with an explicit empty list, which means 'no notes'", () => {
    const person = parse(makePayload([makePerson({ managerSummary: [] })])).people[0];
    const set = profileUpdateSet(toNewProfile(person, "u-ana", 2026));
    expect(set.managerSummary).toEqual([]);
  });
});

describe("runImport", () => {
  const payload = parse(makePayload([makePerson(), makePerson({ nama: "Budi Santoso", fingerprint: "b".repeat(64) })]));

  it("creates profiles for people who have none", async () => {
    const deps = makeDeps();
    const result = await runImport({ payload, users: [ana, budi], deps });
    expect(result.problems).toEqual([]);
    expect(result.created).toEqual(["Ana Tester", "Budi Santoso"]);
    expect(deps.upsert).toHaveBeenCalledTimes(2);
    expect(deps.upsert).toHaveBeenCalledWith(expect.objectContaining({ userId: "u-ana", cycleYear: 2026 }));
  });

  it("leaves a profile alone when nothing changed, whatever the JSON key order", async () => {
    const sameButReordered = stored("u-ana");
    sameButReordered.profile = Object.fromEntries(Object.entries(sameButReordered.profile as object).reverse());
    const deps = makeDeps({ "u-ana": sameButReordered });
    const result = await runImport({ payload: parse(makePayload([makePerson()])), users: [ana], deps });
    expect(result.unchanged).toEqual(["Ana Tester"]);
    expect(deps.upsert).not.toHaveBeenCalled();
  });

  it("updates when the answers changed", async () => {
    const old = stored("u-ana", makePerson({ fingerprint: "c".repeat(64) }));
    const deps = makeDeps({ "u-ana": old });
    const result = await runImport({ payload: parse(makePayload([makePerson()])), users: [ana], deps });
    expect(result.updated).toEqual(["Ana Tester"]);
    expect(deps.upsert).toHaveBeenCalledTimes(1);
  });

  it("updates when only the manager's notes or the member summary were edited", async () => {
    const old = stored("u-ana");
    const edited = makePerson({ memberSummary: "Ringkasan baru" });
    const deps = makeDeps({ "u-ana": old });
    const result = await runImport({ payload: parse(makePayload([edited])), users: [ana], deps });
    expect(result.updated).toEqual(["Ana Tester"]);
  });

  it("treats an export without notes or a member summary as unchanged when nothing else differs", async () => {
    const full = stored("u-ana", makePerson({ memberSummary: "Ditulis manager" }));
    const bare = makePerson({ managerSummary: undefined, managerDecisions: undefined });
    const deps = makeDeps({ "u-ana": full });
    const result = await runImport({ payload: parse(makePayload([bare])), users: [ana], deps });
    expect(result.unchanged).toEqual(["Ana Tester"]);
    expect(deps.upsert).not.toHaveBeenCalled();
  });

  it("when answers change but notes are omitted, updates without touching the stored notes", async () => {
    const old = stored("u-ana", makePerson({ fingerprint: "c".repeat(64), memberSummary: "Ditulis manager" }));
    const bare = makePerson({ managerSummary: undefined, managerDecisions: undefined });
    const deps = makeDeps({ "u-ana": old });
    const result = await runImport({ payload: parse(makePayload([bare])), users: [ana], deps });
    expect(result.updated).toEqual(["Ana Tester"]);
    const written = deps.upsert.mock.calls[0][0];
    expect(written.managerSummary).toBeUndefined();
    expect(written.memberSummary).toBeUndefined();
  });

  it("with dryRun, reports what would happen and writes nothing", async () => {
    const deps = makeDeps({ "u-ana": stored("u-ana", makePerson({ fingerprint: "c".repeat(64) })) });
    const result = await runImport({ payload, users: [ana, budi], deps, dryRun: true });
    expect(result.created).toEqual(["Budi Santoso"]);
    expect(result.updated).toEqual(["Ana Tester"]);
    expect(deps.upsert).not.toHaveBeenCalled();
  });

  it("writes nothing at all when any person cannot be resolved", async () => {
    const deps = makeDeps();
    const result = await runImport({ payload, users: [ana], deps });
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("Budi Santoso");
    expect(result.created).toEqual([]);
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.findExisting).not.toHaveBeenCalled();
  });

  it("uses the mapping to resolve names that differ from the app", async () => {
    const deps = makeDeps();
    const result = await runImport({
      payload: parse(makePayload([makePerson({ nama: "Ana T." })])),
      users: [ana],
      mapping: { "Ana T.": "ana@example.com" },
      deps,
    });
    expect(result.problems).toEqual([]);
    expect(result.created).toEqual(["Ana T."]);
    expect(deps.upsert).toHaveBeenCalledWith(expect.objectContaining({ userId: "u-ana" }));
  });

  describe("proposed goals", () => {
    const withGoals = parse(makePayload([makePerson({ goals: [goal("First"), goal("Second")] })]));

    it("inserts them as private drafts owned by the user, in the proposed order", async () => {
      const deps = makeDeps();
      const result = await runImport({ payload: withGoals, users: [ana], deps });
      expect(result.goalsCreated).toEqual(["Ana Tester"]);
      expect(deps.insertGoals).toHaveBeenCalledTimes(1);
      const rows = deps.insertGoals.mock.calls[0][0];
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        userId: "u-ana",
        cycleYear: 2027,
        status: "draft",
        sortOrder: 0,
        title: "First",
        skillKey: "clearing-settlement",
      });
      expect(rows[1]).toMatchObject({ status: "draft", sortOrder: 1, title: "Second" });
    });

    it("stores goals under the year they are planned for (survey year + 1 by default)", async () => {
      const deps = makeDeps();
      await runImport({ payload: withGoals, users: [ana], deps });
      expect(deps.countGoals).toHaveBeenCalledWith("u-ana", 2027);
      expect(deps.upsert).toHaveBeenCalledWith(expect.objectContaining({ cycleYear: 2026 }));
    });

    it("honours an explicit goalsCycleYear from the export", async () => {
      const deps = makeDeps();
      const payload = parse({ ...makePayload([makePerson({ goals: [goal("First")] })]), goalsCycleYear: 2028 });
      await runImport({ payload, users: [ana], deps });
      expect(deps.insertGoals.mock.calls[0][0][0]).toMatchObject({ cycleYear: 2028 });
    });

    it("never overwrites goals the user already has for the cycle, and says so", async () => {
      const deps = makeDeps({}, { "u-ana": 2 });
      const result = await runImport({ payload: withGoals, users: [ana], deps });
      expect(result.goalsCreated).toEqual([]);
      expect(result.goalsSkipped).toEqual(["Ana Tester"]);
      expect(deps.insertGoals).not.toHaveBeenCalled();
    });

    it("imports goals even when the profile itself is unchanged", async () => {
      const deps = makeDeps({ "u-ana": stored("u-ana") });
      const result = await runImport({ payload: withGoals, users: [ana], deps });
      expect(result.unchanged).toEqual(["Ana Tester"]);
      expect(result.goalsCreated).toEqual(["Ana Tester"]);
    });

    it("with dryRun, reports the goals that would be created and writes none", async () => {
      const deps = makeDeps();
      const result = await runImport({ payload: withGoals, users: [ana], deps, dryRun: true });
      expect(result.goalsCreated).toEqual(["Ana Tester"]);
      expect(deps.insertGoals).not.toHaveBeenCalled();
    });

    it("does not look at goals for people who have none", async () => {
      const deps = makeDeps();
      const result = await runImport({ payload: parse(makePayload()), users: [ana], deps });
      expect(result.goalsCreated).toEqual([]);
      expect(result.goalsSkipped).toEqual([]);
      expect(deps.countGoals).not.toHaveBeenCalled();
    });

    it("writes no goals when any person cannot be resolved", async () => {
      const deps = makeDeps();
      const result = await runImport({ payload: withGoals, users: [], deps });
      expect(result.problems).toHaveLength(1);
      expect(deps.insertGoals).not.toHaveBeenCalled();
    });
  });

  it("propagates a database failure instead of reporting success", async () => {
    const deps = makeDeps();
    deps.upsert.mockRejectedValueOnce(new Error("db down"));
    await expect(runImport({ payload, users: [ana, budi], deps })).rejects.toThrow("db down");
  });
});
