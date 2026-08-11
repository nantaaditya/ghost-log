"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/link-button";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { toast } from "sonner";
import { Users, HardDrive, UserPlus, MoreHorizontal, Mail, ShieldBan, ShieldCheck, KeyRound } from "lucide-react";
import type { User } from "@/lib/db/schema";

type ReportRow = {
  id: string; weekId: string; status: string;
  submittedAt: Date | null; updatedAt: Date;
  userId: string; userName: string; userEmail: string;
};

type Props = {
  users: User[];
  recentReports: ReportRow[];
  onedriveConnected: boolean;
  onedriveStatus?: string;
};

export default function AdminClient({ users: initialUsers, recentReports, onedriveConnected, onedriveStatus }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [connectingOnedrive, setConnectingOnedrive] = useState(false);

  function handleConnectOnedrive() {
    setConnectingOnedrive(true);
    window.location.href = "/api/onedrive/connect";
    setTimeout(() => setConnectingOnedrive(false), 5000);
  }

  const reportsByUser = recentReports.reduce<Record<string, ReportRow[]>>((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = [];
    acc[r.userId].push(r);
    return acc;
  }, {});

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      const json = await res.json();
      if (json.success) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); setInviteName(""); }
      else toast.error(json.error ?? "Failed to send invite");
    } catch { toast.error("Network error"); }
    finally { setInviting(false); }
  }

  async function resendInvite(userId: string) {
    setResendingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await fetch(`/api/admin/users/${userId}/resend-invite`, { method: "POST" });
      const json = await res.json();
      if (json.success) toast.success("Invite resent");
      else toast.error(json.error ?? "Failed");
    } catch { toast.error("Network error"); }
    finally { setResendingIds((prev) => { const next = new Set(prev); next.delete(userId); return next; }); }
  }

  async function resendReset(userId: string) {
    setResendingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await fetch(`/api/admin/users/${userId}/resend-reset`, { method: "POST" });
      const json = await res.json();
      if (json.success) toast.success("Password reset sent");
      else toast.error(json.error ?? "Failed");
    } catch { toast.error("Network error"); }
    finally { setResendingIds((prev) => { const next = new Set(prev); next.delete(userId); return next; }); }
  }

  async function toggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setTogglingIds((prev) => new Set(prev).add(userId));
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus as User["status"] } : u)));
        toast.success(newStatus === "active" ? "User activated" : "User deactivated");
      } else toast.error("Failed to update user");
    } catch { toast.error("Network error"); }
    finally { setTogglingIds((prev) => { const next = new Set(prev); next.delete(userId); return next; }); }
  }

  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        title="Admin"
        subtitle={`${users.length} team members`}
        actions={
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LinkButton href="/" variant="ghost" size="sm">← Dashboard</LinkButton>
            <LinkButton href="/admin/announcements" variant="ghost" size="sm">Announcements</LinkButton>
            <LinkButton href="/admin/recap" variant="ghost" size="sm">Recap</LinkButton>
            <LinkButton href="/admin/settings" variant="ghost" size="sm">Settings</LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-muted-foreground/60" /><CardTitle className="text-[0.85rem]">OneDrive</CardTitle></div>
          </CardHeader>
          <CardContent>
            {onedriveStatus === "error" && <Alert variant="destructive" className="mb-3"><AlertDescription>Authorization failed.</AlertDescription></Alert>}
            {onedriveStatus === "connected" && <Alert className="mb-3 border-accent/20 bg-accent/5"><AlertDescription>Connected.</AlertDescription></Alert>}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 text-[0.8rem] ${onedriveConnected ? "text-primary" : "text-muted-foreground/50"}`}>
                <span className={`size-1.5 rounded-full ${onedriveConnected ? "bg-primary" : "bg-muted-foreground/30"}`} />
                {onedriveConnected ? "Connected" : "Not connected"}
              </span>
              <Button size="sm" variant={onedriveConnected ? "ghost" : "default"} loading={connectingOnedrive} onClick={handleConnectOnedrive}>
                {onedriveConnected ? "Re-authorize" : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-muted-foreground/60" /><CardTitle className="text-[0.85rem]">Invite Member</CardTitle></div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="invite-name" className="text-[0.75rem]">Name</Label><Input id="invite-name" placeholder="e.g. Budi" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label htmlFor="invite-email" className="text-[0.75rem]">Email</Label><Input id="invite-email" type="email" placeholder="budi@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></div>
              </div>
              <Button type="submit" size="sm" loading={inviting} className="self-start">{inviting ? "Sending…" : "Send invite"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground/60" /><CardTitle className="text-[0.85rem]">Team Members</CardTitle></div>
        </CardHeader>
        <CardContent className="divide-y divide-border/30 pt-0 px-0 pb-0">
          {users.map((user) => {
            const memberReports = reportsByUser[user.id] ?? [];
            return (
              <div key={user.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted/60 ring-1 ring-border/30 flex items-center justify-center shrink-0">
                      <span className="text-[0.65rem] font-semibold text-foreground/50">{user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[0.85rem] truncate">{user.name}</p>
                      <p className="text-[0.7rem] text-muted-foreground/60 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={user.status === "active" ? "accent" : user.status === "pending" ? "secondary" : "outline"}>{user.status}</Badge>
                    {user.role !== "admin" && user.status === "pending" && (
                      <Button size="xs" variant="ghost" loading={resendingIds.has(user.id)} onClick={() => resendInvite(user.id)}><Mail className="h-3 w-3" />Resend invite</Button>
                    )}
                    {user.role !== "admin" && user.status === "active" && (
                      <Button size="xs" variant="ghost" loading={resendingIds.has(user.id)} onClick={() => resendReset(user.id)}><KeyRound className="h-3 w-3" />Send reset</Button>
                    )}
                    {user.role !== "admin" && user.status !== "pending" && (
                      <Button size="xs" variant="ghost" loading={togglingIds.has(user.id)} onClick={() => toggleStatus(user.id, user.status)}
                        className={user.status === "active" ? "text-destructive/60 hover:text-destructive" : ""}>
                        {user.status === "active" ? <><ShieldBan className="h-3 w-3" />Deactivate</> : <><ShieldCheck className="h-3 w-3" />Activate</>}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="pl-11 space-y-0.5">
                  {memberReports.length === 0 ? (
                    <p className="text-[0.7rem] text-muted-foreground/40">No reports this month</p>
                  ) : (
                    memberReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between gap-2 group rounded-lg px-2 py-1 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`size-1.5 rounded-full shrink-0 ${report.status === "submitted" ? "bg-primary/70" : "bg-amber-400/70"}`} />
                          <span className="text-[0.8rem] font-medium truncate">{report.weekId}</span>
                          {report.submittedAt && <span className="text-[0.65rem] text-muted-foreground/40 shrink-0">{new Date(report.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                        </div>
                        {report.status === "submitted" && (
                          <LinkButton href={`/admin/reports/${report.userId}/${report.weekId}`} variant="ghost" size="xs" className="opacity-0 group-hover:opacity-100 transition-opacity">View</LinkButton>
                        )}
                      </div>
                    ))
                  )}
                  <LinkButton href={`/admin/members/${user.id}`} variant="ghost" size="xs" className="text-muted-foreground/50 hover:text-foreground mt-0.5"><MoreHorizontal className="h-3 w-3" />Full history</LinkButton>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageShell>
  );
}
