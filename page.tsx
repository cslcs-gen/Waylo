"use client";
// ============================================================
// app/page.tsx — Landing Page: minimalist hero + NL search bar
// Design: editorial minimalism inspired by Layla.ai
// ============================================================
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "I'm going to Tokyo for 5 days in October with a budget of $2000, I love ramen and hidden shrines.",
  "Planning a 10-day Bali trip in June for a couple, we enjoy surfing, rice terraces and local warungs.",
  "Weekend in Rome, solo traveller, obsessed with Renaissance art and aperitivo culture.",
  "7 days in Iceland in December chasing the Northern Lights — I love hiking and dramatic landscapes.",
];

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle through example prompts for the placeholder
  const cyclePlaceholder = () =>
    setExampleIdx((i) => (i + 1) % EXAMPLE_PROMPTS.length);

  const handleSubmit = async () => {
    if (!query.trim() || query.trim().length < 15) {
      setError("Tell us a bit more about your trip — destination, duration, and what you love.");
      return;
    }
    setError("");
    setLoading(true);

    // Store session ID in localStorage for analytics
    const sessionId =
      localStorage.getItem("travelSessionId") ??
      crypto.randomUUID();
    localStorage.setItem("travelSessionId", sessionId);

    const res = await fetch("/api/parse-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, sessionId }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    // Store results in sessionStorage for the discover page
    sessionStorage.setItem("tripData", JSON.stringify(data));
    router.push("/discover");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="text-sm font-medium tracking-tight text-gray-900">
          ✈ Itinerai
        </span>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="/itinerary" className="hover:text-gray-900 transition-colors">
            My Itinerary
          </a>
          <a href="/admin" className="hover:text-gray-900 transition-colors">
            Admin
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Eyebrow */}
        <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-8">
          AI-Powered Travel Planning
        </p>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-light text-gray-900 text-center leading-tight mb-4 max-w-3xl">
          Describe your dream trip.
          <br />
          <span className="font-semibold">We'll plan it.</span>
        </h1>
        <p className="text-gray-400 text-lg text-center mb-12 max-w-md">
          No forms. No dropdowns. Just tell us where you're going and what you love.
        </p>

        {/* Search Container */}
        <div className="w-full max-w-2xl">
          <div
            className={`relative border rounded-2xl transition-all duration-200 ${
              error
                ? "border-red-300 bg-red-50"
                : "border-gray-200 bg-white hover:border-gray-300 focus-within:border-gray-400 focus-within:shadow-lg focus-within:shadow-gray-100"
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={4}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={EXAMPLE_PROMPTS[exampleIdx]}
              className="w-full bg-transparent text-gray-900 text-[15px] leading-relaxed p-5 pb-14 resize-none outline-none placeholder:text-gray-300 rounded-2xl"
            />

            {/* Bottom bar */}
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between">
              <button
                onClick={cyclePlaceholder}
                className="text-xs text-gray-300 hover:text-gray-500 transition-colors flex items-center gap-1"
              >
                <span>↻</span> Try another example
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 hidden sm:block">
                  ⌘ + Enter
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !query.trim()}
                  className={`
                    px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${
                      loading || !query.trim()
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-900 text-white hover:bg-gray-700 active:scale-95"
                    }
                  `}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Planning…
                    </span>
                  ) : (
                    "Plan my trip →"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Social proof */}
          <p className="mt-5 text-center text-xs text-gray-300">
            Free to use · No sign-up required · Powered by Gemini AI
          </p>
        </div>

        {/* Example chips */}
        <div className="mt-10 flex flex-wrap gap-2 justify-center max-w-2xl">
          {["🗼 Tokyo", "🏄 Bali", "🏛 Rome", "🌌 Iceland", "🏙 New York", "🌺 Kyoto"].map(
            (dest) => (
              <button
                key={dest}
                onClick={() =>
                  setQuery(
                    `I want to visit ${dest.split(" ")[1]} for 7 days. I love culture, local food and off-the-beaten-path experiences.`
                  )
                }
                className="px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all"
              >
                {dest}
              </button>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-5 px-8 flex items-center justify-between text-xs text-gray-300">
        <span>© 2025 Itinerai — Free & Open Source</span>
        <a
          href="https://github.com/yourusername/ai-travel-app"
          className="hover:text-gray-500 transition-colors"
        >
          View on GitHub →
        </a>
      </footer>
    </main>
  );
}
