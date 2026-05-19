"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { login } from "@/features/auth/services/auth-service";
import type { LoginInput } from "@/features/auth/schemas";
import { CheckCircle2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function LoginForm({ successMessage }: { successMessage?: string }) {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const input: LoginInput = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      };
      return login(input);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {successMessage && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 rounded-lg p-3">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          minLength={6}
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
