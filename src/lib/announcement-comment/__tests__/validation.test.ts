import { describe, it, expect } from "vitest";
import { createCommentSchema, MAX_COMMENT_LEN } from "../validation";

describe("createCommentSchema", () => {
  it("accepts a normal comment body", () => {
    const result = createCommentSchema.safeParse({ body: "Nice update!" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = createCommentSchema.safeParse({ body: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a body over max length", () => {
    const result = createCommentSchema.safeParse({ body: "A".repeat(MAX_COMMENT_LEN + 1) });
    expect(result.success).toBe(false);
  });

  it("accepts a body at exactly max length", () => {
    const result = createCommentSchema.safeParse({ body: "A".repeat(MAX_COMMENT_LEN) });
    expect(result.success).toBe(true);
  });

  it("rejects a missing body field", () => {
    const result = createCommentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
