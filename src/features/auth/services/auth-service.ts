"use server";

import { redirect } from "next/navigation";
import { createServerActionSupabaseClient } from "@/lib/supabase/server-action";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/features/auth/schemas";

function getFirstError(parsed: {
  success: false;
  error: { issues: { message: string }[] };
}): string {
  return parsed.error.issues[0]?.message ?? "Invalid input";
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Email not confirmed":
    "Please verify your email before logging in. Check your inbox for the confirmation link.",
  "Invalid login credentials":
    "Invalid email or password. Please try again.",
  "User already registered":
    "An account with this email already exists. Please sign in instead.",
  "Too many requests":
    "Too many attempts. Please try again later.",
};

function translateAuthError(errorMessage: string): string {
  return AUTH_ERROR_MESSAGES[errorMessage] ?? errorMessage;
}

export async function login(
  input: LoginInput
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: getFirstError(parsed) };
  }

  const supabase = await createServerActionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect("/");
}

export async function register(
  input: RegisterInput
): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: getFirstError(parsed) };
  }

  const supabase = await createServerActionSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect("/login?registered=true");
}

export async function logout(): Promise<void> {
  const supabase = await createServerActionSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
