import { NextRequest, NextResponse } from "next/server";
import { validateApiRouteAuth } from "@/lib/supabase/api-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const auth = await validateApiRouteAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId } = await params;

  const { data, error } = await auth.supabase
    .from("contact_events")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}
