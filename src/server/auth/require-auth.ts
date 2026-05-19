import { redirect } from "next/navigation";
import { getCurrentUser, type AuthenticatedUser } from "./get-user";

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireGuest(): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }
}
