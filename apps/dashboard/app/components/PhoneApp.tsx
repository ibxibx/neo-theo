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
          className="mt-12 w-[72px] h-[72px] rounded-full bg-[#34c759] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(52,199,89,0.55)] active:scale-95 transition-transform animate-glow_breathe"
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
  // iOS Phone-app in-call layout, turquoise-teal background, white text.
  // Single end-call button with iOS-precise proportions:
  //   circle: 72px diameter
  //   handset icon: 32px (= 44% of circle, matching iOS dialer)
  //   tilt: 135deg clockwise (the canonical "end-call" angle)
  return (
    <div className="absolute inset-0 bg-[#5ac8fa] flex flex-col text-white">
      {/* Header: large name, timer, subtitle */}
      <div className="pt-10 px-6 text-center">
        <div className="text-[34px] font-semibold tracking-tight leading-tight">
          Theo
        </div>
        <div className="text-[16px] mt-2 font-medium tabular-nums opacity-90">
          {isRinging ? "Verbindet …" : formatDuration(callDurationSec)}
        </div>
        <div className="text-[13px] mt-1 opacity-75">
          hallo theo · Service-Assistent
        </div>
      </div>

      {/* Middle: voice activity waveform, white on teal */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/95">
          <div className="wave-bars-lg">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
        </div>
      </div>

      {/* End-call button: iOS-precise (72px circle, 32px icon at -135deg) */}
      <div className="px-6 pb-14 flex flex-col items-center">
        <button
          onClick={onEnd}
          className="w-[72px] h-[72px] rounded-full bg-[#ff3b30] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25)] active:scale-95 transition-transform"
          aria-label="Anruf beenden"
        >
          <PhoneGlyph variant="end" />
        </button>
        <div className="mt-3 text-[13px] text-white/85 font-medium">
          Anruf beenden
        </div>
      </div>
    </div>
  );
}

function PhoneGlyph({ variant }: { variant: "answer" | "end" }) {
  // Apple iOS handset glyph. The path below is sized to fill a 32×32 viewBox
  // edge-to-edge (the original Apple handset is ~24×24 in its own bounding
  // box; we use a 32px viewBox with no padding so the icon visually fills
  // ~85% of the parent button — giving the Apple ~45% icon-to-circle ratio
  // when rendered inside a 72px circle.
  //
  // The transform is the iconic iOS dial-pad tilt:
  //   answer = rotate(-30deg)  — handset coming up "off-hook"
  //   end    = rotate(135deg)  — handset coming down to hang up
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
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