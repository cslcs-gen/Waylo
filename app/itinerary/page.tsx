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
  "Morning": "bg-amber-50 text-amber-700 border-amber-200",
  "Late Morning": "bg-orange-50 text-orange-700 border-orange-200",
  "Afternoon": "bg-blue-50 text-blue-700 border-blue-200",
  "Evening": "bg-purple-50 text-purple-700 border-purple-200",
  "Night": "bg-gray-900 text-white border-gray-700",
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
    setTrip(trip);
    setCards(cards);
    generatePlan(trip, cards);
  }, [router]);

  const generatePlan = async (trip: Record<string, unknown>, cards: TripCard[]) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/plan-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, cards }),
      });
      if (!res.ok) throw new Error("Failed to plan");
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
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">← Back to Discovery</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{String(trip.destination)} · {String(trip.duration_days)}-Day Itinerary</h1>
            <p className="text-sm text-gray-400">{cards.length} experiences · {String(trip.travel_dates as string || (trip.travel_dates as Record<string,unknown>)?.month || "")}</p>
          </div>
          {plan && (
            <div className="flex gap-2">
              {[{f:"pdf",i:"📄"},{f:"xlsx",i:"📊"}].map(({f,i}) => (
                <button key={f} onClick={() => handleExport(f)} disabled={!!exporting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-400 text-sm transition-all">
                  <span>{i}</span><span className="text-gray-600 font-medium">{exporting===f ? "..." : f.toUpperCase()}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Planning your perfect itinerary...</p>
          <p className="text-xs text-gray-300">Grouping by location, timing meals, optimising your days</p>
        </div>
      ) : error ? (
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => generatePlan(trip!, cards)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Try Again</button>
        </div>
      ) : plan ? (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
            <p className="text-sm text-gray-600 leading-relaxed">{plan.summary}</p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {plan.days.map(day => (
              <button key={day.day} onClick={() => setActiveDay(day.day)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeDay === day.day ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                Day {day.day}
              </button>
            ))}
          </div>

          {plan.days.filter(d => d.day === activeDay).map(day => (
            <div key={day.day}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{day.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{day.theme}</p>
              </div>
              <div className="flex flex-col gap-4">
                {day.slots.map((slot, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex">
                    {slot.imageUrl && (
                      <div className="w-32 h-32 flex-shrink-0">
                        <img src={slot.imageUrl} alt={slot.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                      </div>
                    )}
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TIME_COLORS[slot.time] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                          {slot.time}
                        </span>
                        <span className="text-xs text-gray-400">{slot.category}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">{slot.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">📍 {slot.location} · ⏱ {slot.duration}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{slot.whyNow}</p>
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
