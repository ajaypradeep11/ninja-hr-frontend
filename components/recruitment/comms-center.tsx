"use client";

import * as React from "react";
import {
  Bot,
  Inbox,
  Mail,
  MailPlus,
  Save,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge, CardHeader } from "@/components/ui";
import {
  createTemplate,
  draftCandidateMessage,
  sendCommunication,
  simulateCandidateReply,
} from "@/app/actions/recruitment";
import type {
  CandidateDetail,
  CommunicationEntry,
  CommunicationTemplateEntry,
} from "@/lib/recruitment";
import { cn, formatDate } from "@/lib/utils";

/** Client-side render of {{variables}} so templates land in the editor resolved. */
function renderVars(text: string, candidate: CandidateDetail): string {
  const vars: Record<string, string> = {
    candidate_name: candidate.name,
    job_title: candidate.requisitionTitle ?? candidate.role,
    company: "NinjaHR",
    interview_date: candidate.interviewDate ?? "",
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => vars[k] ?? m);
}

/**
 * AI Assistant & Comms — the candidate mailbox plus composer.
 *
 * Two-way thread: OUTBOUND messages (right, brand) and INBOUND candidate
 * replies (left, white) captured by the inbound-email webhook
 * (`POST /recruitment/comms/inbound`, addressed reply+<portalToken>@…, the
 * SendGrid Inbound Parse / SES shape).
 *
 * Composer rules: templates never send directly — they populate the editable
 * editor first. The AI drafter also only populates the editor. A human always
 * reviews and presses Send.
 */
