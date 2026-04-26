import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-secret");
  if (auth !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [visitsRes, searchesRes, feedbackRes] = await Promise.all([
    supabaseAdmin.from("page_visits").select("*").order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("search_logs").select("*").order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("feedback").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const visits = visitsRes.data || [];
  const searches = searchesRes.data || [];
  const feedback = feedbackRes.data || [];

  // Top destinations
  const destCount: Record<string, number> = {};
  for (const s of searches) {
    if (s.destination) destCount[s.destination] = (destCount[s.destination] || 0) + 1;
  }
  const topDestinations = Object.entries(destCount)
    .map(([destination, count]) => ({ destination, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Unique sessions
  const uniqueSessions = new Set(visits.map(v => v.session_id)).size;

  // Avg rating
  const ratings = feedback.filter(f => f.rating).map(f => f.rating);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "N/A";

  // Page breakdown
  const pageCount: Record<string, number> = {};
  for (const v of visits) {
    if (v.page) pageCount[v.page] = (pageCount[v.page] || 0) + 1;
  }

  return NextResponse.json({
    totalVisits: visits.length,
    uniqueSessions,
    totalSearches: searches.length,
    totalFeedback: feedback.length,
    avgRating,
    topDestinations,
    pageBreakdown: Object.entries(pageCount).map(([page, count]) => ({ page, count })),
    recentSearches: searches.slice(0, 20),
    recentFeedback: feedback.slice(0, 20),
    allFeedback: feedback,
  });
}
