import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/announcement/repository", () => ({
  listAll: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

import { auth } from "@/lib/auth/config";
import * as repo from "@/lib/announcement/repository";
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[id]/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const adminSession = { user: { id: "admin-1", role: "admin", name: "Admin" } };
const memberSession = { user: { id: "member-1", role: "member", name: "Member" } };

const sampleAnnouncement = {
  id: "ann-1",
  title: "Test announcement",
  body: "Hello team",
  imageData: null,
  imageAlt: null,
  authorId: "admin-1",
  status: "draft" as const,
  publishedAt: null,
  expiresAt: null,
  createdAt: new Date("2026-06-19T10:00:00Z"),
  updatedAt: new Date("2026-06-19T10:00:00Z"),
};

function makeRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/admin/announcements", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeItemRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/admin/announcements/ann-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

const itemParams = { params: Promise.resolve({ id: "ann-1" }) };

// ─── GET /api/admin/announcements ────────────────────────────────────────────

describe("GET /api/admin/announcements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for member role", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with all announcements for admin", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.listAll as Mock).mockResolvedValue([sampleAnnouncement]);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });
});

// ─── POST /api/admin/announcements ───────────────────────────────────────────

describe("POST /api/admin/announcements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    const res = await POST(makeRequest("POST", { title: "Hi", body: "World" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    const res = await POST(makeRequest("POST", { body: "World" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeTruthy();
  });

  it("returns 400 when body is empty", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    const res = await POST(makeRequest("POST", { title: "Hi", body: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when imageData is an oversized data URL", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    const oversized = `data:image/jpeg;base64,${"A".repeat(540_000)}`;
    const res = await POST(
      makeRequest("POST", { title: "Hi", body: "World", imageData: oversized })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when imageData is a plain URL (not data URL)", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest("POST", {
        title: "Hi",
        body: "World",
        imageData: "https://example.com/img.png",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 with created announcement on valid input", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.create as Mock).mockResolvedValue(sampleAnnouncement);
    const res = await POST(makeRequest("POST", { title: "Hi", body: "World" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("ann-1");
  });

  it("passes authorId from session to create", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.create as Mock).mockResolvedValue(sampleAnnouncement);
    await POST(makeRequest("POST", { title: "Hi", body: "World" }));
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "admin-1" })
    );
  });
});

// ─── PATCH /api/admin/announcements/[id] ─────────────────────────────────────

describe("PATCH /api/admin/announcements/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    const res = await PATCH(makeItemRequest("PATCH", { status: "published" }), itemParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when announcement does not exist", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(null);
    const res = await PATCH(makeItemRequest("PATCH", { status: "published" }), itemParams);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status value", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    const res = await PATCH(makeItemRequest("PATCH", { status: "archived" }), itemParams);
    expect(res.status).toBe(400);
  });

  it("auto-sets publishedAt when publishing for the first time", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(sampleAnnouncement); // publishedAt: null
    (repo.update as Mock).mockResolvedValue({
      ...sampleAnnouncement,
      status: "published",
      publishedAt: new Date(),
    });
    await PATCH(makeItemRequest("PATCH", { status: "published" }), itemParams);
    expect(repo.update).toHaveBeenCalledWith(
      "ann-1",
      expect.objectContaining({ publishedAt: expect.any(Date) })
    );
  });

  it("does not overwrite existing publishedAt on re-publish", async () => {
    const alreadyPublished = {
      ...sampleAnnouncement,
      status: "draft" as const,
      publishedAt: new Date("2026-06-01T00:00:00Z"),
    };
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(alreadyPublished);
    (repo.update as Mock).mockResolvedValue({ ...alreadyPublished, status: "published" });
    await PATCH(makeItemRequest("PATCH", { status: "published" }), itemParams);
    // publishedAt should remain undefined (not overwritten) — existing value preserved by DB
    expect(repo.update).toHaveBeenCalledWith(
      "ann-1",
      expect.not.objectContaining({ publishedAt: expect.any(Date) })
    );
  });

  it("returns 200 with updated data on success", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    const updated = { ...sampleAnnouncement, title: "Updated" };
    (repo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (repo.update as Mock).mockResolvedValue(updated);
    const res = await PATCH(makeItemRequest("PATCH", { title: "Updated" }), itemParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe("Updated");
  });
});

// ─── DELETE /api/admin/announcements/[id] ────────────────────────────────────

describe("DELETE /api/admin/announcements/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for member role", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    const res = await DELETE(makeItemRequest("DELETE"), itemParams);
    expect(res.status).toBe(403);
  });

  it("returns 404 when announcement does not exist", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(null);
    const res = await DELETE(makeItemRequest("DELETE"), itemParams);
    expect(res.status).toBe(404);
  });

  it("returns 200 and calls remove on success", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (repo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (repo.remove as Mock).mockResolvedValue(undefined);
    const res = await DELETE(makeItemRequest("DELETE"), itemParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(repo.remove).toHaveBeenCalledWith("ann-1");
  });
});
