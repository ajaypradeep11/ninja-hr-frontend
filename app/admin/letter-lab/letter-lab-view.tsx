"use client";

import * as React from "react";
import {
  ChevronLeft,
  FileSignature,
  FileText,
  GripVertical,
  Loader2,
  PenLine,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import {
  createLetterTemplate,
  deleteLetterTemplate,
  issueLetter,
  updateLetterTemplate,
} from "@/app/actions/letters";
import { askCoPilot } from "@/app/actions/ai";
import {
  LETTER_CATEGORIES,
  LETTER_VARIABLES,
  renderLetter,
  type LetterTemplate,
} from "@/lib/letters";
import type { Employee } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";

const categoryTone: Record<string, "brand" | "sky" | "green" | "red" | "violet" | "gray"> = {
  Offer: "green",
  Probation: "sky",
  Promotion: "violet",
  Termination: "red",
  Custom: "gray",
};

type Mode = { view: "library" } | { view: "builder"; template: LetterTemplate | null };

export function LetterLabView({
  initialTemplates,
  employees,
}: {
  initialTemplates: LetterTemplate[];
  employees: Employee[];
}) {
  const [templates, setTemplates] = React.useState(initialTemplates);
  const [mode, setMode] = React.useState<Mode>({ view: "library" });
  const [generateFor, setGenerateFor] = React.useState<LetterTemplate | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function guard<T>(work: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    try {
      return await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
      return undefined;
    }
  }

  async function removeTemplate(t: LetterTemplate) {
    if (!confirm(`Delete the “${t.name}” template? This can't be undone.`)) return;
    const next = await guard(() => deleteLetterTemplate(t.id));
    if (next) setTemplates(next);
  }

  return (
    <div>
      <PageHeader
        title="Letter Lab"
        subtitle="AI document automation — build templates once, generate personalized letters from live HRIS data."
        action={
          mode.view === "library" ? (
            <button
              onClick={() => setMode({ view: "builder", template: null })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Create Template
            </button>
          ) : (
            <button
              onClick={() => setMode({ view: "library" })}
              className="inline-flex items-center gap-1 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-canvas"
            >
              <ChevronLeft className="h-4 w-4" /> Back to library
            </button>
          )
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {mode.view === "library" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="card-pad flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <FileText className="h-5 w-5" />
                </span>
                <Badge tone={categoryTone[t.category] ?? "gray"}>{t.category}</Badge>
              </div>
              <h3 className="mt-3 text-sm font-bold text-ink">{t.name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 whitespace-pre-line text-xs text-ink-muted">
                {t.body}
              </p>
              <p className="mt-2 text-[11px] text-ink-faint">
                Updated {formatDate(t.updatedAt.slice(0, 10))}
              </p>
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <button
                  onClick={() => setGenerateFor(t)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Generate for Employee
                </button>
                <button
                  onClick={() => setMode({ view: "builder", template: t })}
                  title="Edit template"
                  className="rounded-lg border border-line p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                  <PenLine className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeTemplate(t)}
                  title="Delete template"
                  className="rounded-lg border border-line p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
          {templates.length === 0 && (
            <Card className="card-pad md:col-span-2 xl:col-span-3">
              <p className="py-8 text-center text-sm text-ink-muted">
                No templates yet — create your first with “+ Create Template”.
              </p>
            </Card>
          )}
        </div>
      ) : (
        <TemplateBuilder
          template={mode.template}
          onSaved={(next) => {
            setTemplates(next);
            setMode({ view: "library" });
          }}
          guard={guard}
        />
      )}

      {generateFor && (
        <GenerateModal
          template={generateFor}
          employees={employees}
          onClose={() => setGenerateFor(null)}
          guard={guard}
        />
      )}
    </div>
  );
}

/* ============================ Template builder ========================== */

function TemplateBuilder({
  template,
  onSaved,
  guard,
}: {
  template: LetterTemplate | null;
  onSaved: (all: LetterTemplate[]) => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [name, setName] = React.useState(template?.name ?? "");
  const [category, setCategory] = React.useState(template?.category ?? "Custom");
  const [body, setBody] = React.useState(template?.body ?? "");
  const [saving, setSaving] = React.useState(false);
  const editorRef = React.useRef<HTMLTextAreaElement>(null);

  /** Insert a variable token at the cursor (click) — drag & drop uses the
   *  browser's native text-drop behaviour into the textarea. */
  function insertToken(token: string) {
    const el = editorRef.current;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function save() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    const input = { name: name.trim(), category, body };
    const next = await guard(() =>
      template ? updateLetterTemplate(template.id, input) : createLetterTemplate(input),
    );
    setSaving(false);
    if (next) onSaved(next);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Main editor */}
      <Card className="card-pad lg:col-span-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <div>
            <label className="field-label">Template name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Standard Offer Letter"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field-input"
            >
              {LETTER_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="field-label mt-4 block">Document body</label>
        <textarea
          ref={editorRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          maxLength={20000}
          placeholder={"Dear {{employee_name}},\n\nWrite the letter here — drag variables in from the right, or click them to insert at the cursor."}
          className="mt-1 w-full rounded-xl border border-line p-4 font-serif text-sm leading-relaxed text-ink outline-none focus:border-brand-300"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={save}
            disabled={saving || !name.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : template ? "Save Changes" : "Save Template"}
          </button>
        </div>
      </Card>

      {/* Variable sidebar */}
      <Card className="card-pad h-fit lg:col-span-4">
        <h3 className="text-sm font-bold text-ink">Database Variables</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Drag into the editor, or click to insert at the cursor. Values fill from the employee&apos;s
          live HRIS record at generation time.
        </p>
        <div className="mt-3 space-y-1.5">
          {LETTER_VARIABLES.map((v) => (
            <button
              key={v.token}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", v.token)}
              onClick={() => insertToken(v.token)}
              className="flex w-full cursor-grab items-center gap-2 rounded-xl border border-line px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/40 active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-ink">{v.label}</span>
                <span className="block truncate text-[10px] text-ink-faint">{v.hint}</span>
              </span>
              <code className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-[10px] text-brand-600">
                {v.token}
              </code>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ========================= Generate-for-employee ======================== */

type GenStep = "pick" | "preview";

function GenerateModal({
  template,
  employees,
  onClose,
  guard,
}: {
  template: LetterTemplate;
  employees: Employee[];
  onClose: () => void;
  guard: <T>(work: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [step, setStep] = React.useState<GenStep>("pick");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Employee | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [letterText, setLetterText] = React.useState("");
  const [aiNote, setAiNote] = React.useState<string | null>(null);
  const [issuing, setIssuing] = React.useState<"save" | "signature" | null>(null);
  const [issued, setIssued] = React.useState<string | null>(null);

  const matches = employees.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${e.name} ${e.title} ${e.department}`.toLowerCase().includes(q);
  });

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    setAiNote(null);
    // Deterministic base: fill the template's variables from the HRIS record.
    const base = renderLetter(template.body, selected);
    let text = base;
    if (prompt.trim()) {
      try {
        const res = await askCoPilot(
          `Rewrite the following HR letter, keeping all facts, names, dates and amounts exactly as given. Apply this customization: "${prompt.trim()}". Return ONLY the final letter text, no commentary.\n\n---\n${base}`,
          "admin",
        );
        if (res.live && res.text?.trim()) {
          text = res.text.trim();
          setAiNote("Customized by AI from your prompt — review before issuing.");
        } else {
          setAiNote(
            "AI is not configured (no API key) — showing the standard template with live HRIS data; your customization prompt was not applied.",
          );
        }
      } catch {
        setAiNote(
          "AI request failed — showing the standard template with live HRIS data instead.",
        );
      }
    }
    setLetterText(text);
    setGenerating(false);
    setStep("preview");
  }

  async function issue(modeSel: "save" | "signature") {
    if (!selected) return;
    setIssuing(modeSel);
    const ok = await guard(() =>
      issueLetter({
        employeeId: selected.id,
        name: `${template.name} — ${selected.name}.pdf`,
        mode: modeSel,
      }),
    );
    setIssuing(null);
    if (ok !== undefined) {
      setIssued(
        modeSel === "signature"
          ? `Routed for e-signature (simulated) and filed to ${selected.name}'s documents as “awaiting signature”.`
          : `Saved to ${selected.name}'s profile — it now appears under their Documents.`,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Generate for Employee</h3>
            <p className="text-[11px] text-ink-muted">{template.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "pick" ? (
          <div className="space-y-4 overflow-y-auto p-6">
            <div>
              <label className="field-label">Employee</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, title or department…"
                  className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
                />
              </div>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-1.5">
                {matches.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                      selected?.id === e.id ? "bg-brand-50" : "hover:bg-canvas",
                    )}
                  >
                    <Avatar name={e.name} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{e.name}</span>
                      <span className="block truncate text-[11px] text-ink-muted">
                        {e.title} · {e.department}
                      </span>
                    </span>
                  </button>
                ))}
                {matches.length === 0 && (
                  <p className="px-2.5 py-4 text-center text-xs text-ink-muted">No matches.</p>
                )}
              </div>
            </div>

            <div>
              <label className="field-label flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" /> AI Customization Prompt
                (optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder='e.g. "Add a friendly opening paragraph welcoming them to the Toronto office."'
                className="field-input mt-1 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={generate}
                disabled={!selected || generating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {generating ? "Generating…" : "Generate letter"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            {aiNote && (
              <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-[11px] font-medium text-violet-700">
                {aiNote}
              </p>
            )}
            {/* PDF-style preview */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-canvas p-4">
              <div className="mx-auto max-w-lg rounded-md bg-white p-8 shadow-md">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  TestHR Inc.
                </p>
                <div className="mb-5 mt-1 h-px bg-line" />
                <pre className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-ink">
                  {letterText}
                </pre>
              </div>
            </div>

            {issued ? (
              <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {issued}
                <button onClick={onClose} className="ml-2 font-semibold underline">
                  Done
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setStep("pick")}
                  className="text-xs font-semibold text-ink-muted hover:text-ink"
                >
                  ← Back
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => issue("save")}
                    disabled={issuing !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {issuing === "save" ? "Saving…" : "Save to Profile"}
                  </button>
                  <button
                    onClick={() => issue("signature")}
                    disabled={issuing !== null}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    {issuing === "signature" ? "Sending…" : "Send for Signature"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
