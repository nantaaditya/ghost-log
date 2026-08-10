"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_IMAGE_BYTES } from "@/lib/announcement/validation";

export type AnnouncementFormValues = {
  title: string;
  body: string;
  imageData: string;
  imageAlt: string;
  expiresAt: string;
  status: "draft" | "published";
};

type Props = {
  initialValues?: Partial<AnnouncementFormValues>;
  onSubmit: (values: AnnouncementFormValues) => void;
  submitting: boolean;
  submitLabel?: string;
};

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 800;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL("image/webp", 0.75);
      const bytes = Math.ceil(((dataUrl.split(",")[1] ?? "").length * 3) / 4);
      if (bytes > MAX_IMAGE_BYTES) {
        dataUrl = canvas.toDataURL("image/webp", 0.45);
      }
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function AnnouncementForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel = "Save",
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [imageData, setImageData] = useState(initialValues?.imageData ?? "");
  const [imageAlt, setImageAlt] = useState(initialValues?.imageAlt ?? "");
  const [expiresAt, setExpiresAt] = useState(initialValues?.expiresAt ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    initialValues?.status ?? "draft"
  );
  const [imageError, setImageError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setImageError("Only JPEG, PNG, WebP, or GIF allowed");
      return;
    }

    setImageError("");
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const bytes = Math.ceil(((compressed.split(",")[1] ?? "").length * 3) / 4);
      if (bytes > MAX_IMAGE_BYTES) {
        setImageError(`Image too large after compression (${Math.round(bytes / 1000)}KB). Use a smaller image.`);
        return;
      }
      setImageData(compressed);
    } catch {
      setImageError("Failed to process image");
    } finally {
      setCompressing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, body, imageData, imageAlt, expiresAt, status });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ann-title">Title *</Label>
        <Input
          id="ann-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          maxLength={150}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ann-body">Body (markdown) *</Label>
        <Textarea
          id="ann-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement…"
          className="min-h-28 font-mono text-sm"
          maxLength={10000}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Image (optional)</Label>
        {imageData ? (
          <div className="space-y-2">
            <img
              src={imageData}
              alt="preview"
              className="w-full max-h-40 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImageData("");
                setImageAlt("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Remove image
            </Button>
          </div>
        ) : (
          <Input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={compressing}
            className="cursor-pointer"
          />
        )}
        {compressing && <p className="text-xs text-muted-foreground">Compressing…</p>}
        {imageError && <p className="text-xs text-destructive">{imageError}</p>}
      </div>

      {imageData && (
        <div className="space-y-1.5">
          <Label htmlFor="ann-alt">Image description (alt text)</Label>
          <Input
            id="ann-alt"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Brief description of the image"
            maxLength={150}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="ann-expires">Expires at (optional)</Label>
        <Input
          id="ann-expires"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Announcement auto-hides after this date.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ann-status">Status</Label>
        <select
          id="ann-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <Button type="submit" disabled={compressing} loading={submitting} className="w-full">
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
