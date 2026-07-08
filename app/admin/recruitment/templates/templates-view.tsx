"use client";

import * as React from "react";
import { Mail, Pencil, Plus, Trash2, X, Zap } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { createTemplate, deleteTemplate, updateTemplate } from "@/app/actions/recruitment";
import {
  TEMPLATE_VARIABLES,
  type CommunicationTemplateEntry,
  type TemplateTrigger,
} from "@/lib/recruitment";

const TRIGGERS: TemplateTrigger[] = ["Application Received", "Interview Scheduled", "Rejected", "Manual"];

const triggerTone: Record<TemplateTrigger, "sky" | "brand" | "red" | "gray"> = {
  "Application Received": "sky",
  "Interview Scheduled": "brand",
  Rejected: "red",
  Manual: "gray",
};

interface Draft {
  id?: string;
  name: string;
  subject: string;
  body: string;
  trigger: TemplateTrigger;
}

const EMPTY: Draft = { name: "", subject: "", body: "", trigger: "Manual" };

export function TemplatesView({ initial }: { initial: CommunicationTemplateEntry[] }) {
  const [templates, setTemplates] = React.useState(initial);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const valid = draft && draft.name.trim() && draft.subject.trim() && draft.body.trim();

  async function save() {
    if (!draft || !valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = draft.id
        ? await updateTemplate(draft.id, {
            name: draft.name.trim(),
            subject: draft.subject.trim(),
            body: draft.body,
            trigger: draft.trigger,
          })
        : await createTemplate({
            name: draft.name.trim(),
            subject: draft.subject.trim(),
            body: draft.body,
            trigger: draft.trigger,
          });
      setTemplates(updated);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setTemplates(await deleteTemplate(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Communication Templates"
        subtitle="Automated, customizable messages that keep every candidate informed — receipt confirmations, interview invites and rejections."
        action={
          <button
            onClick={() => setDraft({ ...EMPTY })}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> New Template
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</p>
      )}

      {draft && (
        <Card className="card-pad mb-5 border-brand-200">
          <CardHeader
            title={draft.id ? "Edit template" : "New template"}
            action={
              <button onClick={() => setDraft(null)} className="text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            }
          />
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="field-label">Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="field-input"
                  placeholder="Offer Letter Follow-up"
                />
              </div>
              <div>
                <label className="field-label">Automated trigger</label>
                <select
                  value={draft.trigger}
                  onChange={(e) => setDraft({ ...draft, trigger: e.target.value as TemplateTrigger })}
                  className="field-input"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Manual templates are only sent by hand from a candidate&apos;s page.
                </p>
              </div>
              <div>
                <label className="field-label">Variables</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setDraft({ ...draft, body: `${draft.body}{{${v}}}` })}
                      className="rounded-lg bg-canvas px-2 py-1 font-mono text-[11px] text-brand-700 dark:text-brand-400 hover:bg-brand-50"
                    >
                      {"{{" + v + "}}"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="field-label">Subject</label>
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className="field-input"
                  placeholder="Update on your application for {{job_title}}"
                />
              </div>
              <div>
                <label className="field-label">Body</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={8}
                  className="field-input resize-none font-mono text-xs"
                  placeholder={"Hi {{candidate_name}},\n\n…"}
                />
              </div>
              <button
                disabled={!valid || busy}
                onClick={save}
                className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : draft.id ? "Save changes" : "Create template"}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="card-pad">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{t.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <Zap className="h-3 w-3" />
                    <Badge tone={triggerTone[t.trigger]}>{t.trigger}</Badge>
                    {t.isDefault && <span className="text-ink-faint">· default</span>}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() =>
                    setDraft({ id: t.id, name: t.name, subject: t.subject, body: t.body, trigger: t.trigger })
                  }
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs font-semibold text-ink-soft">{t.subject}</p>
            <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">
              {t.body}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
