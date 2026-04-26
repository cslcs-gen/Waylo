import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Track used image URLs to prevent duplicates
const usedImageUrls = new Set<string>();

async function fetchWikimediaImage(placeName: string, destination: string): Promise<string> {
  try {
    const queries = [placeName, placeName + " " + destination, placeName + " " + destination + " landmark"];
    for (const q of queries) {
      const searchRes = await fetch(
        "https://en.wikipedia.org/w/api.php?action=query&titles=" + encodeURIComponent(q) + "&prop=pageimages&format=json&pithumbsize=800&origin=*",
        { headers: { "User-Agent": "Waylo/1.0 (travel app)" } }
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const pages = searchData.query?.pages || {};
      const page = Object.values(pages)[0] as Record<string, unknown>;
      const thumb = (page?.thumbnail as Record<string, unknown>)?.source as string;
      const blocked = ["Flag_of", "Logo", "logo", "map", "Map", "icon", "Icon", "symbol", "Symbol", "coat", "Coat", "blank", "Blank"];
      if (thumb && !blocked.some(b => thumb.includes(b)) && !usedImageUrls.has(thumb)) {
        usedImageUrls.add(thumb);
        return thumb;
      }
    }
    return await fetchPexelsImage(placeName, destination);
  } catch (err) {
    console.error("Wikimedia fetch failed:", err);
    return await fetchPexelsImage(placeName, destination);
  }
}

async function fetchPexelsImage(placeName: string, destination: string): Promise<string> {
  try {
    // Try specific query first, then broader
    const queries = [
      placeName + " " + destination,
      destination + " travel landmark",
      destination + " tourism",
    ];
    for (const q of queries) {
      const res = await fetch(
        "https://api.pexels.com/v1/search?query=" + encodeURIComponent(q) + "&per_page=5&orientation=landscape",
        { headers: { Authorization: process.env.PEXELS_API_KEY || "" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const photos = data.photos || [];
      // Find first photo not already used
      for (const photo of photos) {
        const url = photo?.src?.large || "";
        if (url && !usedImageUrls.has(url)) {
          usedImageUrls.add(url);
          return url;
        }
      }
    }
    return "";
  } catch {
    return "";
  }
}

async function fetchImage(placeName: string, destination: string): Promise<string> {
  return await fetchWikimediaImage(placeName, destination);
}

async function generateCategory(
  category: string,
  type: string,
  destination: string,
  country: string,
  duration: number,
  month: string,
  budget: string,
  interests: string,
  style: string
): Promise<Record<string, unknown>[]> {
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a travel guide specialising in ${category} experiences. Return ONLY a JSON object with a "cards" array containing exactly 20 unique ${category} recommendations. Every single card must be different. Each card needs: id (unique kebab-case slug), title (specific place or experience name), category (must be "${category}"), type ("${type}"), imageUrl (empty string), location (specific district or address in ${destination}), duration (realistic time e.g. "1-2 hours"), whyVisit (2 sentences tailored to this traveller), referenceUrl (https://google.com/search?q=place+name+${destination}), priceRange (Free or $ or $$ or $$$ or $$$$).`
        },
        {
          role: "user",
          content: `Generate 20 unique ${category} recommendations in ${destination}, ${country} for a ${duration}-day trip in ${month}. Budget: ${budget}. Interests: ${interests}. Travel style: ${style}. Make each recommendation specific, varied and genuinely useful. Include a mix of popular highlights and hidden gems.`
        }
      ]
    });
    const data = JSON.parse(result.choices[0].message.content || '{"cards":[]}');
    return data.cards || [];
  } catch (err) {
    console.error(`Error generating ${category}:`, err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 10) {
      return NextResponse.json({ error: "Please describe your trip in more detail." }, { status: 400 });
    }

    const parseResult = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a travel query parser. Extract structured trip data and return ONLY valid JSON with these fields: destination (string), country (string), duration_days (number), travel_dates (object with month string and year number or null), budget_usd (number or null), interests (array of strings), travel_style (solo/couple/family/group)."
        },
        { role: "user", content: query }
      ]
    });

    const trip = JSON.parse(parseResult.choices[0].message.content || "{}");

    // Reject multi-destination queries
    const dest = String(trip.destination || "");
    const multiIndicators = [" and ", " & ", " + ", ",", " then ", " to ", "/"];
    const isMultiDest = multiIndicators.some(ind => dest.toLowerCase().includes(ind));
    if (isMultiDest) {
      return NextResponse.json({
        error: "It looks like you entered multiple destinations. For the best experience, please plan one destination at a time. Try again with just one city or country!"
      }, { status: 400 });
    }

    const destination = trip.destination || "the destination";
    usedImageUrls.clear(); // Reset per request
    const country = trip.country || "";
    const duration = trip.duration_days || 7;
    const month = trip.travel_dates?.month || "";
    const budget = trip.budget_usd ? "$" + trip.budget_usd : "flexible";
    const interests = Array.isArray(trip.interests) ? trip.interests.join(", ") : "";
    const style = trip.travel_style || "solo";

    const categories = [
      { name: "Casual", type: "attraction" },
      { name: "Adventure", type: "attraction" },
      { name: "Fun", type: "attraction" },
      { name: "Culture", type: "attraction" },
      { name: "Fine Dining", type: "dining" },
      { name: "Street Food", type: "dining" },
      { name: "Cafes", type: "dining" },
    ];

    // Generate all 7 categories in parallel
    const categoryResults = await Promise.all(
      categories.map(cat =>
        generateCategory(cat.name, cat.type, destination, country, duration, month, budget, interests, style)
      )
    );

    const allCards = categoryResults.flat();

    // Fetch images in batches of 10 to avoid rate limits
    const enriched: Record<string, unknown>[] = [];
    for (let i = 0; i < allCards.length; i += 10) {
      const batch = allCards.slice(i, i + 10);
      const batchEnriched = await Promise.all(
        batch.map(async (card) => {
          const imageQuery = String(card.title) + " " + destination;
          const imageUrl = await fetchImage(String(card.title), destination);
          return { ...card, imageUrl };
        })
      );
      enriched.push(...batchEnriched);
    }

    return NextResponse.json({ trip, cards: enriched });
  } catch (err) {
    console.error("parse-query error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
