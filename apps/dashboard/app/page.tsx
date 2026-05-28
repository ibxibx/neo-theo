"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { IPhoneFrame } from "./components/IPhoneFrame";
import { PhoneApp } from "./components/PhoneApp";
import { TenantCard } from "./components/TenantCard";
import { ConversationStream } from "./components/ConversationStream";
import { TriagePanel } from "./components/TriagePanel";
import { DispatchPanel } from "./components/DispatchPanel";
import { useElevenLabsCall } from "./components/useElevenLabsCall";
import { supabase } from "@/lib/supabase";
import { Tenant, TriageResult, Inquiry } from "@/lib/types";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Demo tenant: Daniel Roth (#24) — WEG owner, Wallbox request → OWNER_APPROVAL
const DEMO_PHONE = "+493012340024";

export default function Home() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantIdentified, setTenantIdentified] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "degraded" | "offline">("ok");
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [classifying, setClassifying] = useState(false);

  // 1. Fetch demo tenant on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/tools/lookup_tenant_by_phone?phone=${encodeURIComponent(DEMO_PHONE)}`
        );
        const data = await res.json();
        if (data.found) {
          setTenant({
            id: data.id,
            name: data.name,
            contract_nr: data.contract_nr,
            phone: DEMO_PHONE,
            email: data.email,
            building: data.building,
            unit: data.unit,
            language: data.language,
            age_bucket: data.age_bucket,
            tech_affinity: data.tech_affinity,
            preferred_channel: data.preferred_channel,
          });
          // Mark identified — the dashboard now has the tenant context
          // even before the agent's tool roundtrip confirms it on its side.
          setTenantIdentified(true);
        }
      } catch (e) {
        console.error("Failed to fetch demo tenant", e);
        setApiStatus("offline");
      }
    })();
  }, []);

  // 2. Health check the API every 15s
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        setApiStatus(data.status === "ok" ? "ok" : "degraded");
      } catch {
        setApiStatus("offline");
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  // 3. The call hook
  const {
    callState,
    messages,
    durationSec,
    toggle,
    addToolCall,
  } = useElevenLabsCall({
    agentId: AGENT_ID,
    callerPhone: DEMO_PHONE,
    callerName: tenant?.name,
    callerBuilding: tenant?.building,
    callerUnit: tenant?.unit,
    callerLanguage: tenant?.language,
    onToolCall: (name) => {
      if (name === "lookup_tenant_by_phone") setTenantIdentified(true);
    },
  });

  // 4. When call ends, POST transcript to /triage and render the result.
  // This bypasses the webhook + Supabase Realtime path so the demo is
  // self-contained (no dependency on EL webhook delivery or Realtime config).
  const isLive = callState === "connecting" || callState === "connected";
  useEffect(() => {
    if (callState !== "ended" || messages.length === 0 || triage) return;
    if (!tenant) return;

    let cancelled = false;
    setClassifying(true);

    const transcript = messages
      .filter((m) => m.role === "agent" || m.role === "user")
      .map((m) => `${m.role === "agent" ? "Theo" : tenant.name}: ${m.text}`)
      .join("\n");

    (async () => {
      try {
        const res = await fetch(`${API_URL}/triage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_contract_nr: tenant.contract_nr,
            tenant_building: tenant.building,
            tenant_unit: tenant.unit,
            tenant_email: tenant.email,
            tenant_phone: tenant.phone,
            tenant_age_bucket: tenant.age_bucket,
            tenant_tech_affinity: tenant.tech_affinity,
            tenant_preferred_channel: tenant.preferred_channel,
          }),
        });
        if (!res.ok) throw new Error(`triage HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setTriage(data.triage as TriageResult);
      } catch (e) {
        console.error("triage failed:", e);
      } finally {
        if (!cancelled) setClassifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [callState, messages, triage, tenant]);

  // 5. Supabase Realtime subscription on `inquiries` table (secondary path,
  // still useful if the webhook DOES fire — won't double-populate because we
  // gate on `!triage`).
  useEffect(() => {
    const channel = supabase
      .channel("inquiries-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inquiries" },
        (payload) => {
          const row = payload.new as Inquiry;
          setTriage((prev) => {
            if (prev) return prev; // already populated by /triage POST
            return {
              summary: row.summary,
              category: row.category,
              urgency: (row.urgency as TriageResult["urgency"]) ?? "MEDIUM",
              action_class: inferActionClass(row),
              knowledge_capture_required: false,
              estimated_cost_eur_bucket: "unknown",
              needs_owner_approval: false,
              tenant_emotional_state: "calm",
              language_detected: "de",
              confidence: row.confidence ?? 0.85,
              keywords: row.keywords ?? [],
              reasoning: row.summary,
            };
          });
          setClassifying(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // 6. Reset for re-demo
  const resetDemo = useCallback(() => {
    setTriage(null);
    setClassifying(false);
    setTenantIdentified(false);
  }, []);

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <Header apiStatus={apiStatus} isCallLive={isLive} />

      <main className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-12 max-w-[1920px] mx-auto w-full items-center lg:items-start">
        {/* LEFT (≥lg): sticky phone column.  <lg: phone sits on top, centered.
            Top-aligned with the other columns at lg+. `sticky top-24` keeps
            the phone visible as the right-side panels (triage + dispatch)
            grow tall and the page scrolls. The 96px offset clears the sticky
            navbar's glass blur edge (header is ~80px) so the phone never
            appears clipped behind the navbar at any scroll position.
            On smaller widths we drop sticky so the phone scrolls with the
            page — sticky on a stacked-on-top column would obscure content. */}
        <div className="flex-shrink-0 flex flex-col items-center lg:sticky lg:top-24 lg:self-start">
          {tenant ? (
            <div className="iphone-frame-wrap relative">
              <IPhoneFrame islandLabel={isLive ? "● Aktiver Anruf" : undefined}>
                <PhoneApp
                  tenant={tenant}
                  callState={callState}
                  onCallToggle={toggle}
                  callDurationSec={durationSec}
                />
              </IPhoneFrame>
            </div>
          ) : (
            <div className="iphone-frame-wrap rounded-iphone bg-paper-rail/70 backdrop-blur flex items-center justify-center text-ink-soft text-sm">
              Lade Mieter…
            </div>
          )}
          <button
            onClick={resetDemo}
            className="mt-6 text-[11px] text-ink-subtle hover:text-ink transition-colors uppercase tracking-[0.14em] font-semibold"
          >
            Demo zurücksetzen
          </button>
        </div>

        {/* RIGHT (≥lg): three-panel dashboard
            Column distribution favors the right-most panel (triage + dispatch)
            because that's where the information density lives: classification,
            vendor selection, appointment, email preview, and the two-sided
            Stripe marketplace flow. The conversation stream is dense visually
            but trivially compressible; the triage/dispatch needs room to
            breathe.
            <md: single column stack
            md–lg: 2-col (tenant alone on top row, conversation + triage side-by-side)
            lg: 4-4-4 split
            xl+: 3-4-5 split (final, content-density-optimised) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 min-w-0 w-full">
          <div className="md:col-span-12 lg:col-span-4 xl:col-span-3 min-w-0">
            <TenantCard tenant={tenant} identified={tenantIdentified} active={tenantIdentified && isLive} />
          </div>
          <div className="md:col-span-6 lg:col-span-4 min-w-0">
            <ConversationStream messages={messages} isLive={isLive} />
          </div>
          <div className="md:col-span-6 lg:col-span-4 xl:col-span-5 min-w-0 flex flex-col gap-6">
            <TriagePanel triage={triage} classifying={classifying} />
            {triage && <DispatchPanel triage={triage} tenant={tenant} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function inferActionClass(row: Inquiry): TriageResult["action_class"] {
  // Lightweight mapping until backend stores action_class on inquiries directly.
  const u = row.urgency;
  if (u === "HIGH") return "EMERGENCY_DISPATCH";
  if (u === "MEDIUM") return "PROPERTY_MANAGER";
  return "AUTO_RESOLVE";
}
