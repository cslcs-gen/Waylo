"use client";
import { useState, useEffect } from "react";

interface AdminData {
  totalVisits: number;
  uniqueSessions: number;
  totalSearches: number;
  totalFeedback: number;
  avgRating: string;
  topDestinations: { destination: string; count: number }[];
  pageBreakdown: { page: string; count: number }[];
  recentSearches: { destination: string; raw_query: string; travel_style: string; duration_days: number; budget_usd: number; created_at: string }[];
  recentFeedback: { rating: number; found_relevant: boolean; would_recommend: boolean; favourite_feature: string; improvement: string; destination_searched: string; created_at: string }[];
  allFeedback: Record<string, unknown>[];
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "searches" | "feedback">("overview");

  const login = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin", {
      headers: { "x-admin-secret": secret },
    });
    if (!res.ok) { setError("Wrong password. Access denied."); setLoading(false); return; }
    const json = await res.json();
    setData(json);
    setAuthed(true);
    setLoading(false);
  };

  const exportFeedback = () => {
    if (!data) return;
    import("xlsx").then(XLSX => {
      const rows = [
        ["Date", "Destination", "Rating", "Found Relevant", "Would Recommend", "Favourite Feature", "Improvement"],
        ...data.allFeedback.map((f: Record<string, unknown>) => [
          new Date(String(f.created_at)).toLocaleDateString(),
          String(f.destination_searched || ""),
          String(f.rating || ""),
          f.found_relevant ? "Yes" : "No",
          f.would_recommend ? "Yes" : "No",
          String(f.favourite_feature || ""),
          String(f.improvement || ""),
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{wch:12},{wch:16},{wch:8},{wch:14},{wch:16},{wch:24},{wch:40}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Feedback");
      XLSX.writeFile(wb, "waylo-feedback.xlsx");
    });
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <span className="text-white text-xl font-semibold">Waylo Admin</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Restricted Access</h2>
            <p className="text-gray-500 text-sm mb-5">Enter your admin password to continue.</p>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Admin password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/50 mb-3 placeholder:text-gray-600"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button onClick={login} disabled={loading || !secret}
              className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3 rounded-xl text-sm font-semibold hover:from-orange-400 hover:to-rose-400 transition-all disabled:opacity-50">
              {loading ? "Checking..." : "Access Dashboard →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </a>
            <div>
              <h1 className="text-white font-semibold text-base">Admin Dashboard</h1>
              <p className="text-gray-500 text-xs">Waylo Analytics</p>
            </div>
          </div>
          <button onClick={exportFeedback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200 text-xs transition-all">
            📊 Export Feedback
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Visits", value: data.totalVisits, icon: "👁" },
            { label: "Unique Users", value: data.uniqueSessions, icon: "👤" },
            { label: "Searches", value: data.totalSearches, icon: "🔍" },
            { label: "Feedback", value: data.totalFeedback, icon: "💬" },
            { label: "Avg Rating", value: data.avgRating + (data.avgRating !== "N/A" ? " / 5" : ""), icon: "⭐" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-500 text-xs mb-1">{icon} {label}</p>
              <p className="text-white text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {(["overview", "searches", "feedback"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize border ${
                activeTab === tab
                  ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Top Destinations</h2>
              <div className="space-y-3">
                {data.topDestinations.map(({ destination, count }, i) => {
                  const max = data.topDestinations[0]?.count || 1;
                  return (
                    <div key={destination}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{i + 1}. {destination}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full"
                          style={{ width: `${Math.round((count / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">Page Views</h2>
              <div className="space-y-3">
                {data.pageBreakdown.map(({ page, count }) => {
                  const max = Math.max(...data.pageBreakdown.map(p => p.count));
                  return (
                    <div key={page}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">{page || "/"}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${Math.round((count / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Searches Tab */}
        {activeTab === "searches" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Destination</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 hidden sm:table-cell">Query</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Style</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Days</th>
                  <th className="text-left py-3 px-5 text-xs font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSearches.map((s, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-5 text-white font-medium">{s.destination}</td>
                    <td className="py-3 px-5 text-gray-400 truncate max-w-xs hidden sm:table-cell">{s.raw_query}</td>
                    <td className="py-3 px-5 text-gray-400 capitalize">{s.travel_style}</td>
                    <td className="py-3 px-5 text-gray-400">{s.duration_days}d</td>
                    <td className="py-3 px-5 text-gray-500 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === "feedback" && (
          <div className="flex flex-col gap-4">
            {data.recentFeedback.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <p className="text-4xl mb-3">💬</p>
                <p>No feedback yet.</p>
              </div>
            ) : data.recentFeedback.map((f, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</span>
                    <span className="text-gray-500 text-xs">{f.destination_searched}</span>
                  </div>
                  <span className="text-gray-600 text-xs">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Recommendations relevant?</span>
                    <p className="text-white">{f.found_relevant ? "✅ Yes" : "❌ No"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Would recommend Waylo?</span>
                    <p className="text-white">{f.would_recommend ? "✅ Yes" : "❌ No"}</p>
                  </div>
                  {f.favourite_feature && (
                    <div>
                      <span className="text-gray-500 text-xs">Favourite feature</span>
                      <p className="text-gray-300">{f.favourite_feature}</p>
                    </div>
                  )}
                  {f.improvement && (
                    <div>
                      <span className="text-gray-500 text-xs">Suggested improvement</span>
                      <p className="text-gray-300">{f.improvement}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
