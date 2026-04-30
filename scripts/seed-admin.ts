import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

loadEnvConfig(process.cwd());

const password = process.argv[2];
if (!password) {
  console.error("Usage: tsx scripts/seed-admin.ts <password>");
  process.exit(1);
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  const email = process.env.ADMIN_EMAIL!;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordHash = await hash(password, 12);

  if (existing) {
    await db.update(users).set({ passwordHash, status: "active", role: "admin" }).where(eq(users.email, email));
    console.log(`✓ Admin password updated for ${email}`);
  } else {
    await db.insert(users).values({ email, name: "Pramuditya", role: "admin", status: "active", passwordHash });
    console.log(`✓ Admin user created: ${email}`);
  }
}

main().catch(console.error);
