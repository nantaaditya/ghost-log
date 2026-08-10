import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("@/lib/announcement-comment/repository", () => ({
  findById: vi.fn(),
  remove: vi.fn(),
}));

import { auth } from "@/lib/auth/config";
import * as commentRepo from "@/lib/announcement-comment/repository";
import { DELETE } from "../route";

const authorSession = { user: { id: "member-1", role: "member", name: "Author" } };
const otherMemberSession = { user: { id: "member-2", role: "member", name: "Other" } };
const adminSession = { user: { id: "admin-1", role: "admin", name: "Admin" } };

const sampleComment = {
  id: "comment-1",
  announcementId: "ann-1",
  userId: "member-1",
  body: "Nice update!",
  createdAt: new Date("2026-06-19T11:00:00Z"),
};

function makeRequest(): Request {
  return new Request("http://localhost/api/announcements/ann-1/comments/comment-1", {
    method: "DELETE",
  });
}

const params = { params: Promise.resolve({ id: "ann-1", commentId: "comment-1" }) };

describe("DELETE /api/announcements/[id]/comments/[commentId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    (auth as Mock).mockResolvedValue(null);
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the comment does not exist", async () => {
    (auth as Mock).mockResolvedValue(authorSession);
    (commentRepo.findById as Mock).mockResolvedValue(null);
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(404);
  });

  it("returns 400 when the comment does not belong to the announcement in the URL", async () => {
    (auth as Mock).mockResolvedValue(authorSession);
    (commentRepo.findById as Mock).mockResolvedValue({ ...sampleComment, announcementId: "other-ann" });
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(400);
  });

  it("allows the comment author to delete their own comment", async () => {
    (auth as Mock).mockResolvedValue(authorSession);
    (commentRepo.findById as Mock).mockResolvedValue(sampleComment);
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(200);
    expect(commentRepo.remove).toHaveBeenCalledWith("comment-1");
  });

  it("returns 403 for a different non-admin member", async () => {
    (auth as Mock).mockResolvedValue(otherMemberSession);
    (commentRepo.findById as Mock).mockResolvedValue(sampleComment);
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(403);
    expect(commentRepo.remove).not.toHaveBeenCalled();
  });

  it("allows an admin to delete a comment they didn't author", async () => {
    (auth as Mock).mockResolvedValue(adminSession);
    (commentRepo.findById as Mock).mockResolvedValue(sampleComment);
    const res = await DELETE(makeRequest(), params);
    expect(res.status).toBe(200);
    expect(commentRepo.remove).toHaveBeenCalledWith("comment-1");
  });
});
