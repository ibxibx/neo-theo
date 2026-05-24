"use client";

import { useEffect, useState } from "react";
import { Tenant, TriageResult } from "@/lib/types";

type Props = {
  triage: TriageResult | null;
  tenant: Tenant | null;
};

/**
 * The "wow" moment of the demo.
 *
 * After triage arrives, this panel renders the FULL dispatch sequence:
 *   1. Vendor selection (category-matched, with reputation + ETA)
 *   2. Simulated outbound call: Ringing -> Connected -> Negotiated
 *   3. Appointment confirmed (price, time, vendor)
 *   4. Confirmation email to tenant (full preview, "Sent" stamp)
 *
 * Per docs/WYNAND_FEEDBACK.md the dispatch is visually simulated, no
 * real telephony - exactly what we promise in the README.
 */
export function DispatchPanel({ triage, tenant }: Props) {
  if (!triage || !tenant) return null;

  const vendor = pickVendor(triage.category);
  const appointment = computeAppointment(triage.urgency);
  const price = computePrice(triage.category, triage.urgency, triage.estimated_cost_eur_bucket);

  return (
    <DispatchSequence
      key={`${triage.summary}-${vendor.name}`}
      vendor={vendor}
      appointment={appointment}
      price={price}
      triage={triage}
      tenant={tenant}
    />
  );
}

type Stage = "selecting" | "ringing" | "connected" | "negotiating" | "booked" | "email_sending" | "email_sent";

const STAGE_ORDER: Stage[] = [
  "selecting",
  "ringing",
  "connected",
  "negotiating",
  "booked",
  "email_sending",
  "email_sent",
];

const STAGE_DURATIONS: Record<Stage, number> = {
  selecting: 1100,
  ringing: 1700,
  connected: 1100,
  negotiating: 1500,
  booked: 1300,
  email_sending: 1100,
  email_sent: 0,
};

