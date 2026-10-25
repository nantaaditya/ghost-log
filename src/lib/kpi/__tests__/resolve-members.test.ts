import { describe, it, expect } from "vitest";
import { normalizeName, resolveMembers, type ImportUser } from "../resolve-members";

const ana: ImportUser = { id: "u-ana", name: "Ana Tester", email: "ana@example.com", status: "active" };
const budi: ImportUser = { id: "u-budi", name: "Budi Santoso", email: "budi@example.com", status: "active" };

describe("normalizeName", () => {
  it("is case-insensitive and collapses any whitespace, including NBSP", () => {
    expect(normalizeName("  Ana   Tester ")).toBe(normalizeName("ana tester"));
  });

  it("treats compatibility forms as equal (NFKC)", () => {
    expect(normalizeName("Ａna Tester")).toBe(normalizeName("Ana Tester"));
  });

  it("keeps different names different", () => {
    expect(normalizeName("Ana Tester")).not.toBe(normalizeName("Ana Tester Jr"));
  });
});

describe("resolveMembers", () => {
  it("matches people to active users by normalized name", () => {
    const result = resolveMembers([{ nama: "ana  TESTER" }, { nama: "Budi Santoso" }], [ana, budi]);
    expect(result.problems).toEqual([]);
    expect(result.matched).toEqual([
      { index: 0, userId: "u-ana" },
      { index: 1, userId: "u-budi" },
    ]);
  });

  it("reports a person nobody matches", () => {
    const result = resolveMembers([{ nama: "Cici Unknown" }], [ana]);
    expect(result.matched).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("Cici Unknown");
  });

  it("reports an ambiguous name instead of guessing", () => {
    const twin: ImportUser = { ...ana, id: "u-twin", email: "twin@example.com" };
    const result = resolveMembers([{ nama: "Ana Tester" }], [ana, twin]);
    expect(result.matched).toEqual([]);
    expect(result.problems[0]).toMatch(/more than one/i);
    expect(result.problems[0]).toContain("ana@example.com");
    expect(result.problems[0]).toContain("twin@example.com");
  });

  it("does not match an inactive or pending user, and says why", () => {
    const inactive: ImportUser = { ...ana, status: "inactive" };
    const result = resolveMembers([{ nama: "Ana Tester" }], [inactive]);
    expect(result.matched).toEqual([]);
    expect(result.problems[0]).toMatch(/not active/i);
  });

  it("ignores an inactive namesake when exactly one active user matches", () => {
    const inactiveTwin: ImportUser = { ...ana, id: "u-old", email: "old@example.com", status: "inactive" };
    const result = resolveMembers([{ nama: "Ana Tester" }], [inactiveTwin, ana]);
    expect(result.problems).toEqual([]);
    expect(result.matched).toEqual([{ index: 0, userId: "u-ana" }]);
  });

  it("lets an explicit mapping pick the user by email, case-insensitively, resolving ambiguity", () => {
    const twin: ImportUser = { ...ana, id: "u-twin", email: "twin@example.com" };
    const result = resolveMembers([{ nama: "Ana Tester" }], [ana, twin], { "ana tester": "TWIN@example.com" });
    expect(result.problems).toEqual([]);
    expect(result.matched).toEqual([{ index: 0, userId: "u-twin" }]);
  });

  it("reports a mapping that points at an unknown email", () => {
    const result = resolveMembers([{ nama: "Ana Tester" }], [ana], { "Ana Tester": "nobody@example.com" });
    expect(result.matched).toEqual([]);
    expect(result.problems[0]).toContain("nobody@example.com");
  });

  it("reports a mapping that points at an inactive user", () => {
    const inactive: ImportUser = { ...budi, status: "inactive" };
    const result = resolveMembers([{ nama: "Ana Tester" }], [ana, inactive], { "Ana Tester": "budi@example.com" });
    expect(result.matched).toEqual([]);
    expect(result.problems[0]).toMatch(/not active/i);
  });

  it("reports two people that resolve to the same user", () => {
    const result = resolveMembers([{ nama: "Ana Tester" }, { nama: "Budi" }], [ana], {
      Budi: "ana@example.com",
    });
    expect(result.problems.some((p) => /same user/i.test(p))).toBe(true);
  });

  it("reports duplicate names inside the payload", () => {
    const result = resolveMembers([{ nama: "Ana Tester" }, { nama: "ana   tester" }], [ana]);
    expect(result.problems.some((p) => /appears more than once/i.test(p))).toBe(true);
  });

  it("collects every problem rather than stopping at the first", () => {
    const result = resolveMembers([{ nama: "Nobody One" }, { nama: "Nobody Two" }], [ana]);
    expect(result.problems).toHaveLength(2);
  });
});
