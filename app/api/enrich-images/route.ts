import { NextRequest, NextResponse } from "next/server";

const usedImageUrls = new Set<string>();

async function fetchWikimediaImage(placeName: string, destination: string, type: string): Promise<string> {
  try {
    if (type === "dining") return await fetchPexelsImage(placeName, destination, "dining");
    const queries = [placeName + " " + destination, placeName];
    for (const q of queries) {
      const searchRes = await fetch(
        "https://en.wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(q) + "&prop=pageimages&format=json&pithumbsize=800&origin=*",
        { headers: { "User-Agent": "Waylo/1.0 (travel app)" } }
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages || {};
      const page = Object.values(pages)[0] as Record<string, unknown>;
      if ((page as Record<string, unknown>)?.missing !== undefined) continue;
      const thumb = (page?.thumbnail as Record<string, unknown>)?.source as string;
      const blocked = ["Flag_of", "Logo", "logo", "map", "Map", "icon", "Icon",
        "symbol", "Symbol", "coat", "Coat", "blank", "Blank", "mountain", "Mountain",
        "peak", "Peak", "glacier", "Glacier", "portrait", "Portrait"];
      if (thumb && !blocked.some(b => thumb.includes(b)) && !usedImageUrls.has(thumb)) {
        usedImageUrls.add(thumb);
        return thumb;
      }
    }
    return await fetchPexelsImage(placeName, destination, "attraction");
  } catch {
    return await fetchPexelsImage(placeName, destination, "attraction");
  }
}

async function fetchPexelsImage(placeName: string, destination: string, type: string): Promise<string> {
  try {
    const queries = type === "dining"
      ? [placeName + " restaurant " + destination, destination + " food restaurant", destination + " cuisine"]
      : [placeName + " " + destination, destination + " travel landmark", destination + " tourism"];
    for (const q of queries) {
      const res = await fetch(
        "https://api.pexels.com/v1/search?query=" + encodeURIComponent(q) + "&per_page=5&orientation=landscape",
        { headers: { Authorization: process.env.PEXELS_API_KEY || "" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const photo of (data.photos || [])) {
        const url = photo?.src?.large || "";
        if (url && !usedImageUrls.has(url)) { usedImageUrls.add(url); return url; }
      }
    }
    return "";
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  try {
    const { cards, destination } = await req.json();
    usedImageUrls.clear();

    // Fetch all images in parallel batches of 8
    const enriched: Record<string, unknown>[] = [];
    for (let i = 0; i < cards.length; i += 8) {
      const batch = cards.slice(i, i + 8);
      const batchResult = await Promise.all(
        batch.map(async (card: Record<string, unknown>) => {
          const imageUrl = await fetchWikimediaImage(
            String(card.title),
            String(destination),
            String(card.type)
          );
          return { id: card.id, imageUrl };
        })
      );
      enriched.push(...batchResult);
    }

    return NextResponse.json({ images: enriched });
  } catch (err) {
    console.error("enrich-images error:", err);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}
