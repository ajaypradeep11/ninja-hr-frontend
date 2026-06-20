"use client";

import * as React from "react";
import { CornerDownLeft, Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { employeeLeaveBalances } from "@/lib/data";
import { askCoPilot } from "@/app/actions/ai";

interface Msg {
  role: "user" | "agent";
  text: string;
  pending?: boolean;
}

const SUGGESTIONS = [
  "How many vacation days do I have left?",
  "When's my next payday?",
  "How do I book parental leave?",
  "What mandatory training do I still owe?",
];

function respond(input: string): Msg {
  const q = input.toLowerCase();
  if (q.includes("vacation") || (q.includes("days") && q.includes("left"))) {
    const v = employeeLeaveBalances.find((b) => b.type.includes("Vacation"));
    return {
      role: "agent",
      text: `You have ${v?.available ?? 12} vacation days remaining for 2026 (you've used ${v?.used ?? 6}). As a BC employee you accrue at 4% — that's about 2 weeks per year. Want me to start a request?`,
    };
  }
  if (q.includes("sick")) {
    const s = employeeLeaveBalances.find((b) => b.type.includes("Sick"));
    return {
      role: "agent",
      text: `You have ${s?.available ?? 5} paid sick days remaining. BC mandates a minimum of 5 paid sick days per year after 90 days of employment, plus 3 unpaid.`,
    };
  }
  if (q.includes("payday") || q.includes("paid")) {
    return {
      role: "agent",
      text: "Your next payday is Friday, June 26, 2026. You're on a bi-weekly cycle, so the following one lands July 10, 2026.",
    };
  }
  if (q.includes("parental") || q.includes("maternity") || q.includes("leave")) {
    return {
      role: "agent",
      text: "To book parental leave: go to My Time Off → Request Time Off → select “Parental.” Your status moves to ‘On Statutory Leave,’ which is job-protected under the BC ESA. I can pre-fill the request if you give me a start date.",
    };
  }
  if (q.includes("training")) {
    return {
      role: "agent",
      text: "You still owe two mandatory courses: WHMIS 2015 (not started, due Jun 30) and Cybersecurity Essentials (25% done, due Jul 15). Finish both within 30 days to stay compliant.",
    };
  }
  return {
    role: "agent",
    text: "I can answer questions about your leave, pay, benefits, training, and documents — and help you start requests. What would you like to know?",
  };
}

export default function EmployeeAssistant() {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "agent",
      text: "Hi Jim 👋 I'm your HR Co-Pilot. Ask me anything about your time off, pay, benefits, or training.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text: t },
      { role: "agent", text: "Thinking…", pending: true },
    ]);

    let reply: Msg;
    try {
      const res = await askCoPilot(t, "employee");
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">HR Assistant</h1>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online · answers in
            seconds
          </p>
        </div>
      </div>

      <Card className="flex h-[62vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-end gap-2.5", m.role === "user" && "flex-row-reverse")}>
              {m.role === "agent" ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
              ) : (
                <Avatar name="Jim Scott" size={32} />
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-brand-500 text-white" : "bg-canvas text-ink-soft",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {messages.length <= 1 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
              placeholder="Ask about your leave, pay, benefits…"
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
      </Card>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
        <Lock className="h-3 w-3" />
        The assistant is scoped to your own records only. It can never view another
        employee&apos;s data.
      </p>
    </div>
  );
}
