import { describe, it, expect } from "vitest";
import { isPublishedAndVisible } from "../visibility";
import type { Announcement } from "@/lib/db/schema";

const base: Announcement = {
  id: "ann-1",
  title: "Test",
  body: "Body",
  imageData: null,
  imageAlt: null,
  authorId: "admin-1",
  status: "published",
  publishedAt: new Date("2026-06-01T00:00:00Z"),
  expiresAt: null,
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
};

const now = new Date("2026-06-19T00:00:00Z");

describe("isPublishedAndVisible", () => {
  it("returns true for a published announcement with no expiry", () => {
    expect(isPublishedAndVisible(base, now)).toBe(true);
  });

  it("returns false for a draft announcement", () => {
    expect(isPublishedAndVisible({ ...base, status: "draft" }, now)).toBe(false);
  });

  it("returns false when publishedAt is in the future", () => {
    expect(isPublishedAndVisible({ ...base, publishedAt: new Date("2026-07-01T00:00:00Z") }, now)).toBe(false);
  });

  it("returns false when publishedAt is null", () => {
    expect(isPublishedAndVisible({ ...base, publishedAt: null }, now)).toBe(false);
  });

  it("returns false when expiresAt is in the past", () => {
    expect(isPublishedAndVisible({ ...base, expiresAt: new Date("2026-06-10T00:00:00Z") }, now)).toBe(false);
  });

  it("returns true when expiresAt is in the future", () => {
    expect(isPublishedAndVisible({ ...base, expiresAt: new Date("2026-07-01T00:00:00Z") }, now)).toBe(true);
  });
});
