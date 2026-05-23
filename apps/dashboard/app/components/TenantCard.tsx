"use client";

import { Tenant } from "@/lib/types";

type Props = {
  tenant: Tenant | null;
  /** True once the agent has called lookup_tenant_by_phone and we have a hit */
  identified: boolean;
};

const CHANNEL_LABELS: Record<string, string> = {
  letter: "Brief",
  email: "Email",
  sms: "SMS",
  phone: "Telefon",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  in_app: "In-App",
};

const TECH_LABELS: Record<string, string> = {
  low: "Wenig technikaffin",
  medium: "Technikaffin",
  high: "Sehr technikaffin",
};

const AGE_LABELS: Record<string, string> = {
  "<25": "Unter 25",
  "25-34": "25–34",
  "35-49": "35–49",
  "50-64": "50–64",
  "65+": "65+",
};

export function TenantCard({ tenant, identified }: Props) {
  if (!tenant) {
    return (
      <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-paper-rail mb-4 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 13a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 1116 0H4z" stroke="currentColor" strokeWidth="1.5" className="text-ink-subtle" />
          </svg>
        </div>
        <div className="text-[15px] font-medium text-ink">Warte auf Anruf</div>
        <div className="text-[13px] text-ink-soft mt-1">
          Identität wird automatisch erkannt
        </div>
      </div>
    );
  }

  const initials = tenant.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-blue to-accent-indigo text-white flex items-center justify-center text-[18px] font-semibold tracking-wide shadow-sm">
            {initials}
          </div>
          {identified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-green border-2 border-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold tracking-tight text-ink leading-snug">
            {tenant.name}
          </div>
          <div className="text-[13px] text-ink-soft mt-0.5 font-mono">
            {tenant.contract_nr}
          </div>
          {identified && (
            <div className="status-pill status-pill-live mt-2">
              Identifiziert
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-black/[0.06] my-5" />

      {/* Property */}
      <div className="space-y-3">
        <Row label="Gebäude" value={tenant.building} mono={false} />
        <Row label="Einheit" value={tenant.unit || "—"} />
        <Row label="Telefon" value={tenant.phone} mono />
        <Row label="Sprache" value={langLabel(tenant.language)} />
      </div>

      {/* Divider */}
      <div className="h-px bg-black/[0.06] my-5" />

      {/* Profile signals (the killer detail) */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-ink-subtle mb-2">
          Profilsignale
        </div>
        {tenant.age_bucket && (
          <ProfileChip label="Alter" value={AGE_LABELS[tenant.age_bucket] || tenant.age_bucket} />
        )}
        {tenant.tech_affinity && (
          <ProfileChip
            label="Tech"
            value={TECH_LABELS[tenant.tech_affinity] || tenant.tech_affinity}
          />
        )}
        {tenant.preferred_channel && (
          <ProfileChip
            label="Kanal"
            value={CHANNEL_LABELS[tenant.preferred_channel] || tenant.preferred_channel}
            accent
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-auto pt-5">
        <div className="text-[11px] text-ink-subtle leading-relaxed">
          Daten aus <span className="font-semibold">tenants</span>-Tabelle ·
          Erkannt durch <span className="font-mono">lookup_tenant_by_phone</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-[12px] text-ink-soft">{label}</div>
      <div className={`text-[13px] text-ink text-right truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ProfileChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[12px] text-ink-soft">{label}</div>
      <div
        className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
          accent
            ? "bg-accent-indigo/10 text-accent-indigo"
            : "bg-paper-rail text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function langLabel(code: string) {
  return (
    { de: "Deutsch", en: "Englisch", tr: "Türkisch", pl: "Polnisch", ar: "Arabisch" }[code] ||
    code
  );
}
