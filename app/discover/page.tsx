
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TripCard = {
  id: string; title: string; category: string; type: string;
  imageUrl: string; location: string; duration: string;
  whyVisit: string; referenceUrl: string; priceRange?: string;
};

const ATTRACTION_TABS = ["Casual", "Adventure", "Fun", "Culture"];
const DINING_TABS = ["Fine Dining", "Street Food", "Cafes"];

const CATEGORY_COLORS: Record<string, string> = {
  Casual: "bg-green-500/10 text-green-400 border-green-500/20",
  Adventure: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Fun: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Culture: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Fine Dining": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Street Food": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Cafes: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function DiscoverPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [cards, setCards] = useState<TripCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"attractions" | "dining">("attractions");
  const [activeSubTab, setActiveSubTab] = useState("Casual");

  useEffect(() => {
    const raw = sessionStorage.getItem("tripData");
    if (!raw) { router.replace("/"); return; }
    const { trip, cards } = JSON.parse(raw);
    setTrip(trip); setCards(cards);

    // Track page visit
    const sessionId = localStorage.getItem("wayloSessionId") || "";
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "visit", sessionId, page: "/discover", referrer: document.referrer }),
    }).catch(() => {});

    // Track search
    if (trip) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "search",
          sessionId,
          rawQuery: "",
          destination: trip.destination,
          durationDays: trip.duration_days,
          budgetUsd: trip.budget_usd,
          travelStyle: trip.travel_style,
        }),
      }).catch(() => {});
    }
  }, [router]);

  const toggleCard = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleCards = cards.filter(c =>
    activeTab === "attractions"
      ? c.type === "attraction" && c.category === activeSubTab
      : c.type === "dining" && c.category === activeSubTab
  );

  const goToItinerary = () => {
    const selected = cards.filter(c => selectedIds.has(c.id));
    sessionStorage.setItem("itinerary", JSON.stringify({ trip, cards: selected }));
    router.push("/itinerary");
  };

  if (!trip) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-orange-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                <span className="text-white font-bold text-sm">W</span>
              </a>
              <div>
                <h1 className="text-base font-semibold text-white">{String(trip.destination)}</h1>
                <p className="text-xs text-gray-500">
                  {String(trip.duration_days)} days · {String((trip.travel_dates as Record<string,unknown>)?.month || "")}
                  {trip.budget_usd ? ` · $${Number(trip.budget_usd).toLocaleString()} budget` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set(cards.map(c => c.id)))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all">
                Select All
              </button>
              <FeedbackModal />
              <button onClick={() => setSelectedIds(new Set())}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all">
                Clear
              </button>
              {selectedIds.size > 0 && (
                <button onClick={goToItinerary}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm px-4 py-2 rounded-xl hover:from-orange-400 hover:to-rose-400 transition-all shadow-lg shadow-orange-500/25 active:scale-95">
                  <span className="bg-white/20 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{selectedIds.size}</span>
                  Build Itinerary →
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 mt-4">
            {(["attractions", "dining"] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubTab(tab === "attractions" ? "Casual" : "Fine Dining"); }}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === tab ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white font-medium shadow-lg shadow-orange-500/20" : "text-gray-500 hover:text-gray-300 hover:bg-gray-900"}`}>
                {tab === "attractions" ? "Attractions" : "Dining"}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            {(activeTab === "attractions" ? ATTRACTION_TABS : DINING_TABS).map(sub => (
              <button key={sub} onClick={() => setActiveSubTab(sub)}
                className={`px-3 py-1 rounded-full text-xs transition-all border ${activeSubTab === sub ? "bg-gray-800 text-white border-gray-600" : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300"}`}>
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {visibleCards.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">🔍</p>
            <p>No recommendations in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCards.map(card => (
              <div key={card.id} onClick={() => toggleCard(card.id)}
                className={`group relative bg-gray-900 rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                  selectedIds.has(card.id)
                    ? "border-orange-500/60 shadow-xl shadow-orange-500/10"
                    : "border-gray-800 hover:border-gray-700 hover:shadow-xl hover:shadow-black/20"
                }`}>
                <div className="relative h-44 bg-gray-800 overflow-hidden">
                  <img
                    src={card.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(card.id)}/400/176`}
                    alt={card.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${encodeURIComponent(card.id)}/400/176`; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(card.id) ? "bg-orange-500 border-orange-500" : "bg-gray-900/60 border-gray-600 group-hover:border-gray-400"
                  }`}>
                    {selectedIds.has(card.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>
                  <span className={`absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[card.category] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                    {card.category}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1 leading-snug">{card.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    📍 {card.location} · ⏱ {card.duration}
                    {card.priceRange ? ` · ${card.priceRange}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{card.whyVisit}</p>
                  <div className="flex items-center gap-3">
                    <a href={card.referenceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Learn more →
                    </a>
                    
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.title + " " + card.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-400 transition-colors">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Maps
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
