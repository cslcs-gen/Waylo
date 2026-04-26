import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "";

    if (type === "visit") {
      await supabaseAdmin.from("page_visits").insert({
        session_id: data.sessionId,
        page: data.page,
        referrer: data.referrer,
        user_agent: req.headers.get("user-agent") || "",
        ip,
        created_at: new Date().toISOString(),
      });
    } else if (type === "search") {
      await supabaseAdmin.from("search_logs").insert({
        session_id: data.sessionId,
        raw_query: data.rawQuery,
        destination: data.destination,
        duration_days: data.durationDays,
        budget_usd: data.budgetUsd,
        travel_style: data.travelStyle,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
