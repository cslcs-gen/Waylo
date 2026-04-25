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

  if (!trip) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{String(trip.destination)}</h1>
             <p className="text-sm text-gray-400">{String(trip.duration_days)} days · {String(trip.travel_dates as string || (trip.travel_dates as Record<string,unknown>)?.month || "")}</p>
            </div>
<div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set(cards.map(c => c.id)))} className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-gray-600 transition-all">Select All</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-gray-600 transition-all">Clear</button>
              {selectedIds.size > 0 && (
              <button onClick={goToItinerary} className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                <span className="bg-white text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{selectedIds.size}</span>
                Build Itinerary →
              </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 mt-4">
            {(["attractions", "dining"] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setActiveSubTab(tab === "attractions" ? "Casual" : "Fine Dining"); }}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${activeTab === tab ? "bg-gray-900 text-white font-medium" : "text-gray-500 hover:bg-gray-100"}`}>
                {tab === "attractions" ? "Attractions" : "Dining"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {(activeTab === "attractions" ? ATTRACTION_TABS : DINING_TABS).map(sub => (
              <button key={sub} onClick={() => setActiveSubTab(sub)}
                className={`px-3 py-1 rounded-full text-xs transition-all border ${activeSubTab === sub ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {visibleCards.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><p className="text-4xl mb-3">🔍</p><p>No recommendations in this category.</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCards.map(card => (
              <div key={card.id} onClick={() => toggleCard(card.id)}
                className={`bg-white rounded-2xl overflow-hidden border transition-all cursor-pointer ${selectedIds.has(card.id) ? "border-gray-900 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}>
                <div className="relative h-44 bg-gray-100 overflow-hidden">
                  <img src={`${card.imageUrl || "https://picsum.photos/seed/${encodeURIComponent(card.id)}/400/176"}`} alt={card.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedIds.has(card.id) ? "bg-gray-900 border-gray-900" : "bg-white/80 border-gray-300"}`}>
                    {selectedIds.has(card.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <span className="absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{card.category}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">📍 {card.location} · ⏱ {card.duration}{card.priceRange ? ` · ${card.priceRange}` : ""}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.whyVisit}</p>
                  <a href={card.referenceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">Learn more →</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
