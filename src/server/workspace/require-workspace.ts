"use server";

import { redirect } from "next/navigation";
import { getActiveWorkspace } from "./get-active-workspace";
import type { Workspace } from "@/features/workspaces/types";

export async function requireWorkspace(): Promise<Workspace> {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/workspace/new");
  return workspace;
}
