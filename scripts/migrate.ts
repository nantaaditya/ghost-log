import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = neon(url);

async function run() {
  // Create enum type — PostgreSQL has no IF NOT EXISTS for CREATE TYPE
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_status') THEN
        CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published');
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "announcements" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "title" varchar(150) NOT NULL,
      "body" text NOT NULL,
      "image_data" text,
      "image_alt" varchar(150),
      "author_id" uuid NOT NULL,
      "status" "announcement_status" DEFAULT 'draft' NOT NULL,
      "published_at" timestamp,
      "expires_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'announcements_author_id_users_id_fk'
      ) THEN
        ALTER TABLE "announcements"
          ADD CONSTRAINT "announcements_author_id_users_id_fk"
          FOREIGN KEY ("author_id") REFERENCES "public"."users"("id")
          ON DELETE no action ON UPDATE no action;
      END IF;
    END $$
  `;

  console.log("✓ Migration 0001 applied — announcements table ready");

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'reports_user_id_week_id_unique'
      ) THEN
        ALTER TABLE "reports"
          ADD CONSTRAINT "reports_user_id_week_id_unique"
          UNIQUE("user_id", "week_id");
      END IF;
    END $$
  `;

  console.log("✓ Migration 0002 applied — reports(user_id, week_id) unique constraint ready");
}

run()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("✗ Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
