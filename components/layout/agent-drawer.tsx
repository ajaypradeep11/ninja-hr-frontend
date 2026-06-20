"use client";

import * as React from "react";
import { Sparkles, X, CornerDownLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { askCoPilot } from "@/app/actions/ai";

interface Msg {
  role: "user" | "agent";
  text: string;
  guard?: string;
  pending?: boolean;
}

const SUGGESTIONS = [
  "How many vacation days does Jim Scott have left?",
  "Audit our Ontario jobs for Bill 149",
  "Draft an offer letter for Jordan Henderson",
  "Who is approaching their 90-day probation milestone?",
];

// Canned, deterministic "agentic" responses for the prototype.
function respond(input: string): Msg {
  const q = input.toLowerCase();
  if (q.includes("vacation") || q.includes("leave")) {
    return {
      role: "agent",
      text: "Jim Scott (BC) has 12 vacation days remaining for 2026, accruing at 4% (2 weeks). He has a pending request for Jun 18–22 (3 days) in your approval queue.",
    };
  }
  if (q.includes("bill 149") || q.includes("audit")) {
    return {
      role: "agent",
      text: "I scanned 12 active Ontario requisitions. 3 are non-compliant with Bill 149 salary mandates. I've drafted the fixes and queued them for your approval.",
      guard: "Read-only audit complete. Publishing changes requires your one-click approval (no autonomous writes).",
    };
  }
  if (q.includes("offer letter") || q.includes("draft")) {
    return {
      role: "agent",
      text: "I pulled Jordan Henderson's record (Senior Software Engineer, ON, $138,000) and drafted a customized offer letter from the Letter Lab template. It's ready in your review queue.",
      guard: "Human-in-the-loop: the Send button stays disabled until you click “Verified content accuracy.”",
    };
  }
  if (q.includes("probation") || q.includes("90")) {
    return {
      role: "agent",
      text: "Jim Scott reaches his 90-day probation milestone soon. I've initialized a Probationary Review for Michael Scott — complete it by Day 80 to determine extension or termination before statutory notice applies.",
    };
  }
  return {
    role: "agent",
    text: "I can read across Recruitment, Leave, Documents, Performance and Offboarding to answer that. For any action that mutates records, I'll queue it for your approval first.",
    guard: "I never execute deletions or status changes to Terminated/Rejected without explicit human confirmation.",
  };
}

export function AgentDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "agent",
      text: "Hi Sarah — I'm your HR Co-Pilot. Ask me anything about your workforce, or give me a task to run.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text: t },
      { role: "agent", text: "Thinking…", pending: true },
    ]);

    // Try live Claude; fall back to the canned response if no key / on error.
    let reply: Msg;
    try {
      const res = await askCoPilot(t, "admin");
      reply = res.live && res.text ? { role: "agent", text: res.text } : respond(t);
    } catch {
      reply = respond(t);
    }
    setMessages((m) => {
      const next = [...m];
      const idx = next.findIndex((x) => x.pending);
      if (idx !== -1) next[idx] = reply;
      return next;
    });
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-pop transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">HR Co-Pilot</p>
              <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live AI Agent
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-brand-500 text-white"
                    : "bg-canvas text-ink-soft",
                )}
              >
                {m.text}
                {m.guard && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-700">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{m.guard}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length <= 1 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Try asking
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-xl border border-line px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask or command the agent…"
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={() => send(input)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
