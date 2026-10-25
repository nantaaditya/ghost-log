import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { resolve } from "path";
import * as schema from "@/lib/db/schema";

/**
 * An in-process Postgres with the project's real generated migrations applied, so repository
 * tests exercise actual SQL semantics (and a broken migration fails the suite).
 * Use it by mocking `@/lib/db/client`:
 *   vi.mock("@/lib/db/client", async () => ({ db: await (await import("@/test/pg-test-db")).createTestDb() }));
 */
export async function createTestDb() {
  const client = new PGlite();
  // The schema uses `timestamp` (no zone) and the app treats stored values as UTC, as Neon's
  // UTC session does. Pin the session so column defaults like now() don't follow the host's zone.
  await client.exec("SET TIME ZONE 'UTC'");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
  return db;
}
