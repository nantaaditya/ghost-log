CREATE TYPE "public"."kpi_goal_status" AS ENUM('draft', 'shared');--> statement-breakpoint
CREATE TYPE "public"."kpi_goal_type" AS ENUM('soft', 'hard');--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"notified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "kpi_goals" (
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
);
--> statement-breakpoint
CREATE TABLE "kpi_profiles" (
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
);
--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_goals" ADD CONSTRAINT "kpi_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_profiles" ADD CONSTRAINT "kpi_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_messages_member_id_created_at_idx" ON "coach_messages" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "coach_messages_sender_id_created_at_idx" ON "coach_messages" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "kpi_goals_user_id_cycle_year_idx" ON "kpi_goals" USING btree ("user_id","cycle_year");