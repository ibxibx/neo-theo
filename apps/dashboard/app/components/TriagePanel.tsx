"use client";

import { TriageResult, Urgency, ActionClass } from "@/lib/types";

type Props = {
  triage: TriageResult | null;
  /** True if the call has ended but classification hasn't come back yet */
  classifying: boolean;
};

const URGENCY_COLORS: Record<Urgency, { bg: string; text: string; ring: string; label: string }> = {
  LOW:       { bg: "bg-accent-green/10",  text: "text-accent-green",  ring: "ring-accent-green/30",  label: "Niedrige Dringlichkeit" },
  MEDIUM:    { bg: "bg-accent-orange/10", text: "text-accent-orange", ring: "ring-accent-orange/30", label: "Mittlere Dringlichkeit" },
  HIGH:      { bg: "bg-accent-red/10",    text: "text-accent-red",    ring: "ring-accent-red/30",    label: "Hohe Dringlichkeit" },
  EMERGENCY: { bg: "bg-accent-red/15",    text: "text-accent-red",    ring: "ring-accent-red/40",    label: "Notfall" },
};

const ACTION_LABELS: Record<ActionClass, string> = {
  AUTO_RESOLVE: "Auto-Lösung (DIY)",
  SERVICER_QUEUE: "Servicer-Queue",
  PROPERTY_MANAGER: "Verwalter",
  OWNER_APPROVAL: "Eigentümer-Freigabe",
  EMERGENCY_DISPATCH: "Notfall-Dispatch",
};

const ACTION_DESCRIPTIONS: Record<ActionClass, string> = {
  AUTO_RESOLVE: "DIY-Anleitung wird per bevorzugtem Kanal verschickt.",
  SERVICER_QUEUE: "Ticket in der Generalisten-Queue. SLA: 8h.",
  PROPERTY_MANAGER: "Direkt an den zuständigen Verwalter. SLA: 24h.",
  OWNER_APPROVAL: "Zustimmung der Eigentümer wird per One-Tap-Link eingeholt.",
  EMERGENCY_DISPATCH: "Paralleler Versand: Handwerker + Verwalter + Eigentümer.",
};

export function TriagePanel({ triage, classifying }: Props) {
  if (!triage && !classifying) {
    return (
      <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-paper-rail mb-4 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" stroke="currentColor" strokeWidth="1.5" className="text-ink-subtle" />
          </svg>
        </div>
        <div className="text-[15px] font-medium text-ink">Triage wartet</div>
        <div className="text-[13px] text-ink-soft mt-1 max-w-[240px]">
          Klassifizierung erscheint, sobald der Anruf endet.
        </div>
      </div>
    );
  }

  if (classifying) {
    return (
      <div className="card card-active-indigo p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-accent-indigo/10 mb-4 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
        </div>
        <div className="text-[15px] font-medium text-ink">Claude analysiert…</div>
        <div className="text-[13px] text-ink-soft mt-1 max-w-[240px]">
          Sonnet 4.6 erstellt die Triage-Klassifikation.
        </div>
      </div>
    );
  }

  // triage is non-null here
  const u = URGENCY_COLORS[triage!.urgency];
  const confPct = Math.round(triage!.confidence * 100);

  return (
    <div className="card p-6 h-full overflow-y-auto scroll-soft">
      {/* Urgency hero */}
      <div className="reveal">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
          Dringlichkeit
        </div>
        <div className={`mt-2 inline-flex items-center gap-3 px-5 py-3 rounded-2xl ${u.bg} ring-1 ${u.ring}`}>
          <span className={`text-[28px] font-semibold tracking-tight ${u.text}`}>
            {triage!.urgency}
          </span>
          {triage!.urgency === "EMERGENCY" && (
            <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          )}
        </div>
        <div className="text-[12px] text-ink-soft mt-2">{u.label}</div>
      </div>

      {/* Action class */}
      <div className="mt-6 reveal reveal-1">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
          Routing
        </div>
        <div className="mt-2 text-[20px] font-semibold tracking-tight text-ink">
          {ACTION_LABELS[triage!.action_class]}
        </div>
        <div className="text-[13px] text-ink-soft mt-1 leading-snug">
          {ACTION_DESCRIPTIONS[triage!.action_class]}
        </div>
      </div>

      {/* Category + cost + confidence row */}
      <div className="mt-6 grid grid-cols-2 gap-3 reveal reveal-2">
        <Meta label="Kategorie" value={triage!.category} mono />
        <Meta label="Konfidenz" value={`${confPct}%`} />
        {triage!.estimated_cost_eur_bucket && triage!.estimated_cost_eur_bucket !== "unknown" && (
          <Meta label="Kosten ca." value={`€ ${triage!.estimated_cost_eur_bucket}`} />
        )}
        {triage!.tenant_emotional_state && (
          <Meta label="Tonfall" value={emotionLabel(triage!.tenant_emotional_state)} />
        )}
      </div>

      {/* Reasoning */}
      <div className="mt-6 p-4 rounded-2xl bg-paper-rail/80 reveal reveal-3">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-2">
          Begründung
        </div>
        <p className="text-[13px] text-ink leading-relaxed">{triage!.reasoning}</p>
      </div>

      {/* Knowledge capture flag (the strategic killer feature) */}
      {triage!.knowledge_capture_required && (
        <div className="mt-4 p-4 rounded-2xl bg-accent-indigo/8 border border-accent-indigo/15 reveal reveal-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h10a1 1 0 011 1v10a1 1 0 01-1 1H4l-3 1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" className="text-accent-indigo" />
                <path d="M5 6h5M5 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent-indigo" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-ink">
                Wissens-Erfassung erforderlich
              </div>
              <div className="text-[12px] text-ink-soft mt-1 leading-snug">
                Nach Lösung wird der Verwalter gebeten, das &bdquo;tested knowledge&ldquo; in
                die Objekt-Wissensbasis zu schreiben.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {triage!.keywords && triage!.keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 reveal reveal-5">
          {triage!.keywords.map((kw) => (
            <span
              key={kw}
              className="text-[11px] px-2 py-1 rounded-md bg-paper-rail text-ink-soft font-mono"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
        {label}
      </div>
      <div className={`mt-1 text-[15px] font-medium text-ink ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function emotionLabel(e: string) {
  return (
    {
      calm: "Ruhig",
      frustrated: "Frustriert",
      scared: "Ängstlich",
      distressed: "In Not",
      grieving: "Trauernd",
      unclear: "Unklar",
    }[e] || e
  );
}
