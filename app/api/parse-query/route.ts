import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        "peak", "Peak", "glacier", "Glacier", "portrait", "Portrait", "person", "Person"];
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
      ? [placeName + " restaurant " + destination, destination + " food restaurant dining", destination + " cuisine"]
      : [placeName + " " + destination, destination + " travel attraction", destination + " tourism landmark"];
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
        error: "It looks like you entered multiple destinations. For the best experience, please plan one destination at a time!"
      }, { status: 400 });
    }

    usedImageUrls.clear();

    // Step 2: Generate dynamic categories first
    const categoryResult = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a local expert travel curator. Based on the traveller's specific interests and destination, create dynamic experience categories that feel personally curated — not generic tourist buckets.

Return a JSON object with:
{
  "experienceCategories": ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"],
  "diningCategories": ["Dining Cat 1", "Dining Cat 2", "Dining Cat 3"]
}

Rules for experience categories:
- Must reflect the traveller's actual stated interests
- Should be specific to this destination and culture
- Use evocative names like "Hidden Temple Trails" not just "Culture"
- Mix popular highlights with lesser-known gems
- Examples for Tokyo ramen lover: ["Hidden Ramen Bars", "Ancient Shrine Walks", "Local Neighbourhood Vibes", "Tokyo After Dark", "Unique Japanese Experiences"]
- Maximum 5 experience categories, minimum 3
- Maximum 3 dining categories, minimum 2

Rules for dining categories:
- Should reflect local food culture and traveller preferences
- Be specific e.g. "Michelin Star Omakase" not just "Fine Dining"
- Consider budget when suggesting dining tiers`
        },
        {
          role: "user",
          content: "Destination: " + destination + ", " + country + ". Traveller said: \"" + query + "\". Interests: " + interests + ". Style: " + style + ". Budget: " + budget + ". Duration: " + duration + " days in " + month + "."
        }
      ]
    });

    const categoryData = JSON.parse(categoryResult.choices[0].message.content || "{}");
    const experienceCategories: string[] = categoryData.experienceCategories || ["Experiences", "Adventures", "Culture", "Hidden Gems", "Local Life"];
    const diningCategories: string[] = categoryData.diningCategories || ["Local Dining", "Street Food", "Cafes"];
    const allCategories = [...experienceCategories, ...diningCategories];

    // Step 3: Generate experiences and dining in 2 parallel calls
    const budgetInstruction = budgetPerDay
      ? "Daily budget is approximately $" + budgetPerDay + " per day. Do not recommend places that exceed this budget tier unless absolutely iconic."
      : "Budget is flexible.";

    const [expResult, diningResult] = await Promise.all([
      // Experiences call
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a local insider and travel expert for ${destination}. Your job is to recommend experiences that directly match what this specific traveller asked for.

CRITICAL RULES:
- Every recommendation must have a DIRECT connection to the traveller's stated interests
- Prioritise hidden gems and lesser-known places over generic tourist attractions
- Do NOT recommend places just because they are famous — only if they match the traveller's taste
- If the traveller mentions specific interests (e.g. ramen, shrines, hiking), most cards should relate to those
- Quality over quantity — only include places you would genuinely recommend to this exact person
- ${budgetInstruction}
- whyVisit MUST explicitly state which of the traveller's interests this matches and why it is special

Return a JSON object with a "cards" array. Generate 8 cards per category for these categories: ${experienceCategories.join(", ")}.

Each card: { id (unique kebab slug), title (specific place name), category (exact category from list), type: "experience", imageUrl: "", location (specific area/address), duration (realistic e.g. "2-3 hours"), whyVisit (2 sentences — must reference traveller interests explicitly), referenceUrl ("https://google.com/search?q=" + place + " " + destination), priceRange (Free/$/$$/$$$/$$$$), hiddenGem (true/false) }`
          },
          {
            role: "user",
            content: "The traveller said exactly: \"" + query + "\". Destination: " + destination + " in " + month + ". " + duration + " days. Style: " + style + ". Interests: " + interests + ". Budget: " + budget + ". Generate experiences across these categories: " + experienceCategories.join(", ")
          }
        ]
      }),
      // Dining call
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a local food expert for ${destination}. Recommend dining experiences that match this traveller's food preferences and budget.

CRITICAL RULES:
- Only recommend restaurants/food spots directly relevant to their stated tastes
- Include specific dish recommendations in whyVisit
- Mix iconic establishments with hidden local gems
- ${budgetInstruction}
- Never recommend tourist trap restaurants
- whyVisit must mention specific dishes and why this suits this traveller

Return a JSON object with a "cards" array. Generate 8 cards per category for: ${diningCategories.join(", ")}.

Each card: { id (unique kebab slug), title (specific restaurant/food spot name), category (exact category from list), type: "dining", imageUrl: "", location (specific area/address), duration (e.g. "1-2 hours"), whyVisit (2 sentences with specific dishes and personal relevance), referenceUrl ("https://google.com/search?q=" + place + " " + destination), priceRange ($/$$/$$$/$$$$/Free), hiddenGem (true/false) }`
          },
          {
            role: "user",
            content: "The traveller said exactly: \"" + query + "\". Destination: " + destination + " in " + month + ". Style: " + style + ". Food interests: " + interests + ". Budget: " + budget + ". Dietary: " + (Array.isArray(trip.dietary) ? trip.dietary.join(", ") : "none stated") + ". Generate dining across: " + diningCategories.join(", ")
          }
        ]
      })
    ]);

    const expData = JSON.parse(expResult.choices[0].message.content || '{"cards":[]}');
    const diningData = JSON.parse(diningResult.choices[0].message.content || '{"cards":[]}');
    const allCards = [...(expData.cards || []), ...(diningData.cards || [])];

    // Step 4: Fetch images in batches
    const enriched: Record<string, unknown>[] = [];
    for (let i = 0; i < allCards.length; i += 10) {
      const batch = allCards.slice(i, i + 10);
      const batchEnriched = await Promise.all(
        batch.map(async (card: Record<string, unknown>) => {
          const imageUrl = await fetchWikimediaImage(
            String(card.title),
            destination,
            String(card.type)
          );
          return { ...card, imageUrl };
        })
      );
      enriched.push(...batchEnriched);
    }

    return NextResponse.json({
      trip,
      cards: enriched,
      categories: { experience: experienceCategories, dining: diningCategories }
    });

  } catch (err) {
    console.error("parse-query error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
