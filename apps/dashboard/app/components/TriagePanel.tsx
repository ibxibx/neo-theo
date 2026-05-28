"use client";

import { TriageResult, Urgency, ActionClass } from "@/lib/types";

type Props = {
  triage: TriageResult | null;
  /** True if the call has ended but classification hasn't come back yet */
  classifying: boolean;
};

// ---------------------------------------------------------------------------
// Urgency: ranked severity (1-4), color, label, SLA (response window).
// The SLA mirrors docs/URGENCY_RULES.md and Jan's "peace of mind" framing —
// staff need to know in one glance how soon they must act.
// ---------------------------------------------------------------------------
const URGENCY_META: Record<Urgency, {
  level: number;          // 1 (LOW) → 4 (EMERGENCY) — drives the severity bar
  bg: string;
  text: string;
  ring: string;
  bar: string;            // bar color
  label: string;
  sla: string;            // human SLA target
  slaShort: string;       // compact SLA badge
}> = {
  LOW:       { level: 1, bg: "bg-accent-green/10",  text: "text-accent-green",  ring: "ring-accent-green/30",  bar: "bg-accent-green",  label: "Niedrige Dringlichkeit", sla: "Antwort innerhalb 24 Stunden", slaShort: "≤ 24h" },
  MEDIUM:    { level: 2, bg: "bg-accent-orange/10", text: "text-accent-orange", ring: "ring-accent-orange/30", bar: "bg-accent-orange", label: "Mittlere Dringlichkeit", sla: "Antwort innerhalb 8 Stunden",  slaShort: "≤ 8h"  },
  HIGH:      { level: 3, bg: "bg-accent-red/10",    text: "text-accent-red",    ring: "ring-accent-red/30",    bar: "bg-accent-red",    label: "Hohe Dringlichkeit",      sla: "Antwort innerhalb 1 Stunde",   slaShort: "≤ 1h"  },
  EMERGENCY: { level: 4, bg: "bg-accent-red/15",    text: "text-accent-red",    ring: "ring-accent-red/40",    bar: "bg-accent-red",    label: "Notfall",                  sla: "Sofort-Dispatch · < 15 Min",   slaShort: "< 15 min" },
};

const ACTION_LABELS: Record<ActionClass, string> = {
  AUTO_RESOLVE:       "Auto-Lösung (DIY)",
  SERVICER_QUEUE:     "Servicer-Queue",
  PROPERTY_MANAGER:   "Verwalter",
  OWNER_APPROVAL:     "Eigentümer-Freigabe",
  EMERGENCY_DISPATCH: "Notfall-Dispatch",
};

const ACTION_DESCRIPTIONS: Record<ActionClass, string> = {
  AUTO_RESOLVE:       "DIY-Anleitung wird per bevorzugtem Kanal verschickt.",
  SERVICER_QUEUE:     "Ticket in der Generalisten-Queue.",
  PROPERTY_MANAGER:   "Direkt an den zuständigen Verwalter.",
  OWNER_APPROVAL:     "Zustimmung der Eigentümer wird per One-Tap-Link eingeholt.",
  EMERGENCY_DISPATCH: "Paralleler Versand: Handwerker + Verwalter + Eigentümer.",
};

const LANGUAGE_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  tr: "Türkisch",
  pl: "Polnisch",
  ar: "Arabisch",
};

