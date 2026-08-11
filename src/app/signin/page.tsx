"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
  const justInvited = searchParams.get("invited") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email, password, redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-8 animate-enter-up">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-foreground/5 ring-1 ring-border/40 flex items-center justify-center">
            <span className="text-lg font-semibold tracking-tight text-foreground/70">A</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Alamak</h1>
            <p className="text-[0.8rem] text-muted-foreground/60 mt-1">
              Engineering Reports
            </p>
          </div>
        </div>

        {/* Status messages */}
        {justInvited && (
          <div className="rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 text-[0.8rem] text-accent text-center">
            Account activated — sign in below.
          </div>
        )}
        {justReset && (
          <div className="rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 text-[0.8rem] text-accent text-center">
            Password reset — sign in below.
          </div>
        )}

        {/* Form */}
        <Card>
          <CardContent className="pt-6 pb-6 space-y-5">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password"
                    className="text-[0.75rem] text-muted-foreground/50 hover:text-foreground transition-colors">
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="password" type="password" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-[0.8rem] text-destructive font-medium">{error}</p>}
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
