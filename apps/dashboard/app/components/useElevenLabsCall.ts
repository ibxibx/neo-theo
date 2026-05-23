"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationMessage } from "@/lib/types";

export type CallState = "idle" | "connecting" | "connected" | "ended";

type UseElevenLabsCallProps = {
  agentId: string;
  /** Phone number to pass as a dynamic var so lookup_tenant_by_phone works */
  callerPhone: string;
  onToolCall?: (name: string) => void;
};

/**
 * Wraps @elevenlabs/react's useConversation hook with our own:
 *  - simple callState for the UI
 *  - in-order conversation transcript (agent + user + tool chips)
 *  - call duration tracking
 */
export function useElevenLabsCall({
  agentId,
  callerPhone,
  onToolCall,
}: UseElevenLabsCallProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [durationSec, setDurationSec] = useState(0);
  const startTsRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conv = useConversation({
    onConnect: () => {
      setCallState("connected");
      startTsRef.current = Date.now();
      tickRef.current = setInterval(() => {
        if (startTsRef.current) {
          setDurationSec(Math.floor((Date.now() - startTsRef.current) / 1000));
        }
      }, 1000);
    },
    onDisconnect: () => {
      setCallState("ended");
      if (tickRef.current) clearInterval(tickRef.current);
    },
    onMessage: ({ message, source }: { message: string; source: "ai" | "user" }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: source === "ai" ? "agent" : "user",
          text: message,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: (err: unknown) => {
      console.error("EL conversation error:", err);
      setCallState("ended");
    },
  });

  // Detect tool calls by hooking into the websocket events. The SDK exposes
  // `conv.status` but tool-use isn't a public callback yet — we tap into it
  // via the raw connection if needed. For now we surface a chip whenever the
  // agent pauses (proxy for tool invocation).
  // TODO: wire onClientTool when EL exposes it.

  const start = useCallback(async () => {
    setMessages([]);
    setDurationSec(0);
    setCallState("connecting");
    try {
      // Request mic permission up-front for a smoother UX
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conv.startSession({
        agentId,
        dynamicVariables: {
          caller_phone: callerPhone,
        },
      });
    } catch (e) {
      console.error("Failed to start EL session", e);
      setCallState("ended");
    }
  }, [agentId, callerPhone, conv]);

  const stop = useCallback(async () => {
    try {
      await conv.endSession();
    } catch (e) {
      console.error("Failed to end EL session", e);
    } finally {
      setCallState("ended");
      if (tickRef.current) clearInterval(tickRef.current);
    }
  }, [conv]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const toggle = useCallback(() => {
    if (callState === "idle" || callState === "ended") {
      void start();
    } else {
      void stop();
    }
  }, [callState, start, stop]);

  return {
    callState,
    messages,
    durationSec,
    toggle,
    start,
    stop,
    addToolCall: (name: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-tool`,
          role: "tool",
          text: name,
          toolName: name,
          timestamp: Date.now(),
        },
      ]);
      onToolCall?.(name);
    },
  };
}
