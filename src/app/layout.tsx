import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Screener — Intelligent CV screening",
  description:
    "Upload a job spec and CVs. Get nuanced, reasoning-driven scores powered by Claude — no keyword farming.",
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
