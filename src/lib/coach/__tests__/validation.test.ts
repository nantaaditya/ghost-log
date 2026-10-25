import { describe, it, expect } from "vitest";
import {
  createMessageSchema,
  listMessagesQuerySchema,
  MAX_MESSAGE_LEN,
  threadTargetSchema,
} from "../validation";

describe("threadTargetSchema", () => {
  it("accepts an empty body (a member marks their own thread)", () => {
    expect(threadTargetSchema.safeParse({}).success).toBe(true);
  });

  it("parses `upTo` into a Date", () => {
    const result = threadTargetSchema.safeParse({ upTo: "2026-10-25T10:00:00.000Z" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.upTo).toEqual(new Date("2026-10-25T10:00:00.000Z"));
  });

  it("rejects a malformed `upTo` or memberId", () => {
    expect(threadTargetSchema.safeParse({ upTo: "later" }).success).toBe(false);
    expect(threadTargetSchema.safeParse({ memberId: "abc" }).success).toBe(false);
  });
});

describe("listMessagesQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(listMessagesQuerySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a uuid memberId", () => {
    const result = listMessagesQuerySchema.safeParse({
      memberId: "0b0e9a62-6f5e-4c6c-9a4b-1f6d2f4f3a11",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a memberId that is not a uuid", () => {
    expect(listMessagesQuerySchema.safeParse({ memberId: "abc" }).success).toBe(false);
  });

  it("parses an ISO `after` into a Date", () => {
    const result = listMessagesQuerySchema.safeParse({ after: "2026-10-25T10:00:00.000Z" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.after).toBeInstanceOf(Date);
      expect(result.data.after?.toISOString()).toBe("2026-10-25T10:00:00.000Z");
    }
  });

  it("rejects an `after` that is not an ISO datetime", () => {
    expect(listMessagesQuerySchema.safeParse({ after: "yesterday" }).success).toBe(false);
  });
});

describe("createMessageSchema", () => {
  it("accepts a normal message and trims it", () => {
    const result = createMessageSchema.safeParse({ body: "  Hello  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("Hello");
  });

  it("rejects an empty body", () => {
    expect(createMessageSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only body", () => {
    expect(createMessageSchema.safeParse({ body: "   \n\t " }).success).toBe(false);
  });

  it("rejects a body over the max length", () => {
    const result = createMessageSchema.safeParse({ body: "A".repeat(MAX_MESSAGE_LEN + 1) });
    expect(result.success).toBe(false);
  });

  it("accepts a body at exactly the max length", () => {
    const result = createMessageSchema.safeParse({ body: "A".repeat(MAX_MESSAGE_LEN) });
    expect(result.success).toBe(true);
  });

  it("rejects a missing body field", () => {
    expect(createMessageSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string body", () => {
    expect(createMessageSchema.safeParse({ body: 42 }).success).toBe(false);
  });

  it("accepts an optional memberId for admin-targeted threads", () => {
    const result = createMessageSchema.safeParse({
      body: "Hi",
      memberId: "0b0e9a62-6f5e-4c6c-9a4b-1f6d2f4f3a11",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a memberId that is not a uuid", () => {
    expect(createMessageSchema.safeParse({ body: "Hi", memberId: "not-a-uuid" }).success).toBe(false);
  });
});
