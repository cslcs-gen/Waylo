// ============================================================
// types/trip.ts — Core data shapes for AI Travel Itinerary App
// ============================================================

export interface ParsedTrip {
  destination: string;
  country: string;
  duration_days: number;
  travel_dates: { month: string; year: number | null };
  budget_usd: number | null;
  interests: string[];
  travel_style: "solo" | "couple" | "family" | "group";
  dietary: string[];
}

export type AttractionCategory = "Casual" | "Adventure" | "Fun" | "Culture";
export type DiningCategory = "Fine Dining" | "Street Food" | "Cafes";
export type CardCategory = AttractionCategory | DiningCategory;

export interface TripCard {
  id: string;
  title: string;
  category: CardCategory;
  type: "attraction" | "dining";
  imageUrl: string;
  location: string;
  duration: string; // e.g. "1–2 hours" or "30–60 mins"
  whyVisit: string; // Max 2 sentences
  referenceUrl: string;
  priceRange?: string; // e.g. "$$" or "Free"
  rating?: number;
}

export interface Itinerary {
  id: string;
  tripDetails: ParsedTrip;
  cards: TripCard[];
  createdAt: string;
}

export interface AnalyticsEvent {
  type: "search" | "card_select" | "export" | "page_view";
  payload: Record<string, unknown>;
}
