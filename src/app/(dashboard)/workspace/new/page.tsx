import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { createWorkspace } from "@/features/workspaces/services/create-workspace";
import { redirect } from "next/navigation";

export default function NewWorkspacePage() {
  async function handleCreate(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    if (!name?.trim()) return;

    const result = await createWorkspace(name);
    if (result.success) {
      redirect("/");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Workspace</h1>
        <p className="text-muted-foreground">
          Create a new workspace for your team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="flex flex-col gap-4">
            <input
              name="name"
              placeholder="Workspace name"
              required
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              Create Workspace
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
