"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/shared/components/ui/button";
import { logout } from "@/features/auth/services/auth-service";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="w-full justify-start text-muted-foreground"
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={logout}>
      <SubmitButton />
    </form>
  );
}
