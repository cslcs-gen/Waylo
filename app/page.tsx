"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "I'm going to Tokyo for 5 days in October with a budget of $2000, I love ramen and hidden shrines.",
  "Planning a 10-day Bali trip in June for a couple, we enjoy surfing, rice terraces and local warungs.",
  "Weekend in Rome, solo traveller, obsessed with Renaissance art and aperitivo culture.",
  "7 days in Iceland in December chasing the Northern Lights — I love hiking and dramatic landscapes.",
  "2 weeks in Japan in April, cherry blossom season, mix of Tokyo city life and Kyoto temples.",
];

const LOADING_STEPS = [
  { message: "Understanding your travel style..." },
  { message: "Creating your personalised categories..." },
  { message: "Finding hidden gems just for you..." },
  { message: "Curating experiences matching your interests..." },
  { message: "Selecting the best dining spots..." },
  { message: "Almost ready — your itinerary is coming..." },
];

const DESTINATIONS = [
  { emoji: "🗼", name: "Tokyo" },
  { emoji: "🏄", name: "Bali" },
  { emoji: "🏛", name: "Rome" },
  { emoji: "🌌", name: "Iceland" },
  { emoji: "🏙", name: "New York" },
  { emoji: "🌺", name: "Kyoto" },
  { emoji: "🕌", name: "Istanbul" },
  { emoji: "🦁", name: "Nairobi" },
];

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);

  // Track page visit on load
  useEffect(() => {
    const sessionId = localStorage.getItem("wayloSessionId") ?? crypto.randomUUID();
    localStorage.setItem("wayloSessionId", sessionId);
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "visit",
        sessionId,
        page: "/",
        referrer: document.referrer,
      }),
    }).catch(() => {});
  }, []);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = "https://waylo-seven.vercel.app";
    const text = "Plan your next trip with AI — Waylo curates 140+ personalised experiences and builds your day-by-day itinerary in minutes.";
    if (navigator.share) {
      await navigator.share({ title: "Waylo — AI Travel Planner", text, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (query) return;
    const text = EXAMPLE_PROMPTS[exampleIdx];
    let i = 0;
    setTypedText("");
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
        setTimeout(() => {
          setExampleIdx((idx) => (idx + 1) % EXAMPLE_PROMPTS.length);
        }, 3000);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [exampleIdx, query]);

  useEffect(() => {
    if (!loading) { setLoadingStep(0); setLoadingProgress(0); return; }
    let elapsed = 0;
    const totalDuration = 90000;
    const stepDuration = totalDuration / LOADING_STEPS.length;
    const tick = setInterval(() => {
      elapsed += 300;
      const progress = Math.min(95, Math.round((elapsed / totalDuration) * 100));
      setLoadingProgress(progress);
      setLoadingStep(Math.min(LOADING_STEPS.length - 1, Math.floor(elapsed / stepDuration)));
    }, 300);
    return () => clearInterval(tick);
  }, [loading]);

  const handleSubmit = async () => {
    if (!query.trim() || query.trim().length < 15) {
      setError("Tell us a bit more — destination, how long, and what you love.");
      return;
    }
    setError("");
    setLoading(true);
    const sessionId = localStorage.getItem("wayloSessionId") ?? crypto.randomUUID();
    localStorage.setItem("wayloSessionId", sessionId);
    const res = await fetch("/api/parse-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, sessionId }),
    });
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    sessionStorage.setItem("tripData", JSON.stringify(data));
    router.push("/discover");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-10 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">Waylo</span>
          </div>
          <div className="relative w-28 h-28 mx-auto mb-8">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#1f2937" strokeWidth="6" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="#f97316" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={String(2 * Math.PI * 48)}
                strokeDashoffset={String(2 * Math.PI * 48 * (1 - loadingProgress / 100))}
                style={{ transition: "stroke-dashoffset 0.4s ease" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xl font-bold">{loadingProgress}%</span>
            </div>
          </div>
          <p className="text-white text-lg font-medium mb-2 min-h-7 transition-all duration-500">
            {LOADING_STEPS[loadingStep]?.message}
          </p>
          <p className="text-gray-500 text-sm mb-8">This takes about 20–30 seconds. We are handpicking experiences specifically for you.</p>
          <div className="flex justify-center gap-1.5 flex-wrap mb-8">
            {LOADING_STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= loadingStep ? "bg-orange-400 w-7" : "bg-gray-800 w-3"}`} />
            ))}
          </div>
          <p className="text-gray-700 text-xs">Understanding your taste ✦ Curating hidden gems ✦ Building your itinerary</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Waylo</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="/itinerary" className="hover:text-gray-300 transition-colors">My Itinerary</a>
          <a href="/admin" className="hover:text-gray-300 transition-colors">Admin</a>
          <button onClick={handleShare}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              shared
                ? "border-green-500/50 text-green-400 bg-green-500/10"
                : "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
            }`}>
            {shared ? (
              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!</>
            ) : (
              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg> Share</>
            )}
          </button>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-xs text-gray-400 font-medium">AI-Powered Travel Planning</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold text-white text-center leading-tight mb-4 max-w-4xl tracking-tight">
          Your trip,{" "}
          <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-pink-400 bg-clip-text text-transparent">
            planned by AI.
          </span>
        </h1>
        <p className="text-gray-400 text-lg text-center mb-10 max-w-lg leading-relaxed">
          Describe your dream destination in plain English. Waylo curates 140+ personalised experiences and builds your perfect day-by-day itinerary.
        </p>

        <div className="w-full max-w-2xl">
          <div className={`relative bg-gray-900 border rounded-2xl transition-all duration-200 ${
            error ? "border-red-500/50" : "border-gray-800 hover:border-gray-700 focus-within:border-orange-500/50 focus-within:shadow-xl focus-within:shadow-orange-500/10"
          }`}>
            <textarea
              rows={4}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (error) setError(""); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-white text-[15px] leading-relaxed p-5 pb-14 resize-none outline-none rounded-2xl"
            />
            {!query && (
              <div className="absolute top-5 left-5 right-5 text-[15px] leading-relaxed text-gray-600 pointer-events-none select-none">
                {typedText}
                {isTyping && <span className="inline-block w-0.5 h-4 bg-orange-400 ml-0.5 animate-pulse align-middle" />}
              </div>
            )}
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <span className="text-xs text-gray-600 hidden sm:block">⌘ + Enter to plan</span>
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                className={`ml-auto px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  !query.trim()
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-400 hover:to-rose-400 active:scale-95 shadow-lg shadow-orange-500/25"
                }`}
              >
                Plan my trip →
              </button>
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-red-400 text-center">{error}</p>}

          <p className="mt-4 text-center text-xs text-gray-600">
            One destination at a time · No sign-up required · 140+ curated experiences per trip
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-2xl">
          {DESTINATIONS.map((dest) => (
            <button
              key={dest.name}
              onClick={() => setQuery(`I want to visit ${dest.name} for 7 days. I love culture, local food and off-the-beaten-path experiences.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-all"
            >
              <span>{dest.emoji}</span>
              <span>{dest.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 justify-center max-w-xl">
          {["60+ handpicked experiences", "Day-by-day itinerary", "Export to PDF & Excel", "7 categories of experiences"].map((f) => (
            <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-1 h-1 rounded-full bg-orange-500" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <footer className="relative z-10 py-5 px-8 flex items-center justify-between text-xs text-gray-700 border-t border-gray-900">
        <span>© 2025 Waylo</span>
        <a href="https://github.com/cslcs-gen/Waylo" className="hover:text-gray-500 transition-colors">View on GitHub →</a>
      </footer>
    </main>
  );
}
