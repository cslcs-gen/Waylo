import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 10) {
      return NextResponse.json({ error: "Please describe your trip in more detail." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parsePrompt = `Extract trip details from this text and return ONLY valid JSON:
"${query}"

Return this exact JSON structure:
{
  "destination": "city name",
  "country": "country name", 
  "duration_days": 5,
  "travel_dates": { "month": "October", "year": null },
  "budget_usd": 2000,
  "interests": ["ramen", "shrines"],
  "travel_style": "solo"
}`;

    const parseResult = await model.generateContent(parsePrompt);
    const parseText = parseResult.response.text().replace(/```json|```/g, "").trim();
    const trip = JSON.parse(parseText);

    const recPrompt = `You are a travel guide. Generate 5 recommendations for EACH of these categories: Casual, Adventure, Fun, Culture, Fine Dining, Street Food, Cafes.

Trip: ${trip.duration_days} days in ${trip.destination}, ${trip.country} in ${trip.travel_dates.month}.
Budget: $${trip.budget_usd ?? "flexible"}. Interests: ${trip.interests?.join(", ")}.

Return ONLY a JSON array:
[{
  "id": "unique-slug",
  "title": "Place name",
  "category": "Casual",
  "type": "attraction",
  "imageUrl": "",
  "location": "District or address",
  "duration": "1-2 hours",
  "whyVisit": "Two sentences specific to this traveller.",
  "referenceUrl": "https://google.com/search?q=place+name+${trip.destination}",
  "priceRange": "Free"
}]`;

    const recResult = await model.generateContent(recPrompt);
    const recText = recResult.response.text().replace(/```json|```/g, "").trim();
    const cards = JSON.parse(recText);

    return NextResponse.json({ trip, cards });
  } catch (err) {
    console.error("parse-query error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
