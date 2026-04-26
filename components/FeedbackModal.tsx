"use client";
import { useState } from "react";

const FEATURES = ["Search bar", "Recommendation cards", "Day-by-day itinerary", "Export feature", "Overall design"];

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [foundRelevant, setFoundRelevant] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [favouriteFeature, setFavouriteFeature] = useState("");
  const [improvement, setImprovement] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    const sessionId = localStorage.getItem("wayloSessionId") || "";
    const lastTrip = sessionStorage.getItem("tripData");
    const destination = lastTrip ? JSON.parse(lastTrip)?.trip?.destination || "" : "";

    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId, rating, foundRelevant, wouldRecommend,
        favouriteFeature, improvement, destinationSearched: destination,
      }),
    });
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => { setOpen(false); setSubmitted(false); }, 2500);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-semibold shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-rose-400 active:scale-95 transition-all">
        💬 Give Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {submitted ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🙏</p>
                <p className="text-white font-semibold text-lg">Thank you!</p>
                <p className="text-gray-400 text-sm mt-1">Your feedback helps us improve Waylo.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-semibold">Share your feedback</h2>
                  <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-300 text-xl">×</button>
                </div>

                {/* Q1: Rating */}
                <div className="mb-5">
                  <p className="text-gray-300 text-sm font-medium mb-2">1. How would you rate your Waylo experience?</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                        className={`text-2xl transition-all ${s <= (hoverRating || rating) ? "text-yellow-400 scale-110" : "text-gray-700"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q2: Relevant */}
                <div className="mb-5">
                  <p className="text-gray-300 text-sm font-medium mb-2">2. Were the recommendations relevant to your trip?</p>
                  <div className="flex gap-2">
                    {[{label:"Yes",val:true},{label:"No",val:false}].map(({label,val}) => (
                      <button key={label} onClick={() => setFoundRelevant(val)}
                        className={`px-4 py-1.5 rounded-lg border text-sm transition-all ${foundRelevant === val ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3: Recommend */}
                <div className="mb-5">
                  <p className="text-gray-300 text-sm font-medium mb-2">3. Would you recommend Waylo to a friend?</p>
                  <div className="flex gap-2">
                    {[{label:"Yes",val:true},{label:"No",val:false}].map(({label,val}) => (
                      <button key={label} onClick={() => setWouldRecommend(val)}
                        className={`px-4 py-1.5 rounded-lg border text-sm transition-all ${wouldRecommend === val ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q4: Favourite feature */}
                <div className="mb-5">
                  <p className="text-gray-300 text-sm font-medium mb-2">4. What was your favourite feature?</p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURES.map(f => (
                      <button key={f} onClick={() => setFavouriteFeature(f)}
                        className={`px-3 py-1 rounded-full text-xs border transition-all ${favouriteFeature === f ? "border-orange-500 text-orange-400 bg-orange-500/10" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q5: Improvement */}
                <div className="mb-6">
                  <p className="text-gray-300 text-sm font-medium mb-2">5. What could we improve?</p>
                  <textarea value={improvement} onChange={e => setImprovement(e.target.value)} rows={2}
                    placeholder="Tell us anything — we read every response..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-orange-500/50 resize-none placeholder:text-gray-600" />
                </div>

                <button onClick={handleSubmit} disabled={!rating || submitting}
                  className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl text-sm font-semibold hover:from-orange-400 hover:to-rose-400 transition-all disabled:opacity-40">
                  {submitting ? "Submitting..." : "Submit Feedback →"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
