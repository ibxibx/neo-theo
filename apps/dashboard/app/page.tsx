"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { IPhoneFrame } from "./components/IPhoneFrame";
import { PhoneApp } from "./components/PhoneApp";
import { TenantCard } from "./components/TenantCard";
import { ConversationStream } from "./components/ConversationStream";
import { TriagePanel } from "./components/TriagePanel";
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

  // 4. When call ends, start classifying state
  const isLive = callState === "connecting" || callState === "connected";
  useEffect(() => {
    if (callState === "ended" && messages.length > 0 && !triage) {
      setClassifying(true);
      // The backend webhook will write the inquiry; we listen via realtime below.
      // Fallback timeout: stop classifying after 30s.
      const t = setTimeout(() => setClassifying(false), 30000);
      return () => clearTimeout(t);
    }
  }, [callState, messages.length, triage]);

  // 5. Supabase Realtime subscription on `inquiries` table
  useEffect(() => {
    const channel = supabase
      .channel("inquiries-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inquiries" },
        (payload) => {
          const row = payload.new as Inquiry;
          // Map the DB row back to a TriageResult shape for display.
          // The backend writes a subset; we hydrate sensible defaults.
          setTriage({
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
            reasoning: row.summary, // best we have until backend exposes full triage JSON
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

      <main className="flex-1 flex gap-8 px-8 py-8 max-w-[1800px] mx-auto w-full">
        {/* LEFT: Phone */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center">
          {tenant ? (
            <IPhoneFrame islandLabel={isLive ? "● Aktiver Anruf" : undefined}>
              <PhoneApp
                tenant={tenant}
                callState={callState}
                onCallToggle={toggle}
                callDurationSec={durationSec}
              />
            </IPhoneFrame>
          ) : (
            <div className="w-[360px] h-[740px] rounded-iphone bg-paper-rail flex items-center justify-center text-ink-soft text-sm">
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

        {/* RIGHT: Dashboard */}
        <div className="flex-1 grid grid-cols-12 gap-6 min-w-0">
          <div className="col-span-3 min-w-0">
            <TenantCard tenant={tenant} identified={tenantIdentified} active={tenantIdentified && isLive} />
          </div>
          <div className="col-span-5 min-w-0">
            <ConversationStream messages={messages} isLive={isLive} />
          </div>
          <div className="col-span-4 min-w-0">
            <TriagePanel triage={triage} classifying={classifying} />
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
