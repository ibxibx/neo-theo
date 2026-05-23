"use client";

import { Tenant } from "@/lib/types";
import { CallState } from "./useElevenLabsCall";

type Props = {
  tenant: Tenant;
  callState: CallState;
  onCallToggle: () => void;
  callDurationSec: number;
};

/**
 * The inside of the iPhone — a styled "hallo theo" tenant app
 * with a single, beautiful call button.
 */
export function PhoneApp({ tenant, callState, onCallToggle, callDurationSec }: Props) {
  const isLive = callState === "connected" || callState === "connecting";
  const isRinging = callState === "connecting";

  return (
    <div className="h-full flex flex-col">
      {/* App header */}
      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-soft font-semibold">
              hallo theo
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-ink leading-tight mt-0.5">
              Hi, {tenant.name.split(" ")[0]}
            </div>
          </div>
          <Avatar name={tenant.name} />
        </div>
      </div>

      {/* Tenant context tile */}
      <div className="mx-5 mb-5 p-4 rounded-2xl bg-paper-rail/80 backdrop-blur">
        <div className="flex items-start gap-3">
          <BuildingIcon />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-ink truncate">
              {tenant.building}
            </div>
            <div className="text-[12px] text-ink-soft truncate">
              {tenant.unit} · {tenant.contract_nr}
            </div>
          </div>
        </div>
      </div>

      {/* Main CTA area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        {!isLive && (
          <>
            <div className="text-center mb-8">
              <div className="text-[22px] font-semibold tracking-tight text-ink">
                Brauchen Sie Hilfe?
              </div>
              <div className="text-[14px] text-ink-soft mt-1.5 max-w-[220px] mx-auto">
                Tippen Sie, um mit Theo zu sprechen. Rund um die Uhr.
              </div>
            </div>
            <CallCircleButton state="idle" onClick={onCallToggle} />
            <div className="mt-6 text-[12px] text-ink-subtle">
              Antwort in &lt; 5 Sekunden
            </div>
          </>
        )}

        {isLive && (
          <>
            <div className="text-center mb-6">
              <div className="text-[12px] uppercase tracking-[0.12em] text-ink-soft font-semibold">
                {isRinging ? "Verbinde…" : "Verbunden mit"}
              </div>
              <div className="text-[28px] font-semibold tracking-tight text-ink mt-1">
                Theo
              </div>
              {!isRinging && (
                <div className="text-[15px] text-ink-soft mt-1 font-mono tabular-nums">
                  {formatDuration(callDurationSec)}
                </div>
              )}
            </div>

            {/* Voice waveform */}
            <div className="mb-8 text-accent-green">
              <div className="wave-bars">
                <span /><span /><span /><span /><span />
              </div>
            </div>

            <CallCircleButton state={isRinging ? "ringing" : "active"} onClick={onCallToggle} />

            <div className="mt-6 text-[12px] text-ink-subtle">
              {isRinging ? "Theo nimmt ab…" : "Tippen Sie, um zu beenden"}
            </div>
          </>
        )}
      </div>

      {/* Bottom hint */}
      <div className="px-6 pb-10 pt-2 text-center">
        <div className="text-[11px] text-ink-subtle">
          Vertraulich · Verschlüsselt · DSGVO-konform
        </div>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-accent-indigo text-white flex items-center justify-center text-[14px] font-semibold tracking-wider shadow-sm">
      {initials}
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-ink-soft mt-0.5">
      <rect x="3" y="3" width="16" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h2M13 7h2M7 11h2M13 11h2M7 15h2M13 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CallCircleButton({
  state,
  onClick,
}: {
  state: "idle" | "ringing" | "active";
  onClick: () => void;
}) {
  const isIdle = state === "idle";
  const isActive = state === "active";

  return (
    <button
      onClick={onClick}
      className={[
        "relative w-[120px] h-[120px] rounded-full flex items-center justify-center",
        "transition-all duration-300 active:scale-95",
        isIdle
          ? "bg-accent-green text-white shadow-glow_green animate-glow_breathe"
          : "bg-accent-red text-white shadow-glow_red",
      ].join(" ")}
      aria-label={isIdle ? "Anruf starten" : "Anruf beenden"}
    >
      {isActive && <span className="call-pulse-ring" />}
      <CallIcon variant={isIdle ? "phone" : "end"} />
    </button>
  );
}

function CallIcon({ variant }: { variant: "phone" | "end" }) {
  // Apple-style handset glyph. The path below is the canonical iOS handset
  // (mouthpiece + arc + earpiece), tilted ~30° so it points like an
  // off-hook receiver. It fills ~55% of the circle to match iOS dialler.
  if (variant === "phone") {
    return (
      <svg width="60" height="60" viewBox="0 0 32 32" fill="none" aria-hidden>
        <g transform="rotate(-30 16 16)">
          <path
            fill="currentColor"
            d="M9.36 5.6c-1.5 0-2.84 1.2-2.84 2.83 0 12.05 9.4 21.45 21.45 21.45 1.62 0 2.82-1.33 2.82-2.83v-3.85c0-1.36-.92-2.32-2.23-2.59l-3.92-.78c-1.2-.24-1.92-.02-2.43.48l-1.78 1.78c-2.55-1.27-4.7-3.42-5.97-5.97l1.78-1.78c.5-.5.72-1.23.48-2.43l-.78-3.93c-.27-1.3-1.23-2.22-2.6-2.22H9.37z"
          />
        </g>
      </svg>
    );
  }
  // "End call" — same handset but rotated to point downward (iOS red end-call)
  return (
    <svg width="60" height="60" viewBox="0 0 32 32" fill="none" aria-hidden>
      <g transform="rotate(135 16 16)">
        <path
          fill="currentColor"
          d="M9.36 5.6c-1.5 0-2.84 1.2-2.84 2.83 0 12.05 9.4 21.45 21.45 21.45 1.62 0 2.82-1.33 2.82-2.83v-3.85c0-1.36-.92-2.32-2.23-2.59l-3.92-.78c-1.2-.24-1.92-.02-2.43.48l-1.78 1.78c-2.55-1.27-4.7-3.42-5.97-5.97l1.78-1.78c.5-.5.72-1.23.48-2.43l-.78-3.93c-.27-1.3-1.23-2.22-2.6-2.22H9.37z"
        />
      </g>
    </svg>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
