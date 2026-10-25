import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("@/lib/db/client", async () => {
  const { createTestDb } = await import("@/test/pg-test-db");
  return { db: await createTestDb() };
});

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  findMemberById,
  findUserAccess,
  listActiveAdmins,
  listActiveMembers,
} from "../member-repository";

const ACTIVE_MEMBER = "11111111-1111-4111-8111-111111111111";
const INACTIVE_MEMBER = "22222222-2222-4222-8222-222222222222";
const PENDING_MEMBER = "33333333-3333-4333-8333-333333333333";
const ACTIVE_ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE_ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const UNKNOWN = "99999999-9999-4999-8999-999999999999";

beforeAll(async () => {
  await db.insert(users).values([
    { id: ACTIVE_MEMBER, email: "m1@example.com", name: "Active Member", role: "member", status: "active" },
    { id: INACTIVE_MEMBER, email: "m2@example.com", name: "Inactive", role: "member", status: "inactive" },
    { id: PENDING_MEMBER, email: "m3@example.com", name: "Pending", role: "member", status: "pending" },
    { id: ACTIVE_ADMIN, email: "a1@example.com", name: "Active Admin", role: "admin", status: "active" },
    { id: INACTIVE_ADMIN, email: "a2@example.com", name: "Gone Admin", role: "admin", status: "inactive" },
  ]);
});

describe("findMemberById", () => {
  it("returns an active member with their contact details", async () => {
    expect(await findMemberById(ACTIVE_MEMBER)).toMatchObject({
      id: ACTIVE_MEMBER,
      name: "Active Member",
      email: "m1@example.com",
    });
  });

  it.each([
    ["an admin", ACTIVE_ADMIN],
    ["an inactive member", INACTIVE_MEMBER],
    ["a pending member", PENDING_MEMBER],
    ["an unknown id", UNKNOWN],
  ])("returns null for %s", async (_label, id) => {
    expect(await findMemberById(id)).toBeNull();
  });
});

describe("listActiveAdmins", () => {
  it("returns only active admins", async () => {
    const admins = await listActiveAdmins();
    expect(admins.map((a) => a.id)).toEqual([ACTIVE_ADMIN]);
    expect(admins[0]).toMatchObject({ name: "Active Admin", email: "a1@example.com" });
  });
});

describe("listActiveMembers", () => {
  it("returns only active, non-admin users, with just an id and a name", async () => {
    expect(await listActiveMembers()).toEqual([{ id: ACTIVE_MEMBER, name: "Active Member" }]);
  });
});

describe("findUserAccess", () => {
  it("returns the role and status as they are in the database", async () => {
    expect(await findUserAccess(INACTIVE_ADMIN)).toEqual({
      id: INACTIVE_ADMIN,
      name: "Gone Admin",
      role: "admin",
      status: "inactive",
    });
  });

  it("returns null for an unknown id", async () => {
    expect(await findUserAccess(UNKNOWN)).toBeNull();
  });
});
