import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireIQ — AI Recruitment Assistant",
  description:
    "HireIQ helps recruitment agencies and talent teams shortlist faster with AI-powered candidate reasoning — no keyword farming, no guesswork.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
