"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  FileUp,
  NotebookPen,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { importGuideDocument, saveGuideTemplate } from "@/app/actions/recruitment";
import type { GuideSection } from "@/lib/recruitment";
import { cn } from "@/lib/utils";

/** Mirrors the backend's built-in standard — the "Reset to standard" source. */
const NINJA_STANDARD: GuideSection[] = [
  {
    name: "Technical Fit",
    weight: 40,
    guidance:
      "What did they build most recently, and what was their specific contribution?\nWalk through a hard problem they solved — approach over trivia.\nHow do they reason about trade-offs, quality and deadlines?",
  },
  {
    name: "Culture Add",
    weight: 30,
    guidance:
      "What perspective or experience would they add to the team?\nAsk for a concrete example of collaboration or giving/receiving feedback.\nAssess what they add — not whether they fit a mold.",
  },
  {
    name: "Communication",
    weight: 30,
    guidance:
      "Have them explain a complex topic as if to a non-expert.\nDo they answer the question that was asked?\nSignals from written materials (take-home, résumé, emails).",
  },
];

export function GuideTemplateEditor({ initial }: { initial: GuideSection[] }) {
  const [sections, setSections] = React.useState<GuideSection[]>(initial);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "save" | "import">(null);
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState(false);

  // Import state
  const [importText, setImportText] = React.useState("");
  const [importNote, setImportNote] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const totalWeight = sections.reduce((s, x) => s + (x.weight ?? 0), 0);
  const weighted = sections.some((s) => s.weight != null);

  function patch(i: number, p: Partial<GuideSection>) {
    setSections((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
    setDirty(true);
    setSavedAt(false);
  }

  function move(i: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
    setSavedAt(false);
  }

  function remove(i: number) {
    setSections((prev) => prev.filter((_, j) => j !== i));
    setDirty(true);
    setSavedAt(false);
  }

  function add() {
    setSections((prev) => [...prev, { name: "New section", weight: undefined, guidance: "" }]);
    setDirty(true);
    setSavedAt(false);
  }

  function resetToStandard() {
    setSections(NINJA_STANDARD.map((s) => ({ ...s })));
    setDirty(true);
    setSavedAt(false);
    setImportNote(null);
  }

  async function save() {
    if (busy) return;
    const clean = sections
      .map((s) => ({
        name: s.name.trim(),
        weight: s.weight || undefined,
        guidance: s.guidance?.trim() || undefined,
      }))
      .filter((s) => s.name.length > 0);
    if (clean.length === 0) {
      setError("Add at least one section before saving.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      setSections(await saveGuideTemplate(clean));
      setDirty(false);
      setSavedAt(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the guide");
    } finally {
      setBusy(null);
    }
  }

  async function runImport(text: string) {
    if (busy || !text.trim()) return;
    setBusy("import");
    setError(null);
    setImportNote(null);
    try {
      const res = await importGuideDocument(text);
      if (res.sections.length === 0) {
        setImportNote("Couldn't find sections in that document — try adding headings.");
        return;
      }
      setSections(res.sections);
      setDirty(true);
      setSavedAt(false);
      setImportNote(
        res.source === "ai"
          ? `Structured by AI into ${res.sections.length} section(s) — review and save.`
          : `Parsed ${res.sections.length} section(s) from headings and questions — review, tidy up, then save.`,
      );
      setImportText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => runImport(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
      {/* ------------------------------ Editor ------------------------------ */}
      <div className="space-y-5">
        <Card className="card-pad">
          <CardHeader
            title="Guide sections"
            action={
              <div className="flex items-center gap-2">
                {/* Weight balance meter */}
                {weighted && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      totalWeight === 100
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                    title="Section weights should add up to 100"
                  >
                    <Scale className="h-3 w-3" /> {totalWeight}/100
                  </span>
                )}
                <NotebookPen className="h-4 w-4 text-brand-500" />
              </div>
            }
          />
          <p className="mt-1 text-xs text-ink-muted">
            Interviewers rate each section 1–5 and see your guiding questions while they
            interview. Changes apply to <b>new</b> requisitions; existing ones can pull the
            latest version from their own criteria editor.
          </p>

          <div className="mt-3 space-y-3">
            {sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => patch(i, { name: e.target.value })}
                    className="field-input flex-1 font-semibold"
                    placeholder="Section name (e.g. Problem Solving)"
                  />
                  <input
                    value={s.weight ?? ""}
                    onChange={(e) =>
                      patch(i, { weight: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="wt"
                    inputMode="numeric"
                    title="Weight (optional, aim for a total of 100)"
                    className="field-input w-16 text-center"
                  />
                  <div className="flex shrink-0 flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="text-ink-faint hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === sections.length - 1}
                      aria-label="Move down"
                      className="text-ink-faint hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(i)}
                    aria-label="Remove section"
                    className="shrink-0 text-ink-faint hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={s.guidance ?? ""}
                  onChange={(e) => patch(i, { guidance: e.target.value })}
                  rows={3}
                  placeholder={"Guiding questions — one per line\nWhat did they build recently?\nHow do they handle trade-offs?"}
                  className="field-input mt-2 resize-y text-xs leading-relaxed"
                />
              </div>
            ))}
            {sections.length === 0 && (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
                No sections — add one, import a document, or reset to the standard guide.
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={add}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas"
            >
              <Plus className="h-3.5 w-3.5" /> Add section
            </button>
            <button
              onClick={resetToStandard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to standard
            </button>
            <div className="flex-1" />
            <button
              disabled={busy !== null || !dirty}
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {busy === "save" ? "Saving…" : "Save guide"}
            </button>
          </div>
          {savedAt && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Saved — every requisition created from now on starts with this guide.
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </Card>

        {/* --------------------------- Import --------------------------- */}
        <Card className="card-pad">
          <CardHeader
            title="Import an existing interview"
            action={<FileUp className="h-4 w-4 text-brand-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Already have an interview doc? Upload it (.txt / .md) or paste it below — headings
            become sections and questions become guidance. The result lands in the editor for
            review; nothing saves until you click Save.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".txt,.md,.markdown,text/plain" onChange={onFile} className="hidden" />
            <button
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
            >
              <FileUp className="h-3.5 w-3.5" /> Upload file
            </button>
            <span className="text-[11px] text-ink-faint">.txt or .md — or paste below</span>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            placeholder={"Paste an interview document…\n\n1. Technical depth (40%)\n- Walk me through your last project\n- How did you test it?\n\n2. Teamwork\n- Tell me about a disagreement with a teammate"}
            className="field-input mt-2 resize-y font-mono text-xs leading-relaxed"
          />
          <button
            disabled={busy !== null || !importText.trim()}
            onClick={() => runImport(importText)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> {busy === "import" ? "Importing…" : "Import into editor"}
          </button>
          {importNote && (
            <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-700">{importNote}</p>
          )}
        </Card>
      </div>

      {/* --------------------- Live interviewer preview --------------------- */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="card-pad">
          <CardHeader
            title="Interviewer preview"
            action={<Eye className="h-4 w-4 text-brand-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Live preview of what every panel member sees in their Interview Guide.
          </p>
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
            <p className="text-xs font-semibold text-ink">Your interview guide</p>
            <div className="mt-3 space-y-3">
              {sections.filter((s) => s.name.trim()).map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink-soft">
                      {s.name}
                      {s.weight != null && (
                        <span className="text-ink-faint"> · weight {s.weight}</span>
                      )}
                    </span>
                    <span className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-line bg-white text-[10px] font-bold text-ink-faint"
                        >
                          {n}
                        </span>
                      ))}
                    </span>
                  </div>
                  {s.guidance?.trim() && (
                    <ul className="mt-1.5 space-y-0.5 rounded-lg bg-white/70 px-2.5 py-1.5">
                      {s.guidance
                        .split("\n")
                        .filter(Boolean)
                        .map((q, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[11px] text-ink-muted">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                            {q}
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-1.5 h-7 rounded-lg border border-dashed border-line bg-white/60 px-2 text-[10px] leading-7 text-ink-faint">
                    Interview notes / evidence for this section…
                  </div>
                </div>
              ))}
              {sections.filter((s) => s.name.trim()).length === 0 && (
                <p className="text-xs text-ink-muted">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
