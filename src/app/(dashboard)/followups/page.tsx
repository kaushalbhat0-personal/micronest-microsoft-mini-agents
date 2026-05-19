import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function FollowupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground">
          Review and manage pending follow-ups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No follow-ups yet. Upload a file to get started.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
