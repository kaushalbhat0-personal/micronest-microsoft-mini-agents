"use client";

import { useRouter, useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface WorkspaceSelectorProps {
  currentWorkspaceId: string;
  workspaces: Array<{ id: string; name: string }>;
}

export function WorkspaceSelector({
  currentWorkspaceId,
  workspaces,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const params = useParams();

  function handleChange(workspaceId: string) {
    const current = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    current.set("workspaceId", workspaceId);
    router.push(`/${params?.slug ?? ""}?${current.toString()}`);
  }

  if (workspaces.length === 0) return null;

  return (
    <Select value={currentWorkspaceId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue>
          {workspaces.find((w) => w.id === currentWorkspaceId)?.name ?? "Select workspace"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.id} value={workspace.id}>
            {workspace.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
