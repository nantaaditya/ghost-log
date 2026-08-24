"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_BYTES } from "@/lib/announcement/validation";

const MarkdownEditor = dynamic(() => import("./MarkdownEditor"), {
  ssr: false,
  loading: () => <div className="min-h-28 rounded-lg border border-input bg-muted/20 animate-pulse" />,
});

export type AnnouncementFormValues = {
  title: string;
  body: string;
  imageData: string;
  imageAlt: string;
  imageDisplayMode: "cover" | "contain";
  expiresAt: string;
  status: "draft" | "published";
};

type Props = {
  initialValues?: Partial<AnnouncementFormValues>;
  onSubmit: (values: AnnouncementFormValues) => void;
  onChange?: (values: AnnouncementFormValues) => void;
  submitting: boolean;
  submitLabel?: string;
};

/** Crops the given crop rectangle (in the <img>'s rendered/displayed units) out of `image`,
 * scaling up to the image's natural resolution, then downsizes to a max dimension and
 * WebP-compresses it — same downscale/compress pipeline the old whole-file compressor used. */
function cropToDataUrl(image: HTMLImageElement, crop: PixelCrop): string {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(crop.width * scaleX));
  cropCanvas.height = Math.max(1, Math.round(crop.height * scaleY));
  cropCanvas
    .getContext("2d")!
    .drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

  const MAX_DIM = 800;
  let { width, height } = cropCanvas;
  let source: HTMLCanvasElement = cropCanvas;
  if (width > MAX_DIM || height > MAX_DIM) {
    if (width >= height) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    } else {
      width = Math.round((width * MAX_DIM) / height);
      height = MAX_DIM;
    }
    const resized = document.createElement("canvas");
    resized.width = width;
    resized.height = height;
    resized.getContext("2d")!.drawImage(cropCanvas, 0, 0, width, height);
    source = resized;
  }

  let dataUrl = source.toDataURL("image/webp", 0.75);
  const bytes = Math.ceil(((dataUrl.split(",")[1] ?? "").length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    dataUrl = source.toDataURL("image/webp", 0.45);
  }
  return dataUrl;
}

export default function AnnouncementForm({
  initialValues,
  onSubmit,
  onChange,
  submitting,
  submitLabel = "Save",
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [imageData, setImageData] = useState(initialValues?.imageData ?? "");
  const [imageAlt, setImageAlt] = useState(initialValues?.imageAlt ?? "");
  const [imageDisplayMode, setImageDisplayMode] = useState<"cover" | "contain">(initialValues?.imageDisplayMode ?? "contain");
  const [expiresAt, setExpiresAt] = useState(initialValues?.expiresAt ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    initialValues?.status ?? "draft"
  );
  const [imageError, setImageError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    onChange?.({ title, body, imageData, imageAlt, imageDisplayMode, expiresAt, status });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, imageData, imageAlt, imageDisplayMode, expiresAt, status]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setImageError("Only JPEG, PNG, WebP, or GIF allowed");
      return;
    }

    setImageError("");
    setRawImageSrc(URL.createObjectURL(file));
    setCrop(undefined);
    setCompletedCrop(undefined);
  }

  function onCropImageLoad() {
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
  }

  function cancelCrop() {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyCrop() {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      setImageError("Drag to select the area you want to keep first");
      return;
    }
    setCompressing(true);
    try {
      const dataUrl = cropToDataUrl(imgRef.current, completedCrop);
      const bytes = Math.ceil(((dataUrl.split(",")[1] ?? "").length * 3) / 4);
      if (bytes > MAX_IMAGE_BYTES) {
        setImageError(`Image too large after compression (${Math.round(bytes / 1000)}KB). Try a tighter crop.`);
        return;
      }
      setImageData(dataUrl);
      if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
      setRawImageSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
    } catch {
      setImageError("Failed to process image");
    } finally {
      setCompressing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length === 0) {
      setBodyTouched(true);
      return;
    }
    onSubmit({ title, body, imageData, imageAlt, imageDisplayMode, expiresAt, status });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
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
        <Label>Body *</Label>
        <MarkdownEditor value={body} onChange={setBody} placeholder="Write your announcement…" />
        {bodyTouched && body.trim().length === 0 && <p className="text-xs text-destructive">Body is required</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Image (optional)</Label>
        {rawImageSrc ? (
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/20 overflow-hidden flex items-center justify-center p-2 min-w-0">
              <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- crop source is a local blob: URL, not an optimizable remote asset */}
                <img ref={imgRef} src={rawImageSrc} onLoad={onCropImageLoad} alt="Crop source" className="max-h-96 max-w-full w-auto" />
              </ReactCrop>
            </div>
            <p className="text-xs text-muted-foreground">Drag the handles to select the area you want to keep.</p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" loading={compressing} onClick={applyCrop}>{compressing ? "Processing…" : "Apply Crop"}</Button>
              <Button type="button" variant="outline" size="sm" onClick={cancelCrop}>Cancel</Button>
            </div>
          </div>
        ) : imageData ? (
          <div className="space-y-2">
            <div className={`w-full h-40 rounded-lg border overflow-hidden ${imageDisplayMode === "contain" ? "bg-muted/40" : ""}`}>
              <img
                src={imageData}
                alt="preview"
                className={`w-full h-full ${imageDisplayMode === "contain" ? "object-contain" : "object-cover"}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border p-0.5">
                <button
                  type="button"
                  onClick={() => setImageDisplayMode("contain")}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${imageDisplayMode === "contain" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Show full image
                </button>
                <button
                  type="button"
                  onClick={() => setImageDisplayMode("cover")}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${imageDisplayMode === "cover" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Crop to fill
                </button>
              </div>
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
