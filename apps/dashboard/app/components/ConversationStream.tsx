"use client";

import { useEffect, useRef } from "react";
import { ConversationMessage } from "@/lib/types";

type Props = {
  messages: ConversationMessage[];
  isLive: boolean;
};

export function ConversationStream({ messages, isLive }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className={`card flex flex-col h-full overflow-hidden ${isLive ? "card-active" : ""}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-ink">
            Konversation
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            Live-Transkript der KI
          </div>
        </div>
        {isLive ? (
          <div className="status-pill status-pill-live">Live</div>
        ) : (
          <div className="status-pill status-pill-idle">Bereit</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-soft px-6 py-5 space-y-3">
        {messages.length === 0 && (
          <EmptyState />
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLive && messages.length > 0 && <TypingDots />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  if (message.role === "tool") {
    return (
      <div className="flex justify-center reveal">
        <div className="tool-chip">
          <ToolIcon />
          <span>{message.toolName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`bubble ${
          message.role === "user" ? "bubble-user" : "bubble-agent"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bubble bubble-agent flex gap-1.5 py-3">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-full bg-paper-rail flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 4a8 8 0 00-8 8v4l-2 4h20l-2-4v-4a8 8 0 00-8-8z" stroke="currentColor" strokeWidth="1.5" className="text-ink-subtle" />
          <path d="M11 22a3 3 0 006 0" stroke="currentColor" strokeWidth="1.5" className="text-ink-subtle" />
        </svg>
      </div>
      <div className="text-[15px] font-medium text-ink">
        Bereit für den ersten Anruf
      </div>
      <div className="text-[13px] text-ink-soft mt-1 max-w-[260px]">
        Der Mieter tippt rechts auf den Hörer.
        <br />
        Die Konversation erscheint hier in Echtzeit.
      </div>
    </div>
  );
}

function ToolIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M9 2L7 4M3 8l-1 1M4 6.5L1.5 9 2 9.5 4.5 7 4 6.5zM5.5 5.5L9 2l-3.5 3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
