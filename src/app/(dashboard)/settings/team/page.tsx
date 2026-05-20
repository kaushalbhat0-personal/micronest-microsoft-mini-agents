"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getActiveWorkspace, getWorkspaceMembers } from "@/server/workspace/get-active-workspace";
import { inviteMember, removeMember, updateMemberRole, renameWorkspace } from "@/features/workspaces/services/invite-member";
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/features/workspaces/types";

export default function TeamSettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("operator");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getActiveWorkspace().then((ws) => {
      if (ws) {
        setWorkspace(ws);
        setWorkspaceName(ws.name);
        getWorkspaceMembers(ws.id).then(setMembers);
      }
    });
  }, []);

  if (!workspace) return null;

  async function handleRename() {
    setError("");
    setSuccess("");
    if (!workspaceName.trim()) return;
    if (!workspace) return;
    const result = await renameWorkspace(workspace.id, workspaceName.trim());
    if (result.success) {
      setSuccess("Workspace renamed.");
      setWorkspace((prev) => prev ? { ...prev, name: workspaceName.trim() } : prev);
    } else {
      setError(result.error ?? "Failed to rename");
    }
  }

  async function handleInvite() {
    setError("");
    setSuccess("");
    if (!workspace) return;
    const result = await inviteMember(workspace.id, inviteEmail, inviteRole);
    if (result.success) {
      setSuccess("Member invited.");
      setInviteEmail("");
      if (!workspace) return;
      const m = await getWorkspaceMembers(workspace.id);
      setMembers(m);
    } else {
      setError(result.error ?? "Failed to invite");
    }
  }

  async function handleRemove(memberId: string) {
    setError("");
    setSuccess("");
    if (!workspace) return;
    const result = await removeMember(workspace.id, memberId);
    if (result.success) {
      setSuccess("Member removed.");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } else {
      setError(result.error ?? "Failed to remove");
    }
  }

  async function handleRoleChange(memberId: string, role: WorkspaceRole) {
    setError("");
    setSuccess("");
    const result = await updateMemberRole(memberId, role);
    if (result.success) {
      setSuccess("Role updated.");
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } else {
      setError(result.error ?? "Failed to update role");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace and team members.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-4 py-2 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace Name</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Workspace name"
          />
          <Button onClick={handleRename} variant="outline">
            Rename
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleInvite} className="flex gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              required
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Invite</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {member.user_email ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {member.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleRoleChange(member.id, v as WorkspaceRole)}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(member.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
