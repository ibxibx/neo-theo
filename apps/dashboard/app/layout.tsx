import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "neo-theo · Staff Dashboard",
  description:
    "AI voice triage for hallo theo property management. Live during the HalloTheo Hackathon Berlin 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
