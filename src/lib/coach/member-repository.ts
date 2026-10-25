import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export type Contact = { id: string; name: string; email: string };
export type MemberContact = Contact & { status: "pending" | "active" | "inactive" };

/** An active, non-admin user. Returns null for admins, unknown ids and inactive accounts. */
export async function findMemberById(id: string): Promise<MemberContact | null> {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "member"), eq(users.status, "active")))
    .limit(1);

  return row ?? null;
}

/** Active non-admin users, A to Z: the admin's list of people to talk to. */
export async function listActiveMembers(): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.role, "member"), eq(users.status, "active")))
    .orderBy(asc(users.name));
}

export type UserAccess = {
  id: string;
  name: string;
  role: "admin" | "member";
  status: "pending" | "active" | "inactive";
};

/** The user's current role and status straight from the database (the JWT's copy can be stale). */
export async function findUserAccess(id: string): Promise<UserAccess | null> {
  const [row] = await db
    .select({ id: users.id, name: users.name, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return row ?? null;
}

export async function listActiveAdmins(): Promise<Contact[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")));
}
