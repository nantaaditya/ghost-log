import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("../member-repository", () => ({ findUserAccess: vi.fn() }));

import { auth } from "@/lib/auth/config";
import { findUserAccess } from "../member-repository";
import { getActiveViewer } from "../viewer";

const tokenSession = (role: string) => ({ user: { id: "user-1", role, name: "Token Name" } });
const dbUser = (overrides: Record<string, unknown> = {}) => ({
  id: "user-1",
  name: "Db Name",
  role: "member",
  status: "active",
  ...overrides,
});

describe("getActiveViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is null without a session, and never touches the database", async () => {
    (auth as Mock).mockResolvedValue(null);
    expect(await getActiveViewer()).toBeNull();
    expect(findUserAccess).not.toHaveBeenCalled();
  });

  it("is null when the user no longer exists", async () => {
    (auth as Mock).mockResolvedValue(tokenSession("member"));
    (findUserAccess as Mock).mockResolvedValue(null);
    expect(await getActiveViewer()).toBeNull();
  });

  it.each(["inactive", "pending"])("is null for a %s user even with a valid token", async (status) => {
    (auth as Mock).mockResolvedValue(tokenSession("member"));
    (findUserAccess as Mock).mockResolvedValue(dbUser({ status }));
    expect(await getActiveViewer()).toBeNull();
  });

  it("takes the role from the database, so a demoted admin loses admin rights", async () => {
    (auth as Mock).mockResolvedValue(tokenSession("admin"));
    (findUserAccess as Mock).mockResolvedValue(dbUser({ role: "member" }));
    expect(await getActiveViewer()).toEqual({ id: "user-1", role: "member", name: "Db Name" });
  });

  it("takes the role from the database, so a promoted member is recognised", async () => {
    (auth as Mock).mockResolvedValue(tokenSession("member"));
    (findUserAccess as Mock).mockResolvedValue(dbUser({ role: "admin" }));
    expect(await getActiveViewer()).toMatchObject({ role: "admin" });
  });

  it("looks the user up by the id in the token", async () => {
    (auth as Mock).mockResolvedValue(tokenSession("member"));
    (findUserAccess as Mock).mockResolvedValue(dbUser());
    await getActiveViewer();
    expect(findUserAccess).toHaveBeenCalledWith("user-1");
  });
});
