
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type TripCard = {
  id: string; title: string; category: string; type: string;
  imageUrl: string; location: string; duration: string;
  whyVisit: string; referenceUrl: string; priceRange?: string;
  hiddenGem?: boolean;
};

type Categories = { experience: string[]; dining: string[]; };

const COLORS = [
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-green-500/10 text-green-400 border-green-500/20",
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-teal-500/10 text-teal-400 border-teal-500/20",
  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
];

function CardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      <div className="h-44 bg-gray-800 animate-pulse" />
      <div className="p-4">
        <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-3/4" />
        <div className="h-3 bg-gray-800 rounded animate-pulse mb-3 w-1/2" />
        <div className="h-3 bg-gray-800 rounded animate-pulse mb-1 w-full" />
        <div className="h-3 bg-gray-800 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [cards, setCards] = useState<TripCard[]>([]);
  const [categories, setCategories] = useState<Categories>({ experience: [], dining: [] });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"experience" | "dining">("experience");
  const [activeSubTab, setActiveSubTab] = useState("");
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(true);
  const [imageProgress, setImageProgress] = useState(0);

  const enrichImages = useCallback(async (cards: TripCard[], destination: string) => {
    setImagesLoading(true);
    setImageProgress(0);
    try {
      const res = await fetch("/api/enrich-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards, destination }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const imageMap: Record<string, string> = {};
      for (const item of (data.images || [])) {
        imageMap[item.id] = item.imageUrl;
      }
      setCards(prev => prev.map(card => ({
        ...card,
        imageUrl: imageMap[card.id] || card.imageUrl || ""
      })));
      setImageProgress(100);
    } catch {
      console.error("Image enrichment failed");
    } finally {
      setImagesLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("tripData");
    if (!raw) { router.replace("/"); return; }
    const { trip, cards, categories } = JSON.parse(raw);
    setTrip(trip);
    setCards(cards);

    const cats: Categories = categories || {
      experience: [...new Set(cards.filter((c: TripCard) => c.type === "experience").map((c: TripCard) => c.category))],
      dining: [...new Set(cards.filter((c: TripCard) => c.type === "dining").map((c: TripCard) => c.category))],
    };
    setCategories(cats);

    const allCats = [...cats.experience, ...cats.dining];
    const colorMap: Record<string, string> = {};
    allCats.forEach((cat, i) => { colorMap[cat] = COLORS[i % COLORS.length]; });
    setCategoryColorMap(colorMap);
    if (cats.experience.length > 0) setActiveSubTab(cats.experience[0]);

    // Track visit
    const sessionId = localStorage.getItem("wayloSessionId") || "";
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "visit", sessionId, page: "/discover", referrer: document.referrer }),
    }).catch(() => {});

    // Start image enrichment in background immediately
    enrichImages(cards, trip.destination);
  }, [router, enrichImages]);

  // Update image progress periodically while loading
  useEffect(() => {
    if (!imagesLoading) return;
    const interval = setInterval(() => {
      setImageProgress(prev => Math.min(90, prev + 5));
    }, 1500);
    return () => clearInterval(interval);
  }, [imagesLoading]);

  const toggleCard = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentSubTabs = activeTab === "experience" ? categories.experience : categories.dining;
  const visibleCards = cards.filter(c => c.type === activeTab && c.category === activeSubTab);

  const goToItinerary = () => {
    const selected = cards.filter(c => selectedIds.has(c.id));
    sessionStorage.setItem("itinerary", JSON.stringify({ trip, cards: selected }));
    router.push("/itinerary");
  };

  if (!trip) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-orange-400 rounded-full animate-spin mx-auto" />
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <a href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                <span className="text-white font-bold text-sm">W</span>
              </a>
              <div>
                <h1 className="text-base font-semibold text-white">{String(trip.destination)}</h1>
                <p className="text-xs text-gray-500">
                  {String(trip.duration_days)} days
                  {trip.budget_usd ? " · $" + Number(trip.budget_usd).toLocaleString() + " budget" : ""}
                  {" · "}{cards.length} experiences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedIds(new Set(cards.map(c => c.id)))}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all">
                Select All
              </button>
              <button onClick={() => setSelectedIds(new Set())}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all">
                Clear
              </button>
              {selectedIds.size > 0 && (
                <button onClick={goToItinerary}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm px-4 py-2 rounded-xl hover:from-orange-400 hover:to-rose-400 transition-all shadow-lg shadow-orange-500/25 active:scale-95">
                  <span className="bg-white/20 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{selectedIds.size}</span>
                  Build Itinerary
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1 mt-4">
            {(["experience", "dining"] as const).map(tab => (
              <button key={tab} onClick={() => {
                setActiveTab(tab);
                const firstCat = tab === "experience" ? categories.experience[0] : categories.dining[0];
                setActiveSubTab(firstCat || "");
              }}
                className={"px-4 py-2 rounded-lg text-sm transition-all " + (activeTab === tab ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white font-medium" : "text-gray-500 hover:text-gray-300 hover:bg-gray-900")}>
                {tab === "experience" ? "✦ Experiences" : "🍽 Dining"}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            {currentSubTabs.map(sub => (
              <button key={sub} onClick={() => setActiveSubTab(sub)}
                className={"px-3 py-1 rounded-full text-xs transition-all border " + (activeSubTab === sub ? "bg-gray-800 text-white border-gray-600" : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300")}>
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Image loading progress bar */}
        {imagesLoading && (
          <div className="h-0.5 bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-1000"
              style={{ width: imageProgress + "%" }}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Image loading notice */}
        {imagesLoading && (
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-600">
            <div className="w-3 h-3 border border-gray-700 border-t-orange-400 rounded-full animate-spin" />
            Fetching photos in the background...
          </div>
        )}

        {visibleCards.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleCards.map(card => (
              <div key={card.id} onClick={() => toggleCard(card.id)}
                className={"group relative bg-gray-900 rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer " + (selectedIds.has(card.id) ? "border-orange-500/60 shadow-xl shadow-orange-500/10" : "border-gray-800 hover:border-gray-700 hover:shadow-xl hover:shadow-black/20")}>
                <div className="relative h-44 bg-gray-800 overflow-hidden">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      {imagesLoading ? (
                        <div className="w-5 h-5 border border-gray-700 border-t-orange-400 rounded-full animate-spin" />
                      ) : (
                        <span className="text-3xl">{card.type === "dining" ? "🍽" : "✦"}</span>
                      )}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                  <div className={"absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all " + (selectedIds.has(card.id) ? "bg-orange-500 border-orange-500" : "bg-gray-900/60 border-gray-600 group-hover:border-gray-400")}>
                    {selectedIds.has(card.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <span className={"text-xs font-medium px-2 py-0.5 rounded-full border " + (categoryColorMap[card.category] ?? "bg-gray-800 text-gray-400 border-gray-700")}>
                      {card.category}
                    </span>
                    {card.hiddenGem && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        ✦ Hidden Gem
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm mb-1 leading-snug">{card.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    📍 {card.location} · ⏱ {card.duration}
                    {card.priceRange ? " · " + card.priceRange : ""}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">{card.whyVisit}</p>
                  <div className="flex items-center gap-3">
                    <a href={card.referenceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Learn more
                    </a>
                    <button
                      onClick={e => { e.stopPropagation(); window.open("https://maps.google.com/?q=" + encodeURIComponent(card.title + " " + card.location), "_blank"); }}
                      className="text-xs text-gray-500 hover:text-green-400 transition-colors">
                      📍 Maps
                    </button>
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
