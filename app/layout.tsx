import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waylo — AI Travel Itinerary Planner",
  description: "Describe your dream trip in plain English. Waylo curates 140+ personalised experiences and builds your perfect day-by-day itinerary powered by AI.",
  keywords: ["travel planner", "AI itinerary", "trip planner", "travel recommendations"],
  authors: [{ name: "Waylo" }],
  openGraph: {
    title: "Waylo — AI Travel Itinerary Planner",
    description: "Describe your dream trip in plain English. Waylo curates 140+ personalised experiences and builds your perfect day-by-day itinerary.",
    url: "https://waylo-seven.vercel.app",
    siteName: "Waylo",
    images: [
      {
        url: "https://waylo-seven.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Waylo — AI Travel Itinerary Planner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Waylo — AI Travel Itinerary Planner",
    description: "Describe your dream trip in plain English. Waylo plans your perfect itinerary with AI.",
    images: ["https://waylo-seven.vercel.app/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
