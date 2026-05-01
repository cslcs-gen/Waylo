import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 10) {
      return NextResponse.json({ error: "Please describe your trip in more detail." }, { status: 400 });
    }

    // Step 1: Parse query
    const parseResult = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a travel query parser. Extract structured trip data and return ONLY valid JSON with: destination (string), country (string), duration_days (number), travel_dates (object with month string), budget_usd (number or null), interests (array of strings), travel_style (solo/couple/family/group), dietary (array of strings)."
        },
        { role: "user", content: query }
      ]
    });

    const trip = JSON.parse(parseResult.choices[0].message.content || "{}");
    const destination = trip.destination || "the destination";
    const country = trip.country || "";
    const duration = trip.duration_days || 7;
    const month = trip.travel_dates?.month || "";
    const budget = trip.budget_usd ? "$" + trip.budget_usd + " total" : "flexible";
    const budgetPerDay = trip.budget_usd ? Math.round(trip.budget_usd / duration) : null;
    const interests = Array.isArray(trip.interests) ? trip.interests.join(", ") : "";
    const style = trip.travel_style || "solo";

    // Reject multi-destination
    const multiIndicators = [" and ", " & ", " + ", " then ", " to ", "/"];
    if (multiIndicators.some(ind => destination.toLowerCase().includes(ind))) {
      return NextResponse.json({
        error: "It looks like you entered multiple destinations. Please plan one destination at a time!"
      }, { status: 400 });
    }

    const budgetInstruction = budgetPerDay
      ? "Daily budget is approximately $" + budgetPerDay + " per day. Do not recommend places exceeding this budget tier."
      : "Budget is flexible.";

    // Step 2: Generate dynamic categories
    const categoryResult = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a local expert travel curator. Based on the traveller's interests and destination, create dynamic experience categories that feel personally curated. Return JSON: { experienceCategories: string[], diningCategories: string[] }. Max 5 experience categories, max 3 dining categories. Use evocative specific names like Hidden Temple Trails not generic Culture. Dining should reflect local food culture and budget."
        },
        {
          role: "user",
          content: "Destination: " + destination + ", " + country + ". Traveller said: \"" + query + "\". Interests: " + interests + ". Style: " + style + ". Budget: " + budget + ". Duration: " + duration + " days in " + month + "."
        }
      ]
    });

    const categoryData = JSON.parse(categoryResult.choices[0].message.content || "{}");
    const experienceCategories: string[] = categoryData.experienceCategories || ["Experiences", "Hidden Gems", "Culture", "Adventures", "Local Life"];
    const diningCategories: string[] = categoryData.diningCategories || ["Local Dining", "Street Food", "Cafes"];

    // Step 3: Generate cards in parallel (NO image fetching yet)
    const [expResult, diningResult] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a local insider for " + destination + ". Recommend experiences directly matching this traveller. RULES: every card must connect to stated interests, prioritise hidden gems over tourist traps, " + budgetInstruction + ", whyVisit must explicitly reference traveller interests. Return JSON with cards array. Generate 6 cards per category for: " + experienceCategories.join(", ") + ". Each card: { id (kebab slug), title, category (exact match), type: \"experience\", imageUrl: \"\", location, duration, whyVisit (2 sentences referencing interests), referenceUrl, priceRange, hiddenGem (boolean) }"
          },
          {
            role: "user",
            content: "Traveller said: \"" + query + "\". Destination: " + destination + " in " + month + ". " + duration + " days. Style: " + style + ". Interests: " + interests + ". Budget: " + budget + ". Generate experiences for: " + experienceCategories.join(", ")
          }
        ]
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a local food expert for " + destination + ". Recommend dining matching traveller preferences. RULES: specific dish recommendations in whyVisit, mix iconic with hidden gems, " + budgetInstruction + ", never tourist traps. Return JSON with cards array. Generate 6 cards per category for: " + diningCategories.join(", ") + ". Each card: { id (kebab slug), title, category (exact match), type: \"dining\", imageUrl: \"\", location, duration, whyVisit (2 sentences with specific dishes), referenceUrl, priceRange, hiddenGem (boolean) }"
          },
          {
            role: "user",
            content: "Traveller said: \"" + query + "\". Destination: " + destination + " in " + month + ". Style: " + style + ". Interests: " + interests + ". Budget: " + budget + ". Dietary: " + (Array.isArray(trip.dietary) ? trip.dietary.join(", ") : "none") + ". Generate dining for: " + diningCategories.join(", ")
          }
        ]
      })
    ]);

    const expData = JSON.parse(expResult.choices[0].message.content || '{"cards":[]}');
    const diningData = JSON.parse(diningResult.choices[0].message.content || '{"cards":[]}');
    const allCards = [...(expData.cards || []), ...(diningData.cards || [])];

    // Return cards immediately WITHOUT images
    return NextResponse.json({
      trip,
      cards: allCards,
      categories: { experience: experienceCategories, dining: diningCategories }
    });

  } catch (err) {
    console.error("parse-query error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
