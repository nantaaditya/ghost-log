CREATE TYPE "public"."health_indicator" AS ENUM('on-track', 'at-risk', 'off-track');--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "health_indicator" "health_indicator";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "escalation_count" integer;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "incident_count" integer;