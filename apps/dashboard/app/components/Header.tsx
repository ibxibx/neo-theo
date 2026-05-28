"use client";

import { useEffect, useState } from "react";

type Props = {
  apiStatus: "ok" | "degraded" | "offline";
  isCallLive: boolean;
};

export function Header({ apiStatus, isCallLive }: Props) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const id = setInterval(update, 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-black/[0.05] bg-white/45 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <Logo />
        <div className="min-w-0">
          <div className="text-[16px] sm:text-[18px] font-semibold tracking-tight text-ink leading-none truncate">
            <strong className="font-bold">neo-theo</strong>
          </div>
          <div className="text-[11px] text-ink-soft mt-1 tracking-wide truncate">
            Staff Dashboard · hallo theo
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span className={`status-pill ${isCallLive ? "status-pill-live" : "status-pill-idle"}`}>
          {isCallLive ? "Anruf läuft" : "Bereit"}
        </span>
        <ApiStatusPill status={apiStatus} />
        <span className="hidden sm:inline text-[13px] text-ink-soft font-mono tabular-nums">{time}</span>
      </div>
    </header>
  );
}

function ApiStatusPill({ status }: { status: "ok" | "degraded" | "offline" }) {
  const map = {
    ok:       { label: "API",      cls: "text-accent-green bg-accent-green/10" },
    degraded: { label: "API ↘",    cls: "text-accent-orange bg-accent-orange/10" },
    offline:  { label: "API offline", cls: "text-accent-red bg-accent-red/10" },
  } as const;
  const m = map[status];
  return (
    <span className={`status-pill ${m.cls}`}>{m.label}</span>
  );
}

function Logo() {
  // neo-theo brand mark — circuit-house with key (tenant access / peace of mind)
  // and a small green ascending arrow (the "5-year vision" growth motif from the brand image).
  // Inline SVG so it renders crisp at any DPI and inherits no external asset.
  return (
    <div
      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ring-1 ring-black/[0.06]"
      aria-label="neo-theo"
      role="img"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ntHouse" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3DD9E8" />
            <stop offset="0.55" stopColor="#1E6FE0" />
            <stop offset="1" stopColor="#1A3A8F" />
          </linearGradient>
        </defs>

        {/* House silhouette */}
        <path
          d="M16 4 L27 12 V26 H5 V12 Z"
          fill="url(#ntHouse)"
        />

        {/* Circuit accent traces — left side */}
        <path d="M7 15 H10 M7 19 H10 M7 23 H10" stroke="#9FE9F2" strokeWidth="0.75" strokeLinecap="round" opacity="0.85" />
        {/* Circuit accent traces — right side */}
        <path d="M22 15 H25 M22 19 H25 M22 23 H25" stroke="#9FE9F2" strokeWidth="0.75" strokeLinecap="round" opacity="0.85" />

        {/* Key — head (circle) */}
        <circle cx="16" cy="14.5" r="2.6" fill="none" stroke="#E8F9FF" strokeWidth="1.4" />
        <circle cx="16" cy="14.5" r="0.9" fill="#E8F9FF" />
        {/* Key — shaft + teeth */}
        <path d="M16 17.1 V23 M14.5 21 H16 M14.5 22.4 H16" stroke="#E8F9FF" strokeWidth="1.4" strokeLinecap="round" />

        {/* Green growth arrow — bottom-right, the "neo" forward motif */}
        <path
          d="M21 26 L26 21 M23 21 H26 V24"
          stroke="#3DE07A"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
