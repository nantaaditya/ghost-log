import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/announcement/repository", () => ({ findById: vi.fn() }));
vi.mock("@/lib/announcement/visibility", () => ({ isPublishedAndVisible: vi.fn() }));
vi.mock("@/lib/announcement-comment/repository", () => ({
  listByAnnouncement: vi.fn(),
  create: vi.fn(),
}));

import { auth } from "@/lib/auth/config";
import * as announcementRepo from "@/lib/announcement/repository";
import * as visibility from "@/lib/announcement/visibility";
import * as commentRepo from "@/lib/announcement-comment/repository";
import { GET, POST } from "../route";

const memberSession = { user: { id: "member-1", role: "member", name: "Member" } };
const adminSession = { user: { id: "admin-1", role: "admin", name: "Admin" } };

const sampleAnnouncement = {
  id: "ann-1",
  title: "Test announcement",
  body: "Hello team",
  imageData: null,
  imageAlt: null,
  authorId: "admin-1",
  status: "published" as const,
  publishedAt: new Date("2026-06-19T10:00:00Z"),
  expiresAt: null,
  createdAt: new Date("2026-06-19T10:00:00Z"),
  updatedAt: new Date("2026-06-19T10:00:00Z"),
};

const sampleComment = {
  id: "comment-1",
  announcementId: "ann-1",
  userId: "member-1",
  body: "Nice update!",
  createdAt: new Date("2026-06-19T11:00:00Z"),
};

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/announcements/ann-1/comments", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = { params: Promise.resolve({ id: "ann-1" }) };

describe("GET /api/announcements/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the announcement does not exist", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(null);
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(404);
  });

  it("returns comments ordered oldest-first for an authenticated user", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(true);
    (commentRepo.listByAnnouncement as Mock).mockResolvedValue([
      { ...sampleComment, authorName: "Member" },
    ]);
    const res = await GET(makeRequest(), params);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].authorName).toBe("Member");
  });

  it("returns 404 for a member when the announcement is a draft (not visible)", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue({ ...sampleAnnouncement, status: "draft" });
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(false);
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(404);
    expect(commentRepo.listByAnnouncement).not.toHaveBeenCalled();
  });

  it("returns 404 for a member when the announcement has expired", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(false);
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(404);
  });

  it("allows an admin to read comments even when the announcement is not member-visible", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (announcementRepo.findById as Mock).mockResolvedValue({ ...sampleAnnouncement, status: "draft" });
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(false);
    (commentRepo.listByAnnouncement as Mock).mockResolvedValue([]);
    const res = await GET(makeRequest(), params);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/announcements/[id]/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ body: "Hi" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the announcement does not exist", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ body: "Hi" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 400 when body is empty", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(true);
    const res = await POST(makeRequest({ body: "" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 201 with the created comment, including authorName from the session", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(true);
    (commentRepo.create as Mock).mockResolvedValue(sampleComment);
    const res = await POST(makeRequest({ body: "Nice update!" }), params);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.authorName).toBe("Member");
    expect(json.data.id).toBe("comment-1");
  });

  it("creates the comment scoped to the announcement and session user", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue(sampleAnnouncement);
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(true);
    (commentRepo.create as Mock).mockResolvedValue(sampleComment);
    await POST(makeRequest({ body: "Nice update!" }), params);
    expect(commentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ announcementId: "ann-1", userId: "member-1", body: "Nice update!" })
    );
  });

  it("returns 404 when a member tries to comment on a draft announcement", async () => {
    (auth as Mock).mockResolvedValue(memberSession);
    (announcementRepo.findById as Mock).mockResolvedValue({ ...sampleAnnouncement, status: "draft" });
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(false);
    const res = await POST(makeRequest({ body: "Sneaky comment" }), params);
    expect(res.status).toBe(404);
    expect(commentRepo.create).not.toHaveBeenCalled();
  });

  it("allows an admin to comment on a draft announcement", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (announcementRepo.findById as Mock).mockResolvedValue({ ...sampleAnnouncement, status: "draft" });
    (visibility.isPublishedAndVisible as Mock).mockReturnValue(false);
    (commentRepo.create as Mock).mockResolvedValue({ ...sampleComment, userId: "admin-1" });
    const res = await POST(makeRequest({ body: "Admin preview comment" }), params);
    expect(res.status).toBe(201);
  });
});
