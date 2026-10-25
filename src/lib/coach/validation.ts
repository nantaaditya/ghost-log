import { z } from "zod";

export const MAX_MESSAGE_LEN = 2000;

export const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(MAX_MESSAGE_LEN, `Message must be at most ${MAX_MESSAGE_LEN} characters`),
  // Only meaningful for admins: which member's thread to post into.
  memberId: z.uuid().optional(),
});

// Body of endpoints that only need to know which member's thread (admins must send it).
export const threadTargetSchema = z.object({
  memberId: z.uuid().optional(),
  // Newest message the reader has actually seen; later ones stay unread.
  upTo: z.iso
    .datetime()
    .transform((value) => new Date(value))
    .optional(),
});

export const listMessagesQuerySchema = z.object({
  memberId: z.uuid().optional(),
  // Polling cursor: only messages at or after this instant. Callers de-duplicate by id.
  after: z.iso
    .datetime()
    .transform((value) => new Date(value))
    .optional(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
