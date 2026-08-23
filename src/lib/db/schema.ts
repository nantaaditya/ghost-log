import {
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
  uuid,
  unique,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const announcementStatusEnum = pgEnum("announcement_status", ["draft", "published"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "active", "inactive"]);
export const reportStatusEnum = pgEnum("report_status", ["draft", "submitted"]);
export const healthIndicatorEnum = pgEnum("health_indicator", ["on-track", "at-risk", "off-track"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  status: userStatusEnum("status").notNull().default("pending"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inviteTokens = pgTable("invite_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
});

export const onedriveCredentials = pgTable("onedrive_credentials", {
  id: varchar("id", { length: 10 }).primaryKey().default("singleton"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    weekId: varchar("week_id", { length: 20 }).notNull(),
    onedrivePath: text("onedrive_path").notNull(),
    status: reportStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    healthIndicator: healthIndicatorEnum("health_indicator"),
    escalationCount: integer("escalation_count"),
    incidentCount: integer("incident_count"),
  },
  (table) => [unique("reports_user_id_week_id_unique").on(table.userId, table.weekId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type InviteToken = typeof inviteTokens.$inferSelect;
export type NewInviteToken = typeof inviteTokens.$inferInsert;
export type OnedriveCredentials = typeof onedriveCredentials.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  imageData: text("image_data"),
  imageAlt: varchar("image_alt", { length: 150 }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  status: announcementStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;

export const announcementComments = pgTable("announcement_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcementId: uuid("announcement_id")
    .notNull()
    .references(() => announcements.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AnnouncementComment = typeof announcementComments.$inferSelect;
export type NewAnnouncementComment = typeof announcementComments.$inferInsert;
