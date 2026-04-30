"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { toast } from "sonner";

type Props = { name: string; email: string };

export default function SettingsClient({ name: initialName, email: initialEmail }: Props) {
  const [profileName, setProfileName] = useState(initialName);
  const [profileEmail, setProfileEmail] = useState(initialEmail);
  const [profilePassword, setProfilePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profilePassword) {
      toast.error("Enter your current password to save changes");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: profilePassword,
          name: profileName !== initialName ? profileName : undefined,
          email: profileEmail !== initialEmail ? profileEmail : undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to update profile");
        return;
      }
      if (json.requiresRelogin) {
        toast.success("Email updated — signing you out");
        await signOut({ callbackUrl: "/signin" });
        return;
      }
      toast.success("Profile updated");
      setProfilePassword("");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to update password");
        return;
      }
      toast.success("Password updated");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <LinkButton href="/admin" variant="ghost" size="sm">← Admin</LinkButton>
        <h1 className="text-xl font-semibold">Account Settings</h1>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your display name or email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                required
              />
              {profileEmail !== initialEmail && (
                <p className="text-xs text-muted-foreground">
                  Changing your email will sign you out immediately.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="profile-current-pw">Current password</Label>
              <Input
                id="profile-current-pw"
                type="password"
                placeholder="Required to save changes"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={
                savingProfile ||
                (profileName === initialName && profileEmail === initialEmail)
              }
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>Choose a strong password (minimum 8 characters).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={savingPw}>
              {savingPw ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