function DispatchSequence({
  vendor,
  appointment,
  price,
  triage,
  tenant,
}: {
  vendor: Vendor;
  appointment: { dateLabel: string; timeLabel: string };
  price: { amount: number; pretty: string };
  triage: TriageResult;
  tenant: Tenant;
}) {
  const [stage, setStage] = useState<Stage>("selecting");

  useEffect(() => {
    setStage("selecting");
    const timers: ReturnType<typeof setTimeout>[] = [];
    let acc = 0;
    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      acc += STAGE_DURATIONS[STAGE_ORDER[i]];
      const next = STAGE_ORDER[i + 1];
      timers.push(setTimeout(() => setStage(next), acc));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const stageIdx = STAGE_ORDER.indexOf(stage);
  const reached = (s: Stage) => STAGE_ORDER.indexOf(s) <= stageIdx;
  const isLive = stage === "ringing" || stage === "connected" || stage === "negotiating";

  return (
    <div className={`card p-6 h-full overflow-y-auto scroll-soft ${isLive ? "card-active-green" : ""}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
            Dispatch
          </div>
          <div className="mt-1 text-[18px] font-semibold tracking-tight text-ink">
            {stage === "email_sent" ? "Termin bestätigt" : "Handwerker wird beauftragt…"}
          </div>
        </div>
        {stage === "email_sent" && (
          <span className="status-pill bg-accent-green/10 text-accent-green">Abgeschlossen</span>
        )}
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-paper-rail/70 ring-1 ring-black/[0.04]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo text-white flex items-center justify-center text-[14px] font-semibold flex-shrink-0">
            {vendor.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-ink leading-snug">{vendor.name}</div>
            <div className="text-[12px] text-ink-soft mt-0.5">
              {vendor.trade} · {vendor.district}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] text-accent-orange">★ {vendor.rating.toFixed(1)}</span>
              <span className="text-[11px] text-ink-subtle">·</span>
              <span className="text-[11px] text-ink-soft">{vendor.jobs} Aufträge</span>
              <span className="text-[11px] text-ink-subtle">·</span>
              <span className="text-[11px] text-ink-soft font-mono">{vendor.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-2xl bg-white ring-1 ring-black/[0.06]">
        <div className="flex items-center gap-3">
          <CallStateGlyph stage={stage} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-ink leading-tight">{callStateLabel(stage)}</div>
            <div className="text-[11px] text-ink-soft mt-0.5">
              {callStateDetail(stage, vendor, price, appointment)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {STAGE_ORDER.slice(1, -1).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                STAGE_ORDER.indexOf(s) <= stageIdx ? "bg-accent-green" : "bg-paper-rail"
              }`}
            />
          ))}
        </div>
      </div>

      {reached("booked") && (
        <div className="mt-4 p-4 rounded-2xl bg-accent-green/8 border border-accent-green/20 reveal">
          <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-accent-green mb-2">
            Termin gebucht
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum" value={appointment.dateLabel} />
            <Field label="Uhrzeit" value={appointment.timeLabel} />
            <Field label="Adresse" value={`${tenant.building}, Wohnung ${tenant.unit}`} />
            <Field label="Preis (geschätzt)" value={price.pretty} mono />
          </div>
        </div>
      )}

      {reached("email_sending") && (
        <div className="mt-4 reveal">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">
              Bestätigungs-E-Mail
            </div>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                stage === "email_sent" ? "text-accent-green" : "text-ink-soft"
              }`}
            >
              {stage === "email_sent" ? "✓ Gesendet" : "Wird gesendet…"}
            </span>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/[0.06] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-black/[0.05] bg-paper-rail/40">
              <div className="text-[11px] text-ink-soft">
                An: <span className="text-ink font-medium">{tenant.email || `${tenant.name.toLowerCase().replace(" ", ".")}@example.com`}</span>
              </div>
              <div className="text-[11px] text-ink-soft">
                Betreff: <span className="text-ink font-medium">Ihr Termin mit {vendor.name} — {appointment.dateLabel}, {appointment.timeLabel}</span>
              </div>
            </div>
            <div className="px-4 py-3 text-[12px] text-ink leading-relaxed">
              <p>Sehr geehrte/r {tenant.name.split(" ")[0]},</p>
              <p className="mt-2">
                vielen Dank für Ihren Anruf. Wir haben Ihren Auftrag <span className="font-medium">„{shortenCategory(triage.category)}"</span> direkt an einen geprüften Handwerker weitergeleitet:
              </p>
              <ul className="mt-2 pl-4 list-disc space-y-0.5">
                <li><span className="font-medium">{vendor.name}</span> ({vendor.trade})</li>
                <li>Termin: <span className="font-medium">{appointment.dateLabel}, {appointment.timeLabel}</span></li>
                <li>Anschrift: {tenant.building}, Wohnung {tenant.unit}</li>
                <li>Geschätzter Preis: <span className="font-mono">{price.pretty}</span></li>
              </ul>
              <p className="mt-2">
                Der Handwerker meldet sich 30 Minuten vor Ankunft. Bei Rückfragen antworten Sie einfach auf diese E-Mail.
              </p>
              <p className="mt-2 text-ink-soft">
                Mit freundlichen Grüßen,<br />
                Theo · hallo theo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function callStateLabel(stage: Stage): string {
  switch (stage) {
    case "selecting":     return "Passenden Handwerker auswählen…";
    case "ringing":       return "Anruf läuft…";
    case "connected":     return "Verbunden";
    case "negotiating":   return "Preis & Termin verhandeln…";
    case "booked":        return "Termin bestätigt";
    case "email_sending": return "Bestätigung wird versendet…";
    case "email_sent":    return "Mieter informiert";
  }
}

function callStateDetail(
  stage: Stage,
  vendor: Vendor,
  price: { pretty: string },
  appt: { dateLabel: string; timeLabel: string }
): string {
  switch (stage) {
    case "selecting":     return "Vergleich mit 3 Anbietern nach Kategorie + Bewertung + ETA";
    case "ringing":       return vendor.phone;
    case "connected":     return `${vendor.name} hat geantwortet`;
    case "negotiating":   return "Brief: Tropfender Wasserhahn · Verfügbarkeit + Preis abfragen";
    case "booked":        return `${appt.dateLabel}, ${appt.timeLabel} · ${price.pretty}`;
    case "email_sending": return "An den Mieter via bevorzugtem Kanal";
    case "email_sent":    return "Workflow abgeschlossen · Audit-Log in Supabase";
  }
}

function CallStateGlyph({ stage }: { stage: Stage }) {
  if (stage === "ringing") {
    return (
      <div className="w-10 h-10 rounded-full bg-accent-green/15 flex items-center justify-center relative">
        <span className="absolute inset-0 rounded-full bg-accent-green/20 animate-ping" />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="relative">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" fill="#34c759" />
        </svg>
      </div>
    );
  }
  if (stage === "connected" || stage === "negotiating") {
    return (
      <div className="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" fill="white" />
        </svg>
      </div>
    );
  }
  if (stage === "booked" || stage === "email_sending" || stage === "email_sent") {
    return (
      <div className="w-10 h-10 rounded-full bg-accent-green flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-accent-indigo/15 flex items-center justify-center">
      <div className="w-4 h-4 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
    </div>
  );
}

type Vendor = {
  name: string;
  initials: string;
  trade: string;
  district: string;
  rating: number;
  jobs: number;
  phone: string;
  basePriceEur: number;
};

const VENDORS_BY_CATEGORY: Record<string, Vendor> = {
  plumbing: {
    name: "Müller Klempnerei GmbH",
    initials: "MK",
    trade: "Sanitär · Notdienst 24/7",
    district: "Kreuzberg",
    rating: 4.8,
    jobs: 1247,
    phone: "+49 30 4581 2200",
    basePriceEur: 180,
  },
  heating: {
    name: "Berliner Heizungsbau KG",
    initials: "BH",
    trade: "Heizung · Wärmepumpe",
    district: "Mitte",
    rating: 4.7,
    jobs: 892,
    phone: "+49 30 2841 9900",
    basePriceEur: 240,
  },
  electrical: {
    name: "Schmidt Elektrotechnik",
    initials: "SE",
    trade: "Elektro · Notdienst",
    district: "Neukölln",
    rating: 4.9,
    jobs: 1583,
    phone: "+49 30 6177 4500",
    basePriceEur: 195,
  },
  appliance: {
    name: "Hoffmann Hausgeräte",
    initials: "HH",
    trade: "Hausgeräte · Reparatur",
    district: "Charlottenburg",
    rating: 4.6,
    jobs: 654,
    phone: "+49 30 3122 8800",
    basePriceEur: 140,
  },
  locksmith: {
    name: "Schlüsseldienst Berlin Nord",
    initials: "SB",
    trade: "Schlüssel · Schloss · 24/7",
    district: "Wedding",
    rating: 4.5,
    jobs: 2103,
    phone: "+49 30 4499 0100",
    basePriceEur: 120,
  },
  general: {
    name: "Schneider Hausmeisterservice",
    initials: "SH",
    trade: "Allgemeine Reparaturen",
    district: "Friedrichshain",
    rating: 4.7,
    jobs: 980,
    phone: "+49 30 2900 6611",
    basePriceEur: 110,
  },
};

function pickVendor(category: string): Vendor {
  const c = (category || "").toLowerCase();
  if (c.includes("plumb") || c.includes("sanitär") || c.includes("wasser") || c.includes("leak") || c.includes("rohr")) return VENDORS_BY_CATEGORY.plumbing;
  if (c.includes("heat") || c.includes("heiz") || c.includes("therme")) return VENDORS_BY_CATEGORY.heating;
  if (c.includes("electr") || c.includes("elektr") || c.includes("strom") || c.includes("licht")) return VENDORS_BY_CATEGORY.electrical;
  if (c.includes("appliance") || c.includes("gerät") || c.includes("waschmaschine") || c.includes("herd")) return VENDORS_BY_CATEGORY.appliance;
  if (c.includes("lock") || c.includes("schloss") || c.includes("schlüssel")) return VENDORS_BY_CATEGORY.locksmith;
  return VENDORS_BY_CATEGORY.general;
}

function computeAppointment(urgency: string): { dateLabel: string; timeLabel: string } {
  const now = new Date();
  const day = now.getDay();
  const u = (urgency || "").toUpperCase();

  if (u === "EMERGENCY") {
    return { dateLabel: "Heute", timeLabel: "innerhalb 90 Minuten" };
  }
  if (u === "HIGH") {
    return { dateLabel: "Heute", timeLabel: "ab 14:00" };
  }
  let addDays = 1;
  if (day === 5) addDays = 3;
  if (day === 6) addDays = 2;
  const when = new Date(now);
  when.setDate(now.getDate() + addDays);
  const dateLabel = addDays === 1
    ? "Morgen"
    : when.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  return { dateLabel, timeLabel: "09:00 – 11:00" };
}

function computePrice(category: string, urgency: string, bucket?: string): { amount: number; pretty: string } {
  const vendor = pickVendor(category);
  let amount = vendor.basePriceEur;

  const u = (urgency || "").toUpperCase();
  if (u === "HIGH") amount = Math.round(amount * 1.4);
  if (u === "EMERGENCY") amount = Math.round(amount * 1.8);

  if (bucket && bucket !== "unknown") {
    const m = bucket.match(/(\d+)/);
    if (m) amount = Math.max(amount, parseInt(m[1], 10));
  }

  const range = Math.round(amount * 0.25);
  const lo = amount - range;
  const hi = amount + range;
  return { amount, pretty: `€ ${lo}–${hi}` };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-subtle">{label}</div>
      <div className={`mt-0.5 text-[13px] font-medium text-ink ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function shortenCategory(c: string): string {
  if (!c) return "Wartungsanfrage";
  if (c.length < 40) return c;
  return c.slice(0, 38) + "…";
}