export function TriagePanel({ triage, classifying }: Props) {
  if (!triage && !classifying) {
    // Empty state — staff are looking at this while the call is still in
    // progress (or before it starts). Rather than a generic "waiting" card,
    // we surface a preview of every section that will materialize in real
    // time once Claude classifies the transcript. This sets expectations
    // ("here is exactly what I'm about to see") and doubles as a feature
    // walkthrough for first-time viewers / hackathon judges.
    return (
      <div className="card p-6 h-full flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-paper-rail flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-ink-subtle"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink leading-tight">
              Triage wartet
            </div>
            <div className="text-[12px] text-ink-soft leading-snug mt-0.5">
              Klassifizierung erscheint live, sobald der Anruf endet.
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-black/[0.06]" />

        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-3">
          Was hier gleich erscheint
        </div>

        <ul className="space-y-2.5 text-[12.5px] text-ink-soft leading-snug">
          <PreviewItem
            n={1}
            title="Situation"
            body="Ein-Satz-Zusammenfassung des Anliegens · Uhrzeit des Anrufendes."
          />
          <PreviewItem
            n={2}
            title="Dringlichkeit & SLA"
            body="LOW · MEDIUM · HIGH · EMERGENCY mit Severity-Bar und Antwort­fenster (24 h → < 15 min)."
          />
          <PreviewItem
            n={3}
            title="Nächste Aktion & Routing"
            body="Aktions­klasse (Auto-Lösung · Servicer-Queue · Verwalter · Eigentümer-Freigabe · Notfall-Dispatch) plus Claudes Begründung."
          />
          <PreviewItem
            n={4}
            title="Details"
            body="Kategorie · Konfidenz · Kosten-Bucket · Tonfall des Mieters · erkannte Sprache."
          />
          <PreviewItem
            n={5}
            title="Wissens-Erfassung"
            body="Strategischer Flag: falls aktiv, wird tested knowledge nach Lösung in die Objekt-Wissensbasis geschrieben."
          />
          <PreviewItem
            n={6}
            title="Stichwörter"
            body="Extrahierte Entitäten für KB-Matching und spätere Suche."
          />
        </ul>

        <div className="mt-5 pt-4 border-t border-black/[0.06] text-[11px] text-ink-subtle leading-snug">
          Sobald der Mieter auflegt, postet das Dashboard das Transkript an{" "}
          <span className="font-mono text-ink-soft">/triage</span> — Claude Sonnet 4.6
          klassifiziert in ~2&nbsp;s, dann erscheint zusätzlich der Dispatch-Block
          mit Handwerker, Termin und Bestätigungs-E-Mail.
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
  const t = triage!;
  const u = URGENCY_META[t.urgency];
  const confPct = Math.round(t.confidence * 100);
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="card p-6 h-full overflow-y-auto scroll-soft">
      {/* ===========================================================
          SECTION 1 · SITUATION
          What is happening + one-line summary + when the call ended.
          This is what a staff member glances at first.
         =========================================================== */}
      <div className="reveal">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
            Situation · Triage von Claude
          </div>
          <div className="text-[10px] tracking-wider text-ink-subtle font-mono">
            {timeLabel}
          </div>
        </div>
        <p className="mt-2 text-[15px] leading-snug text-ink font-medium">
          {t.summary}
        </p>
      </div>

      <Divider />

      {/* ===========================================================
          SECTION 2 · CLASSIFICATION
          Urgency banner (full width, severity bar, SLA target)
          + the most decision-critical metadata to its right.
         =========================================================== */}
      <div className="reveal reveal-1">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-3">
          Klassifizierung
        </div>

        {/* Urgency hero — full-width banner with severity bar */}
        <div className={`rounded-2xl ${u.bg} ring-1 ${u.ring} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-[26px] leading-none font-semibold tracking-tight ${u.text} flex items-center gap-2`}>
                {t.urgency}
                {t.urgency === "EMERGENCY" && (
                  <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                )}
              </div>
              <div className="text-[12px] text-ink-soft mt-1.5">{u.label}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-ink-subtle">
                SLA
              </div>
              <div className={`mt-1 text-[14px] font-semibold ${u.text} whitespace-nowrap`}>
                {u.slaShort}
              </div>
              <div className="text-[10px] text-ink-soft mt-0.5">{u.sla}</div>
            </div>
          </div>

          {/* Severity bar: 4 segments, fills up to current level */}
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full ${step <= u.level ? u.bar : "bg-paper-rail"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <Divider />

      {/* ===========================================================
          SECTION 3 · NEXT ACTION
          What the system is about to do + WHY (Claude's reasoning).
          Yellow-page rule: if you read only this section, you know
          what's happening and why.
         =========================================================== */}
      <div className="reveal reveal-2">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-3">
          Nächste Aktion · Routing
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[18px] font-semibold tracking-tight text-ink leading-tight">
            {ACTION_LABELS[t.action_class]}
          </div>
          {t.needs_owner_approval && (
            <span className="status-pill bg-accent-indigo/10 text-accent-indigo whitespace-nowrap">
              Eigentümer-Freigabe nötig
            </span>
          )}
        </div>
        <div className="text-[12px] text-ink-soft mt-1 leading-snug">
          {ACTION_DESCRIPTIONS[t.action_class]}
        </div>

        {/* Reasoning — the analytical "why" — visually subordinate to the
            summary at the top, but expanded enough to actually read. */}
        <div className="mt-3 p-3.5 rounded-xl bg-paper-rail/70 ring-1 ring-black/[0.03]">
          <div className="text-[9px] font-semibold tracking-[0.16em] uppercase text-ink-subtle mb-1.5">
            Begründung
          </div>
          <p className="text-[12.5px] text-ink leading-relaxed">{t.reasoning}</p>
        </div>
      </div>

      <Divider />

      {/* ===========================================================
          SECTION 4 · METADATA
          Two-column grid of the supporting metadata fields.
          Order: category → confidence → cost → tone → language.
         =========================================================== */}
      <div className="reveal reveal-3">
        <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-3">
          Details
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Meta label="Kategorie" value={t.category} mono />
          <Meta
            label="Konfidenz"
            value={`${confPct}%`}
            hint={confPct >= 85 ? "hoch" : confPct >= 70 ? "moderat" : "niedrig"}
          />
          <Meta
            label="Kosten ca."
            value={
              t.estimated_cost_eur_bucket && t.estimated_cost_eur_bucket !== "unknown"
                ? `€ ${t.estimated_cost_eur_bucket}`
                : "—"
            }
          />
          <Meta
            label="Tonfall Mieter"
            value={t.tenant_emotional_state ? emotionLabel(t.tenant_emotional_state) : "—"}
          />
          {t.language_detected && (
            <Meta
              label="Sprache erkannt"
              value={LANGUAGE_NAMES[t.language_detected] || t.language_detected.toUpperCase()}
            />
          )}
        </div>
      </div>

      {/* ===========================================================
          SECTION 5 · KNOWLEDGE CAPTURE (conditional)
          The strategic feature Jan called out. Shown only when the
          flag is true, but visually distinct because it's a
          differentiator we want judges to clock.
         =========================================================== */}
      {t.knowledge_capture_required && (
        <>
          <Divider />
          <div className="reveal reveal-4">
            <div className="p-4 rounded-2xl bg-accent-indigo/8 border border-accent-indigo/15">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h10a1 1 0 011 1v10a1 1 0 01-1 1H4l-3 1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" className="text-accent-indigo" />
                    <path d="M5 6h5M5 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent-indigo" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-accent-indigo">
                    Strategische Aktion · Wissens-Erfassung
                  </div>
                  <div className="text-[13px] font-semibold text-ink mt-1">
                    Tested Knowledge nach Lösung erfassen
                  </div>
                  <div className="text-[12px] text-ink-soft mt-1 leading-snug">
                    Nach Lösung wird der Verwalter gebeten, das &bdquo;tested knowledge&ldquo; in
                    die Objekt-Wissensbasis zu schreiben — so wandert das Wissen aus
                    den Köpfen der PMs in die Plattform.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===========================================================
          SECTION 6 · KEYWORDS / SEARCH FACETS
          Extracted entities; useful for search and KB matching.
         =========================================================== */}
      {t.keywords && t.keywords.length > 0 && (
        <>
          <Divider />
          <div className="reveal reveal-5">
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle mb-2.5">
              Extrahierte Stichwörter
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-[11px] px-2 py-1 rounded-md bg-paper-rail text-ink-soft font-mono"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function Divider() {
  return <div className="my-5 h-px bg-black/[0.06]" />;
}

function PreviewItem({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-paper-rail text-ink-soft text-[10px] font-semibold flex items-center justify-center mt-0.5 tabular-nums">
        {n}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink leading-tight">
          {title}
        </div>
        <div className="text-[12px] text-ink-soft mt-0.5 leading-snug">
          {body}
        </div>
      </div>
    </li>
  );
}

function Meta({
  label,
  value,
  mono,
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`text-[15px] font-medium text-ink ${mono ? "font-mono" : ""}`}>
          {value}
        </div>
        {hint && (
          <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function emotionLabel(e: string) {
  return (
    {
      calm:        "Ruhig",
      frustrated:  "Frustriert",
      scared:      "Ängstlich",
      distressed:  "In Not",
      grieving:    "Trauernd",
      unclear:     "Unklar",
    }[e] || e
  );
}
