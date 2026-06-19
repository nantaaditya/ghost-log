import { describe, it, expect } from "vitest";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  MAX_IMAGE_BYTES,
  MAX_TITLE_LEN,
  MAX_BODY_LEN,
} from "../validation";

const validBase64 = "A".repeat(100);
const validImageData = `data:image/jpeg;base64,${validBase64}`;

// base64 length that decodes to > MAX_IMAGE_BYTES bytes
// bytes = ceil(len * 3 / 4) > 400_000  →  len > 533_334
const oversizedBase64 = "A".repeat(540_000);
const oversizedImageData = `data:image/jpeg;base64,${oversizedBase64}`;

describe("createAnnouncementSchema", () => {
  describe("title", () => {
    it("accepts a normal title", () => {
      const result = createAnnouncementSchema.safeParse({ title: "Hello", body: "World" });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createAnnouncementSchema.safeParse({ title: "", body: "World" });
      expect(result.success).toBe(false);
    });

    it("rejects title over max length", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "A".repeat(MAX_TITLE_LEN + 1),
        body: "World",
      });
      expect(result.success).toBe(false);
    });

    it("accepts title at exactly max length", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "A".repeat(MAX_TITLE_LEN),
        body: "World",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("body", () => {
    it("rejects empty body", () => {
      const result = createAnnouncementSchema.safeParse({ title: "Hello", body: "" });
      expect(result.success).toBe(false);
    });

    it("rejects body over max length", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "A".repeat(MAX_BODY_LEN + 1),
      });
      expect(result.success).toBe(false);
    });

    it("accepts body at exactly max length", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "A".repeat(MAX_BODY_LEN),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("imageData", () => {
    it("accepts a valid data URL", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageData: validImageData,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string (no image)", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageData: "",
      });
      expect(result.success).toBe(true);
    });

    it("accepts undefined (no image)", () => {
      const result = createAnnouncementSchema.safeParse({ title: "Hello", body: "World" });
      expect(result.success).toBe(true);
    });

    it("rejects a plain URL", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageData: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-image data URL", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageData: "data:text/plain;base64,aGVsbG8=",
      });
      expect(result.success).toBe(false);
    });

    it(`rejects image data over ${MAX_IMAGE_BYTES / 1000}KB`, () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageData: oversizedImageData,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("imageAlt", () => {
    it("accepts valid alt text", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageAlt: "A team photo",
      });
      expect(result.success).toBe(true);
    });

    it("rejects alt text over max length", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        imageAlt: "A".repeat(MAX_TITLE_LEN + 1),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("publishedAt / expiresAt", () => {
    it("accepts valid ISO datetime strings", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        publishedAt: "2026-06-19T10:00:00.000Z",
        expiresAt: "2026-07-01T00:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null values", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        publishedAt: null,
        expiresAt: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-datetime strings", () => {
      const result = createAnnouncementSchema.safeParse({
        title: "Hello",
        body: "World",
        publishedAt: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updateAnnouncementSchema", () => {
  it("accepts an empty patch (all fields optional)", () => {
    const result = updateAnnouncementSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts status draft", () => {
    const result = updateAnnouncementSchema.safeParse({ status: "draft" });
    expect(result.success).toBe(true);
  });

  it("accepts status published", () => {
    const result = updateAnnouncementSchema.safeParse({ status: "published" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const result = updateAnnouncementSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(false);
  });

  it("accepts partial update with only title", () => {
    const result = updateAnnouncementSchema.safeParse({ title: "New title" });
    expect(result.success).toBe(true);
  });

  it("still enforces title max length when provided", () => {
    const result = updateAnnouncementSchema.safeParse({
      title: "A".repeat(MAX_TITLE_LEN + 1),
    });
    expect(result.success).toBe(false);
  });

  it("still rejects oversized imageData when provided", () => {
    const result = updateAnnouncementSchema.safeParse({ imageData: oversizedImageData });
    expect(result.success).toBe(false);
  });
});
