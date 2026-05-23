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
 * iOS Phone-app styled call screen. Closely mirrors Apple's active-call
 * layout: big centered name, status under it, then a 6-button grid above
 * the red end-call (in-call) or a single green answer button (idle).
 */
export function PhoneApp({ tenant, callState, onCallToggle, callDurationSec }: Props) {
  const isLive = callState === "connected" || callState === "connecting";
  const isRinging = callState === "connecting";

  return (
    <div className="h-full flex flex-col bg-white">
      {isLive ? (
        <InCallScreen
          isRinging={isRinging}
          callDurationSec={callDurationSec}
          onEnd={onCallToggle}
        />
      ) : (
        <IdleScreen tenant={tenant} onCall={onCallToggle} />
      )}
    </div>
  );
}

function IdleScreen({ tenant, onCall }: { tenant: Tenant; onCall: () => void }) {
  const firstName = tenant.name.split(" ")[0];
  return (
    <>
      <div className="px-6 pt-1 pb-3 text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#86868b] font-semibold">
          hallo theo
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-10">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] text-white flex items-center justify-center text-[32px] font-semibold tracking-wide shadow-lg mb-5">
          {initials(tenant.name)}
        </div>
        <div className="text-[32px] font-semibold tracking-tight text-black leading-tight">
          {firstName}
        </div>
        <div className="text-[15px] text-[#8e8e93] mt-1.5 font-medium">
          {tenant.building}
        </div>
        <div className="text-[13px] text-[#8e8e93] mt-0.5">
          {tenant.unit} · Vertrag {tenant.contract_nr}
        </div>

        <button
          onClick={onCall}
          className="mt-12 w-[78px] h-[78px] rounded-full bg-[#34c759] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(52,199,89,0.55)] active:scale-95 transition-transform animate-glow_breathe"
          aria-label="Anruf starten"
        >
          <PhoneGlyph variant="answer" />
        </button>
        <div className="mt-4 text-[13px] text-[#8e8e93] font-medium">
          Theo anrufen
        </div>
      </div>

      <div className="px-6 pb-8 pt-2 text-center">
        <div className="text-[11px] text-[#86868b]">
          Vertraulich · Verschlüsselt · DSGVO-konform
        </div>
      </div>
    </>
  );
}

function InCallScreen({
  isRinging,
  callDurationSec,
  onEnd,
}: {
  isRinging: boolean;
  callDurationSec: number;
  onEnd: () => void;
}) {
  return (
    <>
      <div className="pt-8 px-6 text-center">
        <div className="text-[32px] font-semibold tracking-tight text-black leading-tight">
          Theo
        </div>
        <div className="text-[15px] text-[#8e8e93] mt-2 font-medium tabular-nums">
          {isRinging ? "Verbindet …" : formatDuration(callDurationSec)}
        </div>
        <div className="text-[13px] text-[#86868b] mt-0.5">
          hallo theo · Service-Assistent
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-[#34c759]">
          <div className="wave-bars-lg">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
        </div>
      </div>

      <div className="px-8 pb-4">
        <div className="grid grid-cols-3 gap-y-5 justify-items-center">
          <IosButton icon="mute" label="Stumm" />
          <IosButton icon="keypad" label="Tastatur" />
          <IosButton icon="audio" label="Audio" />
          <IosButton icon="add" label="Hinzufügen" />
          <IosButton icon="facetime" label="FaceTime" />
          <IosButton icon="contacts" label="Kontakte" />
        </div>
      </div>

      <div className="px-6 pb-10 flex justify-center">
        <button
          onClick={onEnd}
          className="w-[68px] h-[68px] rounded-full bg-[#ff3b30] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(255,59,48,0.55)] active:scale-95 transition-transform"
          aria-label="Anruf beenden"
        >
          <PhoneGlyph variant="end" />
        </button>
      </div>
    </>
  );
}

function IosButton({
  icon,
  label,
}: {
  icon: "mute" | "keypad" | "audio" | "add" | "facetime" | "contacts";
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-[58px] h-[58px] rounded-full bg-[rgba(118,118,128,0.12)] text-black flex items-center justify-center">
        <IosButtonIcon icon={icon} />
      </div>
      <div className="text-[11px] text-black font-medium">{label}</div>
    </div>
  );
}

function IosButtonIcon({ icon }: { icon: string }) {
  const s = 1.6;
  switch (icon) {
    case "mute":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth={s} />
          <path d="M6 12a6 6 0 0012 0M12 18v3" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
          <path d="M4 4l16 16" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        </svg>
      );
    case "keypad":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="19" cy="5" r="1.6" fill="currentColor" />
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
          <circle cx="5" cy="19" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
          <circle cx="19" cy="19" r="1.6" fill="currentColor" />
        </svg>
      );
    case "audio":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4a6 6 0 016 6v4a6 6 0 01-12 0v-4a6 6 0 016-6z" stroke="currentColor" strokeWidth={s} />
          <path d="M9 11v2M15 11v2" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        </svg>
      );
    case "add":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth={s} />
          <path d="M3.5 19a5.5 5.5 0 0111 0" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
          <path d="M18 8v8M14 12h8" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        </svg>
      );
    case "facetime":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth={s} />
          <path d="M17 10.5l4-2v7l-4-2v-3z" stroke="currentColor" strokeWidth={s} strokeLinejoin="round" />
        </svg>
      );
    case "contacts":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth={s} />
          <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function PhoneGlyph({ variant }: { variant: "answer" | "end" }) {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden>
      <g transform={variant === "answer" ? "rotate(-30 16 16)" : "rotate(135 16 16)"}>
        <path
          fill="currentColor"
          d="M9.36 5.6c-1.5 0-2.84 1.2-2.84 2.83 0 12.05 9.4 21.45 21.45 21.45 1.62 0 2.82-1.33 2.82-2.83v-3.85c0-1.36-.92-2.32-2.23-2.59l-3.92-.78c-1.2-.24-1.92-.02-2.43.48l-1.78 1.78c-2.55-1.27-4.7-3.42-5.97-5.97l1.78-1.78c.5-.5.72-1.23.48-2.43l-.78-3.93c-.27-1.3-1.23-2.22-2.6-2.22H9.37z"
        />
      </g>
    </svg>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("");
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}