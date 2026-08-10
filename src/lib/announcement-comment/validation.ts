import { z } from "zod";

export const MAX_COMMENT_LEN = 2000;

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment is required")
    .max(MAX_COMMENT_LEN, `Comment must be at most ${MAX_COMMENT_LEN} characters`),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
