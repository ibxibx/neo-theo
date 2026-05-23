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
    <header className="flex items-center justify-between px-8 py-5 border-b border-black/[0.05] bg-white/45 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <div className="text-[18px] font-semibold tracking-tight text-ink leading-none">
            <strong className="font-bold">neo-theo</strong>
          </div>
          <div className="text-[11px] text-ink-soft mt-1 tracking-wide">
            Staff Dashboard · hallo theo
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`status-pill ${isCallLive ? "status-pill-live" : "status-pill-idle"}`}>
          {isCallLive ? "Anruf läuft" : "Bereit"}
        </span>
        <ApiStatusPill status={apiStatus} />
        <span className="text-[13px] text-ink-soft font-mono tabular-nums">{time}</span>
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
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ink to-ink/80 flex items-center justify-center shadow-sm">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        {/* Stylized 'N' / signal mark */}
        <path
          d="M5 14V6l5 6V6M14 8v4M14 14h.01"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
