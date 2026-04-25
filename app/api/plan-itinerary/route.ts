import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { trip, cards } = await req.json();

    const cardList = cards.map((c: Record<string, unknown>) =>
      `- ${String(c.title)} (${String(c.category)}, ${String(c.location)}, duration: ${String(c.duration)}, type: ${String(c.type)})`
    ).join("\n");

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert travel planner. Given a list of selected places, create a logical day-by-day itinerary. 
Group activities by geographic proximity, time of day logic (breakfast spots in morning, dinner spots in evening, attractions during day), and what makes practical sense to visit together.
Return ONLY a JSON object with this structure:
{
  "summary": "2-3 sentence overview of the trip plan",
  "days": [
    {
      "day": 1,
      "title": "Short catchy title for the day e.g. Ancient Temples & Street Food",
      "theme": "One sentence describing the day's focus",
      "slots": [
        {
          "time": "Morning / Late Morning / Afternoon / Evening / Night",
          "cardId": "the card id",
          "title": "place title",
          "location": "place location",
          "duration": "estimated duration",
          "category": "card category",
          "type": "attraction or dining",
          "imageUrl": "image url",
          "whyNow": "One sentence explaining why this fits here in the day"
        }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: `Plan a ${trip.duration_days} day itinerary in ${trip.destination}, ${trip.country} for a ${trip.travel_style} traveller in ${trip.travel_dates?.month}.
Budget: ${trip.budget_usd ? "$" + trip.budget_usd : "flexible"}.
Interests: ${Array.isArray(trip.interests) ? trip.interests.join(", ") : ""}.

Selected places to include:
${cardList}

Rules:
- Spread activities across exactly ${trip.duration_days} days
- Group nearby locations together to minimise travel time
- Schedule dining at appropriate meal times (breakfast/brunch in morning, lunch midday, dinner in evening)
- Balance attractions and dining each day
- Each day should have 4-6 slots maximum
- If there are more cards than slots, prioritise the best fit per day
- IMPORTANT: If a place has a duration of "1 day" or "full day" or "all day", it must occupy the ENTIRE day alone. Do not add any other slots to that day. The day title should reflect that single experience.`
        }
      ]
    });

    const plan = JSON.parse(result.choices[0].message.content || '{"days":[]}');
    return NextResponse.json(plan);
  } catch (err) {
    console.error("plan-itinerary error:", err);
    return NextResponse.json({ error: "Failed to plan itinerary." }, { status: 500 });
  }
}
