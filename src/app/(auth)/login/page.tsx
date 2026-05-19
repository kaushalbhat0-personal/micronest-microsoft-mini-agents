import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to MicroNest</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            Authentication UI will be implemented in the auth feature.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
