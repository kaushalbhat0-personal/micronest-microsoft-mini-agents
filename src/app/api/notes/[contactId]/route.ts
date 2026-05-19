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
    .from("contact_notes")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const auth = await validateApiRouteAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId } = await params;
  const body = await request.json();
  const { note } = body;

  if (!note || typeof note !== "string" || !note.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("contact_notes")
    .insert({ user_id: auth.user.id, contact_id: contactId, note: note.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.supabase.from("contact_events").insert({
    user_id: auth.user.id,
    contact_id: contactId,
    event_type: "note_added",
    metadata: { note: note.trim(), source: "extension_overlay" },
  });

  return NextResponse.json({ note: data });
}
