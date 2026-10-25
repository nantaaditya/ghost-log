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

  await sql`
    CREATE TABLE IF NOT EXISTS "announcement_comments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "announcement_id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "body" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'announcement_comments_announcement_id_announcements_id_fk'
      ) THEN
        ALTER TABLE "announcement_comments"
          ADD CONSTRAINT "announcement_comments_announcement_id_announcements_id_fk"
          FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'announcement_comments_user_id_users_id_fk'
      ) THEN
        ALTER TABLE "announcement_comments"
          ADD CONSTRAINT "announcement_comments_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
          ON DELETE no action ON UPDATE no action;
      END IF;
    END $$
  `;

  console.log("✓ Migration 0003 applied — announcement_comments table ready");

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'health_indicator') THEN
        CREATE TYPE "public"."health_indicator" AS ENUM('on-track', 'at-risk', 'off-track');
      END IF;
    END $$
  `;

  await sql`ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "health_indicator" "health_indicator"`;
  await sql`ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "escalation_count" integer`;
  await sql`ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "incident_count" integer`;

  console.log("✓ Migration 0004 applied — reports health_indicator/escalation_count/incident_count ready");

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'image_display_mode') THEN
        CREATE TYPE "public"."image_display_mode" AS ENUM('cover', 'contain');
      END IF;
    END $$
  `;

  await sql`ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "image_display_mode" "image_display_mode" DEFAULT 'contain'`;

  console.log("✓ Migration 0005 applied — announcements image_display_mode ready");

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_goal_status') THEN
        CREATE TYPE "public"."kpi_goal_status" AS ENUM('draft', 'shared');
      END IF;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kpi_goal_type') THEN
        CREATE TYPE "public"."kpi_goal_type" AS ENUM('soft', 'hard');
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "coach_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "member_id" uuid NOT NULL,
      "sender_id" uuid NOT NULL,
      "body" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "read_at" timestamp,
      "notified_at" timestamp
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "kpi_goals" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "cycle_year" integer NOT NULL,
      "type" "kpi_goal_type" NOT NULL,
      "skill_key" varchar(60),
      "title" varchar(150) NOT NULL,
      "measure" text NOT NULL,
      "milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "development_action" text NOT NULL,
      "evidence_source" text,
      "status" "kpi_goal_status" DEFAULT 'draft' NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "kpi_profiles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "cycle_year" integer NOT NULL,
      "fingerprint" varchar(64) NOT NULL,
      "scores" jsonb NOT NULL,
      "profile" jsonb NOT NULL,
      "answers" jsonb NOT NULL,
      "member_summary" text,
      "manager_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "manager_decisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "imported_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "kpi_profiles_user_id_cycle_year_unique" UNIQUE("user_id","cycle_year")
    )
  `;

  const foreignKeys: ReadonlyArray<readonly [string, string, string]> = [
    ["coach_messages", "coach_messages_member_id_users_id_fk", "member_id"],
    ["coach_messages", "coach_messages_sender_id_users_id_fk", "sender_id"],
    ["kpi_goals", "kpi_goals_user_id_users_id_fk", "user_id"],
    ["kpi_profiles", "kpi_profiles_user_id_users_id_fk", "user_id"],
  ];

  for (const [table, constraint, column] of foreignKeys) {
    // Identifiers come from the constant list above, never from user input.
    await sql.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = '${constraint}'
        ) THEN
          ALTER TABLE "${table}"
            ADD CONSTRAINT "${constraint}"
            FOREIGN KEY ("${column}") REFERENCES "public"."users"("id")
            ON DELETE no action ON UPDATE no action;
        END IF;
      END $$
    `);
  }

  await sql`CREATE INDEX IF NOT EXISTS "coach_messages_member_id_created_at_idx" ON "coach_messages" USING btree ("member_id","created_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "coach_messages_sender_id_created_at_idx" ON "coach_messages" USING btree ("sender_id","created_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "kpi_goals_user_id_cycle_year_idx" ON "kpi_goals" USING btree ("user_id","cycle_year")`;

  console.log("✓ Migration 0006 applied — coach_messages, kpi_profiles, kpi_goals ready");
}

run()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("✗ Migration failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
