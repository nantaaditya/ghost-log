"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) { setSubmitted(true); }
      else { setError(data.error ?? "Something went wrong"); }
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
            <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
            <p className="text-[0.8rem] text-muted-foreground/60 mt-1">
              We&apos;ll send you a reset link
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            {submitted ? (
              <div className="space-y-5 text-center">
                <p className="text-[0.85rem] text-muted-foreground/70 leading-relaxed">
                  If an account exists for{" "}
                  <span className="font-medium text-foreground/80">{email}</span>,
                  a reset link has been sent. Check your inbox.
                </p>
                <Link href="/signin"
                  className="text-[0.8rem] text-foreground/60 hover:text-foreground inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email" type="email" autoComplete="email"
                    placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-[0.8rem] text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <div className="text-center">
                  <Link href="/signin"
                    className="text-[0.8rem] text-muted-foreground/60 hover:text-foreground transition-colors">
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
