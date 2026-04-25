import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    totalSearches: 0,
    totalExports: 0,
    avgSessionSeconds: 0,
    topDestinations: [],
    recentSearches: [],
    userGeoPoints: [],
    exportBreakdown: [
      { format: "pdf", count: 0 },
      { format: "xlsx", count: 0 },
      { format: "pptx", count: 0 },
      { format: "docx", count: 0 },
    ],
  });
}
