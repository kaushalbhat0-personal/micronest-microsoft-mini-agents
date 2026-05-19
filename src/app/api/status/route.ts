import { NextRequest, NextResponse } from "next/server";
import { validateApiRouteAuth } from "@/lib/supabase/api-route";

const EVENT_TYPES: Record<string, string> = {
  opened: "whatsapp_opened",
  contacted: "followup_contacted",
  responded: "customer_responded",
  promised: "payment_promised",
  resolved: "marked_resolved",
  dismissed: "followup_dismissed",
  ignored: "marked_ignored",
};

export async function POST(request: NextRequest) {
  const auth = await validateApiRouteAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { candidateId, contactId, status } = body;

  if (!candidateId || !contactId || !status) {
    return NextResponse.json({ error: "candidateId, contactId, status required" }, { status: 400 });
  }

  const { data: candidate, error: fetchError } = await auth.supabase
    .from("followup_candidates")
    .select("candidate_status")
    .eq("id", candidateId)
    .eq("user_id", auth.user.id)
    .single();

  if (fetchError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const { error: updateError } = await auth.supabase
    .from("followup_candidates")
    .update({ candidate_status: status })
    .eq("id", candidateId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "resolved" || status === "ignored") {
    const contactStatus = status === "resolved" ? "resolved" : "ignored";
    await auth.supabase
      .from("contacts")
      .update({ workflow_status: contactStatus, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", auth.user.id);
  }

  const eventType = EVENT_TYPES[status] ?? null;
  if (eventType) {
    await auth.supabase.from("contact_events").insert({
      user_id: auth.user.id,
      contact_id: contactId,
      event_type: eventType,
      metadata: { previous_status: candidate.candidate_status, new_status: status, source: "extension_overlay" },
    });
  }

  return NextResponse.json({ success: true });
}
