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
      <body className="min-h-screen antialiased">
        {/* Fixed background image — fills viewport at any size, never scrolls.
            Tuned at 50% opacity towards white via the overlay below so the
            photo reads as a soft, branded wash behind the glass cards. */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-20 bg-center bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/background.jpg')" }}
        />
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-white/50"
        />
        {children}
      </body>
    </html>
  );
}
