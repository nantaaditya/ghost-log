"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
      onClick={() => signOut({ callbackUrl: "/signin" })}
    >
      Sign out
    </Button>
  );
}
