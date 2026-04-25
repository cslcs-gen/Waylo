// ============================================================
// lib/gemini.ts — Gemini 1.5 Flash client for AI Travel App
// ============================================================
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ParsedTrip, TripCard } from "@/types/trip";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── 1. Parse natural language query → ParsedTrip ─────────────

const PARSE_SYSTEM_PROMPT = `
You are a travel query parser. Extract structured trip information from the 
user's natural language message. Return ONLY valid JSON matching the schema.
If a field cannot be determined, use null or an empty array.
Never add extra fields or explanatory text.
`;

const parseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    destination: { type: SchemaType.STRING },
    country: { type: SchemaType.STRING },
    duration_days: { type: SchemaType.NUMBER },
    travel_dates: {
      type: SchemaType.OBJECT,
      properties: {
        month: { type: SchemaType.STRING },
        year: { type: SchemaType.NUMBER, nullable: true },
      },
      required: ["month"],
    },
    budget_usd: { type: SchemaType.NUMBER, nullable: true },
    interests: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    travel_style: {
      type: SchemaType.STRING,
      enum: ["solo", "couple", "family", "group"],
    },
    dietary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["destination", "country", "duration_days", "travel_dates", "interests"],
};

export async function parseUserQuery(rawQuery: string): Promise<ParsedTrip> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: parseSchema as never,
    },
    systemInstruction: PARSE_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(rawQuery);
  const text = result.response.text();
  return JSON.parse(text) as ParsedTrip;
}

// ─── 2. Generate recommendation cards from ParsedTrip ─────────

const RECOMMENDATION_CATEGORIES = [
  "Casual",
  "Adventure",
  "Fun",
  "Culture",
  "Fine Dining",
  "Street Food",
  "Cafes",
] as const;

export async function generateRecommendations(
  trip: ParsedTrip
): Promise<TripCard[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
You are a knowledgeable travel guide. Generate exactly 5 recommendations for EACH 
of these categories: ${RECOMMENDATION_CATEGORIES.join(", ")}.

Trip details:
- Destination: ${trip.destination}, ${trip.country}
- Duration: ${trip.duration_days} days
- Month: ${trip.travel_dates.month}
- Budget: ${trip.budget_usd ? `$${trip.budget_usd} USD total` : "flexible"}
- Interests: ${trip.interests.join(", ")}
- Style: ${trip.travel_style}

Return a JSON array of card objects. Each card must have:
{
  "id": "unique-slug-string",
  "title": "Name of the place or experience",
  "category": "one of the 7 categories above",
  "type": "attraction" or "dining",
  "location": "specific address or district",
  "duration": "estimated time e.g. 1-2 hours",
  "whyVisit": "Exactly 2 sentences explaining why this suits THIS traveller.",
  "referenceUrl": "https://... (real URL if known, otherwise https://google.com/search?q=...)",
  "priceRange": "Free | $ | $$ | $$$ | $$$$",
  "rating": 4.5
}

Attractions = Casual, Adventure, Fun, Culture categories.
Dining = Fine Dining, Street Food, Cafes categories.
Make recommendations highly specific to the destination and the traveller's stated interests.
Return ONLY the JSON array, no other text.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as TripCard[];
}
