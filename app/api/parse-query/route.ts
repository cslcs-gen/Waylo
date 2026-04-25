import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
          content: `You are a travel query parser. Extract structured trip data and return ONLY valid JSON:
{
  "destination": "city name",
  "country": "country name",
  "duration_days": 5,
  "travel_dates": { "month": "October", "year": null },
  "budget_usd": 2000,
  "interests": ["ramen", "shrines"],
  "travel_style": "solo"
}`
        },
        { role: "user", content: query }
      ]
    });

    const trip = JSON.parse(parseResult.choices[0].message.content || "{}");

    const recResult = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a travel guide. Return ONLY a JSON object with a "cards" array containing 5 recommendations for EACH of these 7 categories: Casual, Adventure, Fun, Culture, Fine Dining, Street Food, Cafes.

Each card must have:
{
  "id": "unique-slug",
  "title": "Place name",
  "category": "one of the 7 categories",
  "type": "attraction or dining",
  "imageUrl": "",
  "location": "specific district or address",
  "duration": "1-2 hours",
  "whyVisit": "Exactly 2 sentences specific to this traveller.",
  "referenceUrl": "https://google.com/search?q=place+name",
  "priceRange": "Free or $ or $$ or $$$ or $$$$"
}`
        },
        {
          role: "user",
          content: `Trip: ${trip.duration_days} days in ${trip.destination}, ${trip.country} in ${trip.travel_dates?.month}. Budget: $${trip.budget_usd ?? "flexible"}. Interests: ${trip.interests?.join(", ")}. Style: ${trip.travel_style}.`
        }
      ]
    });

    const recData = JSON.parse(recResult.choices[0].message.content || '{"cards":[]}');
    const cards = recData.cards || [];

    return NextResponse.json({ trip, cards });
  } catch (err) {
    console.error("parse-query error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