export function CommsCenter({
  candidate,
  templates,
  isHr,
  onUpdated,
}: {
  candidate: CandidateDetail;
  templates: CommunicationTemplateEntry[];
  isHr: boolean;
  onUpdated: (detail: CandidateDetail) => void;
}) {
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [loadedFrom, setLoadedFrom] = React.useState<string | null>(null);

  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiSource, setAiSource] = React.useState<"ai" | "template" | null>(null);

  const [saveAsOpen, setSaveAsOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");
  const [savedTemplate, setSavedTemplate] = React.useState<string | null>(null);

  const [replyBody, setReplyBody] = React.useState("");
  const [busy, setBusy] = React.useState<null | "send" | "draft" | "save" | "reply">(null);
  const [error, setError] = React.useState<string | null>(null);

  // Thread renders oldest-first so it reads like a conversation.
  const thread = React.useMemo(
    () => [...candidate.communications].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [candidate.communications],
  );
  const threadEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread.length]);

  async function run<T>(kind: typeof busy, fn: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(kind);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  function loadTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    // Populate, don't send — the recruiter tweaks the wording first.
    setSubject(renderVars(t.subject, candidate));
    setBody(renderVars(t.body, candidate));
    setLoadedFrom(t.name);
    setAiSource(null);
  }

  async function draftWithAi() {
    if (!aiPrompt.trim()) return;
    const res = await run("draft", () => draftCandidateMessage(candidate.id, aiPrompt.trim()));
    if (res) {
      setSubject(res.subject);
      setBody(res.body);
      setLoadedFrom(null);
      setAiSource(res.source);
    }
  }

  async function send() {
    if (!subject.trim() || !body.trim()) {
      setError("Write (or load) a subject and message first");
      return;
    }
    const updated = await run("send", () =>
      sendCommunication(candidate.id, { subject: subject.trim(), body: body.trim() }),
    );
    if (updated) {
      onUpdated(updated);
      setSubject("");
      setBody("");
      setLoadedFrom(null);
      setAiSource(null);
    }
  }

  async function saveAsTemplate() {
    if (!templateName.trim() || !subject.trim() || !body.trim()) return;
    const ok = await run("save", () =>
      createTemplate({
        name: templateName.trim(),
        subject: subject.trim(),
        body: body.trim(),
        trigger: "Manual",
      }),
    );
    if (ok) {
      setSavedTemplate(templateName.trim());
      setTemplateName("");
      setSaveAsOpen(false);
    }
  }

  async function simulateReply() {
    if (!replyBody.trim()) return;
    const updated = await run("reply", () =>
      simulateCandidateReply(candidate.id, { body: replyBody.trim() }),
    );
    if (updated) {
      onUpdated(updated);
      setReplyBody("");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* ------------------------- Mailbox thread ------------------------- */}
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <CardHeader
          title="Candidate mailbox"
          action={<Inbox className="h-4 w-4 text-brand-500" />}
        />
        <p className="mt-1 text-[11px] text-ink-faint">
          Two-way thread — replies from {candidate.name.split(" ")[0]} arrive here via the
          inbound-email webhook.
        </p>

        <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {thread.length === 0 && (
            <div className="rounded-xl bg-canvas px-4 py-8 text-center">
              <Mail className="mx-auto h-5 w-5 text-ink-faint" />
              <p className="mt-2 text-xs text-ink-muted">
                No messages yet — the conversation starts when you send one.
              </p>
            </div>
          )}
          {thread.map((c: CommunicationEntry) => {
            const inbound = c.direction === "Inbound";
            return (
              <div key={c.id} className={cn("flex", inbound ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl border px-3.5 py-2.5",
                    inbound
                      ? "rounded-bl-sm border-line bg-white"
                      : "rounded-br-sm border-brand-100 bg-brand-50/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-xs font-semibold text-ink">{c.subject}</p>
                    {inbound && <Badge tone="sky">Reply</Badge>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                    {c.body}
                  </p>
                  <p className="mt-1.5 text-[10px] text-ink-faint">
                    {inbound
                      ? `${candidate.name}${c.fromAddress ? ` · ${c.fromAddress}` : ""}`
                      : c.sentByName
                        ? `Sent by ${c.sentByName}`
                        : "Automated"}
                    {c.templateName && !inbound && <> · {c.templateName}</>}
                    {" · "}
                    {formatDate(c.sentAt.slice(0, 10))}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={threadEndRef} />
        </div>

        {/* Demo affordance: exercises the same intake path as the webhook. */}
        {isHr && !candidate.anonymized && (
          <div className="mt-3 border-t border-dashed border-line pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              Simulate a candidate reply (demo — no mail provider connected)
            </p>
            <div className="mt-1.5 flex gap-2">
              <input
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Reply as ${candidate.name.split(" ")[0]}…`}
                className="field-input flex-1 text-xs"
              />
              <button
                disabled={busy !== null || !replyBody.trim()}
                onClick={simulateReply}
                className="shrink-0 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
              >
                {busy === "reply" ? "…" : "Inject"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------- Composer ----------------------------- */}
      <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        <CardHeader
          title="AI assistant & composer"
          action={<Bot className="h-4 w-4 text-brand-500" />}
        />

        {isHr ? (
          <div className="mt-3 space-y-3">
            {/* AI drafting — output only populates the editor below. */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> Draft with AI
              </p>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && draftWithAi()}
                  placeholder='e.g. "Politely decline, invite a re-apply in 6 months"'
                  className="field-input flex-1 text-xs"
                />
                <button
                  disabled={busy !== null || !aiPrompt.trim()}
                  onClick={draftWithAi}
                  className="shrink-0 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <Wand2 className="mr-1 inline h-3.5 w-3.5" />
                  {busy === "draft" ? "Drafting…" : "Draft"}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-ink-faint">
                The draft lands in the editor for your review — nothing sends automatically.
              </p>
            </div>

            {/* Template loader — populates the editor, never sends directly. */}
            <div>
              <label className="field-label">Start from a template</label>
              <select
                value=""
                onChange={(e) => e.target.value && loadTemplate(e.target.value)}
                className="field-input"
              >
                <option value="">Pick a template to load into the editor…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Editable editor — the single gate everything flows through. */}
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-ink-soft">Message editor</p>
                <span className="text-[10px] text-ink-faint">
                  {aiSource === "ai" && "AI draft — review before sending"}
                  {aiSource === "template" &&
                    "Drafted from fallback template (no AI key) — review before sending"}
                  {loadedFrom && `Loaded from “${loadedFrom}” — edit freely`}
                </span>
              </div>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="field-input mt-2"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                placeholder="Message body — write from scratch, load a template, or draft with AI…"
                className="field-input mt-2 resize-y font-mono text-xs leading-relaxed"
              />

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  disabled={busy !== null || !subject.trim() || !body.trim()}
                  onClick={send}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" /> {busy === "send" ? "Sending…" : "Send to candidate"}
                </button>
                <button
                  disabled={!subject.trim() || !body.trim()}
                  onClick={() => setSaveAsOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> Save as new template
                </button>
              </div>

              {saveAsOpen && (
                <div className="mt-2 flex gap-2 rounded-lg bg-canvas p-2">
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name, e.g. “Second-round invite”"
                    className="field-input flex-1 text-xs"
                  />
                  <button
                    disabled={busy !== null || !templateName.trim()}
                    onClick={saveAsTemplate}
                    className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy === "save" ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
              {savedTemplate && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
                  <MailPlus className="mr-1 inline h-3 w-3" />
                  Saved “{savedTemplate}” — it&apos;s now in the template list for every candidate.
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-xs text-ink-muted">
            Only HR contacts candidates directly, for a consistent employer brand. Use internal
            notes to share feedback with the team — you can still read the thread here.
          </p>
        )}
      </div>
    </div>
  );
}
