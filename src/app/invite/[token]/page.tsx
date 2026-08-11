"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? "Something went wrong"); }
      else { router.push("/signin?invited=1"); }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-8 animate-enter-up">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-foreground/5 ring-1 ring-border/40 flex items-center justify-center">
            <span className="text-lg font-semibold tracking-tight text-foreground/70">A</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Welcome to Alamak</h1>
            <p className="text-[0.8rem] text-muted-foreground/60 mt-1">
              Set a password to get started
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password" type="password" autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm" type="password" autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-[0.8rem] text-destructive font-medium">{error}</p>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {loading ? "Setting up…" : "Activate account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
