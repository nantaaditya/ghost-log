import { describe, it, expect } from "vitest";
import {
  canAccessMemberData,
  isAdminViewer,
  resolveThreadMemberId,
  toMemberProfileView,
  visibleGoalsFor,
} from "../access";

const admin = { id: "admin-1", role: "admin" };
const member = { id: "member-1", role: "member" };

describe("isAdminViewer", () => {
  it("is true only for the admin role", () => {
    expect(isAdminViewer(admin)).toBe(true);
    expect(isAdminViewer(member)).toBe(false);
  });

  it("is false for a missing viewer", () => {
    expect(isAdminViewer(null)).toBe(false);
    expect(isAdminViewer(undefined)).toBe(false);
  });
});

describe("canAccessMemberData", () => {
  it("allows a member to access their own data", () => {
    expect(canAccessMemberData(member, "member-1")).toBe(true);
  });

  it("denies a member access to another member's data", () => {
    expect(canAccessMemberData(member, "member-2")).toBe(false);
  });

  it("allows an admin to access any member's data", () => {
    expect(canAccessMemberData(admin, "member-1")).toBe(true);
    expect(canAccessMemberData(admin, "member-2")).toBe(true);
  });

  it("denies an unauthenticated viewer", () => {
    expect(canAccessMemberData(null, "member-1")).toBe(false);
    expect(canAccessMemberData(undefined, "member-1")).toBe(false);
  });

  it("denies a viewer with no id", () => {
    expect(canAccessMemberData({ id: "", role: "member" }, "")).toBe(false);
  });

  it("denies an unknown role even when ids match nothing", () => {
    expect(canAccessMemberData({ id: "x", role: "guest" }, "member-1")).toBe(false);
  });
});

describe("resolveThreadMemberId", () => {
  it("is unauthorized (401) without a viewer", () => {
    expect(resolveThreadMemberId(null, "member-1")).toMatchObject({ ok: false, status: 401 });
    expect(resolveThreadMemberId(undefined, undefined)).toMatchObject({ ok: false, status: 401 });
  });

  it("resolves a member to their own thread when no id is requested", () => {
    expect(resolveThreadMemberId(member, undefined)).toEqual({ ok: true, memberId: "member-1" });
  });

  it("resolves a member to their own thread when they request their own id", () => {
    expect(resolveThreadMemberId(member, "member-1")).toEqual({ ok: true, memberId: "member-1" });
  });

  it("forbids (403) a member requesting another member's thread", () => {
    expect(resolveThreadMemberId(member, "member-2")).toMatchObject({ ok: false, status: 403 });
  });

  it("resolves an admin to the requested member's thread", () => {
    expect(resolveThreadMemberId(admin, "member-2")).toEqual({ ok: true, memberId: "member-2" });
  });

  it("requires (400) an admin to name the member", () => {
    expect(resolveThreadMemberId(admin, undefined)).toMatchObject({ ok: false, status: 400 });
  });

  it("forbids (403) an unknown role", () => {
    expect(resolveThreadMemberId({ id: "x", role: "guest" }, "x")).toMatchObject({
      ok: false,
      status: 403,
    });
  });
});

describe("toMemberProfileView", () => {
  const profile = {
    id: "p-1",
    userId: "member-1",
    cycleYear: 2026,
    scores: [{ dimensi: "Resilience", jumlah: 5 }],
    memberSummary: "Kamu banyak memilih Resilience.",
    managerSummary: [{ judul: "Hipotesis", isi: "Sedang pemulihan." }],
    managerDecisions: [{ judul: "Tanya Q1", isi: "Buka dengan Q1." }],
  };

  it("removes manager-only fields", () => {
    const view = toMemberProfileView(profile);
    expect("managerSummary" in view).toBe(false);
    expect("managerDecisions" in view).toBe(false);
  });

  it("keeps member-visible fields", () => {
    const view = toMemberProfileView(profile);
    expect(view.memberSummary).toBe("Kamu banyak memilih Resilience.");
    expect(view.scores).toEqual(profile.scores);
    expect(view.userId).toBe("member-1");
  });

  it("does not mutate the input", () => {
    const snapshot = JSON.parse(JSON.stringify(profile));
    toMemberProfileView(profile);
    expect(profile).toEqual(snapshot);
  });

  it("fails closed: a field added to the profile later is not exposed until allowlisted", () => {
    const withNewField = { ...profile, futureManagerNote: "Consider for layoff" };
    const view = toMemberProfileView(withNewField);
    expect("futureManagerNote" in view).toBe(false);
    expect(JSON.stringify(view)).not.toContain("Consider for layoff");
  });

  it("does not leak manager text anywhere in the serialized view", () => {
    const serialized = JSON.stringify(toMemberProfileView(profile));
    expect(serialized).not.toContain("Hipotesis");
    expect(serialized).not.toContain("Tanya Q1");
  });
});

describe("visibleGoalsFor", () => {
  const goals = [
    { id: "g1", userId: "member-1", status: "draft" as const },
    { id: "g2", userId: "member-1", status: "shared" as const },
    { id: "g3", userId: "member-2", status: "shared" as const },
  ];

  it("lets an admin see every goal including drafts", () => {
    expect(visibleGoalsFor(admin, goals).map((g) => g.id)).toEqual(["g1", "g2", "g3"]);
  });

  it("lets a member see only their own shared goals", () => {
    expect(visibleGoalsFor(member, goals).map((g) => g.id)).toEqual(["g2"]);
  });

  it("returns nothing for an unauthenticated viewer", () => {
    expect(visibleGoalsFor(null, goals)).toEqual([]);
  });
});
