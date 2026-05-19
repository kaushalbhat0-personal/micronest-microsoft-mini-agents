import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/server/auth/require-auth";

export default async function LoginPage(props: {
  searchParams: Promise<{ registered?: string }>;
}) {
  await requireGuest();

  const searchParams = await props.searchParams;
  const justRegistered = searchParams.registered === "true";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to MicroNest</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm
            successMessage={
              justRegistered
                ? "Account created successfully. Please verify your email before logging in."
                : undefined
            }
          />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
