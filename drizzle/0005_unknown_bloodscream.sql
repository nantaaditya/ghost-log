CREATE TYPE "public"."image_display_mode" AS ENUM('cover', 'contain');--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "image_display_mode" "image_display_mode" DEFAULT 'contain';