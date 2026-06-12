import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ReelRag — AI Video Content Analyzer",
  description:
    "Compare public videos from YouTube, Instagram, TikTok and Twitter using RAG-powered AI. Get engagement insights, transcript analysis, and creator comparisons.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
