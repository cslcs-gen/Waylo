import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackModal from "@/components/FeedbackModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://waylo-seven.vercel.app"),
  title: "Waylo — AI Travel Itinerary Planner",
  description: "Describe your dream trip in plain English. Waylo curates 140+ personalised experiences and builds your perfect day-by-day itinerary powered by AI.",
  openGraph: {
    title: "Waylo — AI Travel Itinerary Planner",
    description: "Describe your dream trip in plain English. Waylo curates 140+ personalised experiences and builds your perfect day-by-day itinerary powered by AI.",
    url: "https://waylo-seven.vercel.app",
    siteName: "Waylo",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/og-image.png"],
  },
};

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
      <body className="min-h-full flex flex-col">{children}<FeedbackModal /></body>
    </html>
  );
}
