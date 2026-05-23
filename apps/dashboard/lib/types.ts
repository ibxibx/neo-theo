export type Tenant = {
  id: string;
  name: string;
  contract_nr: string;
  phone: string;
  email: string | null;
  building: string;
  unit: string;
  language: string;
  age_bucket?: string;
  tech_affinity?: string;
  preferred_channel?: string;
};

export type Urgency = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
export type ActionClass =
  | "AUTO_RESOLVE"
  | "SERVICER_QUEUE"
  | "PROPERTY_MANAGER"
  | "OWNER_APPROVAL"
  | "EMERGENCY_DISPATCH";

export type Inquiry = {
  id: string;
  call_id: string | null;
  tenant_id: string | null;
  summary: string;
  category: string;
  urgency: string;
  confidence: number;
  keywords: string[] | null;
  created_at: string;
};

export type Dispatch = {
  id: string;
  inquiry_id: string;
  action: string;
  sent_to: string | null;
  payload: Record<string, unknown> | null;
  status: string;
  sent_at: string;
};

export type TriageResult = {
  summary: string;
  category: string;
  urgency: Urgency;
  action_class: ActionClass;
  knowledge_capture_required: boolean;
  estimated_cost_eur_bucket?: string;
  needs_owner_approval: boolean;
  tenant_emotional_state?: string;
  language_detected?: string;
  confidence: number;
  keywords: string[];
  reasoning: string;
};

export type ConversationMessage = {
  id: string;
  role: "agent" | "user" | "tool";
  text: string;
  timestamp: number;
  toolName?: string;
};
