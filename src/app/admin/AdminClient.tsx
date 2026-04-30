"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/link-button";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import type { User } from "@/lib/db/schema";

type ReportRow = {
  id: string;
  weekId: string;
  status: string;
  submittedAt: Date | null;
  userId: string;
  userName: string;
  userEmail: string;
};

type Props = {
  users: User[];
  allReports: ReportRow[];
  onedriveConnected: boolean;
  onedriveStatus?: string;
};

export default function AdminClient({ users: initialUsers, allReports, onedriveConnected, onedriveStatus }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    });
    const json = await res.json();
    setInviting(false);

    if (json.success) {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteName("");
    } else {
      toast.error(json.error ?? "Failed to send invite");
    }
  }

  async function toggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus as User["status"] } : u))
      );
    } else {
      toast.error("Failed to update user");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Team management &amp; reports</p>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href="/admin/recap" size="sm">Weekly Recap</LinkButton>
          <LinkButton href="/admin/settings" variant="outline" size="sm">Settings</LinkButton>
          <LinkButton href="/" variant="ghost" size="sm">← Dashboard</LinkButton>
        </div>
      </div>

      {/* OneDrive Connection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">OneDrive Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {onedriveStatus === "error" && (
            <Alert variant="destructive">
              <AlertDescription>OneDrive authorization failed. Please try again.</AlertDescription>
            </Alert>
          )}
          {onedriveStatus === "connected" && (
            <Alert>
              <AlertDescription>OneDrive connected successfully!</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={onedriveConnected
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400"
                : "border-muted-foreground/30 text-muted-foreground"}
            >
              {onedriveConnected ? "● Connected" : "○ Not connected"}
            </Badge>
            <a
              href="/api/onedrive/connect"
              className={buttonVariants({ size: "sm", variant: onedriveConnected ? "outline" : "default" })}
            >
              {onedriveConnected ? "Re-authorize" : "Connect OneDrive"}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Invite Team Member */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Invite Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2 items-end">
            <div className="space-y-1 flex-1">
              <Label htmlFor="invite-name">Display name</Label>
              <Input
                id="invite-name"
                placeholder="e.g. Budi Santoso"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="budi@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            The display name is used as the OneDrive folder name — must match exactly.
          </p>
        </CardContent>
      </Card>

      {/* All Reports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {allReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No reports submitted yet.</p>
          ) : (
            <div className="divide-y">
              {allReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{report.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.weekId} ·{" "}
                      {report.submittedAt
                        ? new Date(report.submittedAt).toLocaleDateString()
                        : "not submitted"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={report.status === "submitted" ? "default" : "secondary"}>
                      {report.status}
                    </Badge>
                    {report.status === "submitted" && (
                      <LinkButton
                        href={`/admin/reports/${report.userId}/${report.weekId}`}
                        variant="ghost"
                        size="sm"
                      >
                        View
                      </LinkButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  user.status === "active" ? "default" :
                  user.status === "pending" ? "secondary" : "outline"
                }>
                  {user.status}
                </Badge>
                {user.role !== "admin" && user.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={user.status === "active"
                      ? "text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                      : ""}
                    onClick={() => toggleStatus(user.id, user.status)}
                  >
                    {user.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
