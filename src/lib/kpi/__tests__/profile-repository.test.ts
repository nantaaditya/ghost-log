import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { createTestDb } = await import("@/test/pg-test-db");
  return { db: await createTestDb() };
});

import { db } from "@/lib/db/client";
import { kpiProfiles, users } from "@/lib/db/schema";
import { toNewProfile } from "../import";
import { findByUser, findForMember, upsert } from "../profile-repository";
import { makePerson } from "./fixtures";

const ANA = "11111111-1111-4111-8111-111111111111";
const BUDI = "22222222-2222-4222-8222-222222222222";

const MANAGER_NOTE = "RAHASIA-CATATAN-MANAGER";

function profileFor(userId: string, overrides = {}) {
  return {
    ...toNewProfile(
      makePerson({
        managerSummary: [{ judul: MANAGER_NOTE, isi: "hipotesis" }],
        managerDecisions: [{ judul: "keputusan", isi: MANAGER_NOTE }],
        memberSummary: "Untuk anggota",
      }),
      userId,
      2026,
    ),
    ...overrides,
  };
}

beforeAll(async () => {
  await db.insert(users).values([
    { id: ANA, email: "ana@example.com", name: "Ana", role: "member", status: "active" },
    { id: BUDI, email: "budi@example.com", name: "Budi", role: "member", status: "active" },
  ]);
});

beforeEach(async () => {
  await db.delete(kpiProfiles);
});

describe("findByUser", () => {
  it("is null when there is no profile for that user and year", async () => {
    expect(await findByUser(ANA, 2026)).toBeNull();
  });

  it("returns the full row, including the manager-only fields", async () => {
    await upsert(profileFor(ANA));
    const row = await findByUser(ANA, 2026);
    expect(row?.managerSummary[0].judul).toBe(MANAGER_NOTE);
    expect(row?.managerDecisions[0].isi).toBe(MANAGER_NOTE);
  });

  it("is scoped to the year", async () => {
    await upsert(profileFor(ANA));
    expect(await findByUser(ANA, 2027)).toBeNull();
  });
});

describe("findForMember", () => {
  it("is null when there is no profile", async () => {
    expect(await findForMember(ANA, 2026)).toBeNull();
  });

  it("returns only member-visible columns, never fetching the manager's notes", async () => {
    await upsert(profileFor(ANA));
    const view = await findForMember(ANA, 2026);

    expect(view).not.toBeNull();
    expect(Object.keys(view!).sort()).toEqual(
      ["answers", "cycleYear", "id", "importedAt", "memberSummary", "profile", "scores", "userId"].sort(),
    );
    expect(JSON.stringify(view)).not.toContain(MANAGER_NOTE);
    expect(view?.memberSummary).toBe("Untuk anggota");
  });

  it("only ever returns the requested user's profile", async () => {
    await upsert(profileFor(BUDI));
    expect(await findForMember(ANA, 2026)).toBeNull();
  });
});

describe("upsert", () => {
  it("creates one profile per user and year", async () => {
    await upsert(profileFor(ANA));
    expect((await db.select().from(kpiProfiles)).length).toBe(1);
  });

  it("is idempotent: a re-import updates in place and keeps the same row", async () => {
    const first = await upsert(profileFor(ANA));
    const second = await upsert(profileFor(ANA, { memberSummary: "Diperbarui", fingerprint: "e".repeat(64) }));

    expect(second.id).toBe(first.id);
    expect(second.memberSummary).toBe("Diperbarui");
    expect(second.fingerprint).toBe("e".repeat(64));
    expect((await db.select().from(kpiProfiles)).length).toBe(1);
  });

  it("refreshes importedAt on re-import", async () => {
    const first = await upsert(profileFor(ANA));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await upsert(profileFor(ANA));
    expect(second.importedAt.getTime()).toBeGreaterThan(first.importedAt.getTime());
  });

  it("keeps the stored notes and member summary when a re-import does not provide them", async () => {
    await upsert(profileFor(ANA));
    const bare = {
      ...profileFor(ANA, { fingerprint: "f".repeat(64) }),
      managerSummary: undefined,
      managerDecisions: undefined,
      memberSummary: undefined,
    };
    await upsert(bare);

    const row = await findByUser(ANA, 2026);
    expect(row?.fingerprint).toBe("f".repeat(64));
    expect(row?.managerSummary[0].judul).toBe(MANAGER_NOTE);
    expect(row?.memberSummary).toBe("Untuk anggota");
  });

  it("never touches another user's profile", async () => {
    await upsert(profileFor(BUDI));
    await upsert(profileFor(ANA, { memberSummary: "Hanya Ana" }));
    const budi = await findByUser(BUDI, 2026);
    expect(budi?.memberSummary).toBe("Untuk anggota");
  });
});
