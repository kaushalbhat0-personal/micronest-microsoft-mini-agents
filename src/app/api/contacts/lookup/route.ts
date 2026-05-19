import { NextRequest, NextResponse } from "next/server";
import { validateApiRouteAuth } from "@/lib/supabase/api-route";

export async function GET(request: NextRequest) {
  const auth = await validateApiRouteAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") ?? "";
  const name = searchParams.get("name") ?? "";

  if (!phone && !name) {
    return NextResponse.json({ error: "phone or name required" }, { status: 400 });
  }

  const query = auth.supabase
    .from("followup_candidates")
    .select("*, contact:contact_id(*)")
    .eq("user_id", auth.user.id)
    .in("candidate_status", ["pending", "opened", "contacted", "responded", "promised"])
    .order("priority", { ascending: false });

  if (phone) {
    query.or(`contact.phone_number.eq.${phone},contact.phone_number.like.%${phone}%`);
  }
  if (name && !phone) {
    query.ilike("contact.customer_name", `%${name}%`);
  }

  const { data, error } = await query.limit(1);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ contact: null, candidate: null });
  }

  const row = data[0] as Record<string, unknown>;
  return NextResponse.json({
    contact: row.contact,
    candidate: {
      id: row.id,
      user_id: row.user_id,
      contact_id: row.contact_id,
      priority: row.priority,
      reason: row.reason,
      candidate_status: row.candidate_status,
      generated_at: row.generated_at,
    },
  });
}
