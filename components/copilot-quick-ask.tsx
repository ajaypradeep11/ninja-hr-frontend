"use client";

import * as React from "react";
import { CornerDownLeft, Sparkles } from "lucide-react";

/**
 * Single-line dashboard entry point to the ONE global HR Co-Pilot panel.
 * Typing a question and hitting Enter slides the global drawer open with the
 * question already submitted — no separate widget conversation to maintain.
 */
export function CopilotQuickAsk() {
  const [q, setQ] = React.useState("");

  function ask() {
    const question = q.trim();
    window.dispatchEvent(
      new CustomEvent("ninjahr:ask-copilot", { detail: question ? { question } : {} }),
    );
    setQ("");
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1 ring-1 ring-white/25 backdrop-blur focus-within:bg-white/20 focus-within:ring-white/40">
      <Sparkles className="h-4 w-4 shrink-0 text-white/80" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ask()}
        placeholder="Ask a quick HR question…"
        aria-label="Ask the HR Co-Pilot a question"
        className="w-full bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-white/60"
      />
      <button
        onClick={ask}
        aria-label="Ask"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
      >
        <CornerDownLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
