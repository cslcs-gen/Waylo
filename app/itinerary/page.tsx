
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = {
  time: string; cardId: string; title: string; location: string;
  duration: string; category: string; type: string; imageUrl: string; whyNow: string;
};
type Day = { day: number; title: string; theme: string; slots: Slot[]; };
type Plan = { summary: string; days: Day[]; };
type TripCard = { id: string; title: string; category: string; type: string; imageUrl: string; location: string; duration: string; whyVisit: string; referenceUrl: string; priceRange?: string; };

const TIME_COLORS: Record<string, string> = {
  "Morning": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Late Morning": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Afternoon": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Evening": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Night": "bg-gray-800 text-gray-300 border-gray-700",
};

export default function ItineraryPage() {
  const router = useRouter();
  const [trip, setTrip] = useState<Record<string, unknown> | null>(null);
  const [cards, setCards] = useState<TripCard[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("itinerary");
    if (!raw) { router.replace("/"); return; }
    const { trip, cards } = JSON.parse(raw);
    setTrip(trip); setCards(cards);
    generatePlan(trip, cards);

    // Track page visit
    const sessionId = localStorage.getItem("wayloSessionId") || "";
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "visit", sessionId, page: "/itinerary", referrer: document.referrer }),
    }).catch(() => {});
  }, [router]);

  const generatePlan = async (trip: Record<string, unknown>, cards: TripCard[]) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/plan-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, cards }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPlan(data);
    } catch {
      setError("Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!trip || !plan) return;
    setExporting(format);
    try {
      if (format === "pdf") {
        const { default: jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text(String(trip.destination) + " Itinerary", 20, y); y += 10;
        doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(120,120,120);
        doc.text(plan.summary, 20, y, { maxWidth: 170 }); y += 16;
        for (const day of plan.days) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
          doc.text("Day " + day.day + ": " + day.title, 20, y); y += 6;
          doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(100,100,100);
          doc.text(day.theme, 20, y); y += 8;
          for (const slot of day.slots) {
            if (y > 265) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0,0,0);
            doc.text(slot.time + " — " + slot.title, 25, y); y += 5;
            doc.setFont("helvetica", "normal"); doc.setTextColor(80,80,80);
            doc.text("📍 " + slot.location + "  ⏱ " + slot.duration, 28, y); y += 5;
            const lines = doc.splitTextToSize(slot.whyNow, 160);
            doc.setTextColor(120,120,120);
            doc.text(lines, 28, y); y += lines.length * 4 + 4;
          }
          y += 4;
        }
        doc.save(String(trip.destination).toLowerCase() + "-itinerary.pdf");
      } else if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const rows: unknown[][] = [["Day", "Time", "Title", "Location", "Duration", "Category", "Notes"]];
        for (const day of plan.days) {
          for (const slot of day.slots) {
            rows.push(["Day " + day.day + ": " + day.title, slot.time, slot.title, slot.location, slot.duration, slot.category, slot.whyNow]);
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{wch:20},{wch:14},{wch:28},{wch:24},{wch:12},{wch:14},{wch:50}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
        XLSX.writeFile(wb, String(trip.destination).toLowerCase() + "-itinerary.xlsx");
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(null);
    }
  };

  if (!trip) return null;

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 sticky top-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
                <span className="text-white font-bold text-sm">W</span>
              </a>
              <div>
                <h1 className="text-base font-semibold text-white">
                  {String(trip.destination)} · {String(trip.duration_days)}-Day Itinerary
                </h1>
                <p className="text-xs text-gray-500">{cards.length} experiences selected</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.back()} className="text-xs px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all">
                ← Back
              </button>
              {plan && (
                <>
                  {[{f:"pdf",i:"📄"},{f:"xlsx",i:"📊"}].map(({f,i}) => (
                    <button key={f} onClick={() => handleExport(f)} disabled={!!exporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 text-xs transition-all">
                      <span>{i}</span><span>{exporting===f ? "..." : f.toUpperCase()}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="relative z-10 flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-10 h-10 border-2 border-gray-800 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-white font-medium">Planning your perfect itinerary...</p>
          <p className="text-gray-600 text-sm">Grouping by location · Timing meals · Optimising your days</p>
        </div>
      ) : error ? (
        <div className="relative z-10 max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => generatePlan(trip!, cards)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm">
            Try Again
          </button>
        </div>
      ) : plan ? (
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
            <p className="text-gray-400 text-sm leading-relaxed">{plan.summary}</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {plan.days.map(day => (
              <button key={day.day} onClick={() => setActiveDay(day.day)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeDay === day.day
                    ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-lg shadow-orange-500/20"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                }`}>
                Day {day.day}
              </button>
            ))}
          </div>

          {plan.days.filter(d => d.day === activeDay).map(day => (
            <div key={day.day}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{day.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{day.theme}</p>
              </div>
              <div className="flex flex-col gap-4">
                {day.slots.map((slot, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex hover:border-gray-700 transition-all">
                    {slot.imageUrl && (
                      <div className="w-32 h-32 flex-shrink-0">
                        <img src={slot.imageUrl} alt={slot.title} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      </div>
                    )}
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS[slot.time] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
                          {slot.time}
                        </span>
                        <span className="text-xs text-gray-600">{slot.category}</span>
                      </div>
                      <h3 className="font-semibold text-white text-sm mb-1">{slot.title}</h3>
                      <p className="text-xs text-gray-500 mb-2">📍 {slot.location} · ⏱ {slot.duration}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{slot.whyNow}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
