import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@/features/auth/types";

export type AuthenticatedUser = Pick<User, "id" | "email" | "name">;

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
    name: data.user.user_metadata?.name ?? data.user.email ?? null,
  };
}
