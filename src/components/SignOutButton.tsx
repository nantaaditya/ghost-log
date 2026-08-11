"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

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
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      loading={signingOut}
      onClick={handleSignOut}
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </Button>
  );
}
