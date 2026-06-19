import { z } from "zod";

export const MAX_IMAGE_BYTES = 400_000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_TITLE_LEN = 150;
export const MAX_BODY_LEN = 10_000;

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(MAX_TITLE_LEN, `Title must be at most ${MAX_TITLE_LEN} characters`),
  body: z
    .string()
    .min(1, "Body is required")
    .max(MAX_BODY_LEN, `Body must be at most ${MAX_BODY_LEN} characters`),
  imageData: z
    .string()
    .refine(
      (val) => val === "" || val.startsWith("data:image/"),
      "Invalid image data URL"
    )
    .refine(
      (val) => {
        if (val === "") return true;
        const base64 = val.split(",")[1] ?? "";
        return Math.ceil((base64.length * 3) / 4) <= MAX_IMAGE_BYTES;
      },
      `Image must be at most ${MAX_IMAGE_BYTES / 1000}KB`
    )
    .optional(),
  imageAlt: z
    .string()
    .max(MAX_TITLE_LEN, `Image alt must be at most ${MAX_TITLE_LEN} characters`)
    .optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  status: z.enum(["draft", "published"]).optional(),
});

export type CreateAnnouncementDto = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementDto = z.infer<typeof updateAnnouncementSchema>;
