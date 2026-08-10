"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: "/signin" });
    } catch {
      setSigningOut(false);
      toast.error("Failed to sign out");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
      loading={signingOut}
      onClick={handleSignOut}
    >
      Sign out
    </Button>
  );
}
