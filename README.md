# ✈ Itinerai — AI Travel Itinerary Generator

A free, open-source AI travel planning web app built with Next.js, Gemini AI, and Supabase.
Describe your trip in plain English — Itinerai handles the rest.

**Live demo**: `https://itinerai.vercel.app` _(deploy your own below)_

---

## Features

- **Natural language search** — describe your trip in plain English
- **AI-powered recommendations** — categorised attractions (Casual / Adventure / Fun / Culture) and dining (Fine Dining / Street Food / Cafes)
- **Visual card grid** — checkboxes to build a draft itinerary
- **Drag-and-drop itinerary builder** — reorder, delete, and annotate cards
- **Multi-format export** — PDF, XLSX, PPTX, and DOCX (all client-side)
- **Admin dashboard** — user geo map, search trends, export analytics (protected by NextAuth)
- **100% free to run** — Gemini free tier, Supabase free tier, Vercel free tier

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/ai-travel-app
cd ai-travel-app
npm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

```env
# Gemini AI (free tier: 15 req/min, 1M tokens/day)
# Get key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_key_here

# Supabase (free tier: 500MB, 2 projects)
# Create project at: https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Unsplash (free tier: 50 req/hr)
# Create app at: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your_unsplash_key

# NextAuth — for admin dashboard protection
NEXTAUTH_SECRET=any_random_32_char_string
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth App (for admin login)
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Comma-separated GitHub user IDs allowed to access /admin
ADMIN_GITHUB_IDS=123456,789012
```

### 3. Set Up Supabase Database

Run this SQL in your Supabase SQL editor:

```sql
-- Users (anonymous sessions)
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  country    TEXT,
  city       TEXT,
  lat        FLOAT,
  lng        FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Searches
CREATE TABLE searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  raw_query    TEXT NOT NULL,
  parsed       JSONB,
  destination  TEXT,
  session_id   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Itineraries
CREATE TABLE itineraries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  search_id   UUID REFERENCES searches(id),
  cards       JSONB NOT NULL DEFAULT '[]',
  exported_as TEXT[],
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Events (engagement analytics)
CREATE TABLE events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  type       TEXT,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (users can write their own records)
CREATE POLICY "anon_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_searches" ON searches FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_events" ON events FOR INSERT WITH CHECK (true);
```

### 4. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel at [vercel.com/new](https://vercel.com/new).
Add all environment variables in the Vercel project settings.

---

## Project Structure

```
app/
  page.tsx               # Landing page + NL search bar
  discover/page.tsx      # Tabbed recommendation grid
  itinerary/page.tsx     # Drag-and-drop builder + export
  admin/page.tsx         # Analytics dashboard (protected)
  api/
    parse-query/         # LLM text → structured JSON
    analytics/           # Admin stats from Supabase
components/
  discovery/
    RecommendationCard   # Card with checkbox + image
  admin/
    GeoMap               # Leaflet map (OpenStreetMap)
lib/
  gemini.ts              # Gemini API client
  supabase.ts            # Supabase client
  export/                # PDF, XLSX, PPTX, DOCX exporters
types/
  trip.ts                # TypeScript interfaces
middleware.ts            # /admin auth guard
```

---

## Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Framework | Next.js 14 (App Router) | Free |
| Styling | Tailwind CSS + shadcn/ui | Free |
| AI / LLM | Gemini 1.5 Flash | Free tier |
| Database | Supabase (Postgres) | Free tier |
| Auth | NextAuth.js + GitHub OAuth | Free |
| Images | Unsplash API | Free tier |
| Maps | Leaflet.js + OpenStreetMap | 100% Free |
| Drag & Drop | @dnd-kit | Free |
| Export | jsPDF, SheetJS, pptxgenjs, docx | Free |
| Hosting | Vercel | Free tier |

---

## Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — use freely, attribution appreciated.
