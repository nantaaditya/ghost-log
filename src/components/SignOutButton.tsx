"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
      onClick={() => signOut({ callbackUrl: "/signin" })}
    >
      Sign out
    </Button>
  );
}
