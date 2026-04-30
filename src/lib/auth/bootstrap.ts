import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

let bootstrapped = false;

export async function bootstrapAdmin() {
  if (bootstrapped) return;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existing) {
    bootstrapped = true;
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !name || !password) {
    throw new Error(
      "No admin user found. Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD env vars for first-run setup."
    );
  }

  const passwordHash = await hash(password, 12);

  await db.insert(users).values({
    email,
    name,
    role: "admin",
    status: "active",
    passwordHash,
  });

  console.log(`[bootstrap] Admin user created: ${email}`);
  bootstrapped = true;
}
