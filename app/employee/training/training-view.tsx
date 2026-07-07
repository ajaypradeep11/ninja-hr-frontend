"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import {
  createPeerCourse,
  deletePeerCourse,
  updateAssignment,
  updatePeerCourse,
} from "@/app/actions/training";
import { askCoPilot } from "@/app/actions/ai";
import type { TrainingCourse } from "@/lib/data";
import type { TrainingAssignment } from "@/lib/training";
import { formatDate } from "@/lib/utils";

const statusTone: Record<string, "gray" | "amber" | "green"> = {
  Assigned: "gray",
  "In-Progress": "amber",
  Completed: "green",
};

const courseTone: Record<string, "gray" | "amber" | "green" | "red"> = {
  Draft: "gray",
  "Pending HR Approval": "amber",
  Published: "green",
  Rejected: "red",
};

type Tab = "learning" | "studio";
type CreatePath = "recording" | "ai" | "blank";

interface CourseForm {
  title: string;
  category: string;
  durationMins: string;
  contentUrl: string;
  description: string;
}

const EMPTY_FORM: CourseForm = { title: "", category: "", durationMins: "", contentUrl: "", description: "" };

const PATHS: { key: CreatePath; icon: React.ElementType; title: string; blurb: string }[] = [
  {
    key: "recording",
    icon: Video,
    title: "Screen Recording",
    blurb: "Capture your screen to walk your team through a software or process.",
  },
  {
    key: "ai",
    icon: Sparkles,
    title: "AI Slide Builder",
    blurb: "Upload a document or type a prompt, and our AI will generate a structured lesson.",
  },
  {
    key: "blank",
    icon: Plus,
    title: "Blank Canvas",
    blurb: "Build a text, image, or video lesson from scratch.",
  },
];

/** Deterministic lesson outline used when the AI Co-Pilot isn't live. */
function fallbackOutline(topic: string): string {
  const t = topic.trim() || "this topic";
  return [
    `Lesson outline: ${t}`,
    "",
    "1. Why it matters — the problem this solves and who it helps.",
    `2. Key concepts — the 3–5 terms and ideas everyone needs to know about ${t}.`,
    "3. Step-by-step walkthrough — do it once slowly, together.",
    "4. Common mistakes — what usually goes wrong and how to avoid it.",
    "5. Practice task — a small hands-on exercise to confirm understanding.",
    "6. Where to get help — docs, channels, and who to ask.",
  ].join("\n");
}

export function EmployeeTrainingView({
  initial,
  initialCourses,
}: {
  initial: TrainingAssignment[];
  initialCourses: TrainingCourse[];
}) {
  const [tab, setTab] = React.useState<Tab>("learning");
  const [items, setItems] = React.useState(initial);
  const [courses, setCourses] = React.useState(initialCourses);
  const [busy, setBusy] = React.useState<string | null>(null);

  // Slide-over state
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [path, setPath] = React.useState<CreatePath | null>(null);
  const [editing, setEditing] = React.useState<TrainingCourse | null>(null);
  const [form, setForm] = React.useState<CourseForm>(EMPTY_FORM);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState<"draft" | "submit" | null>(null);
  const [panelError, setPanelError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<TrainingCourse | null>(null);

  async function setStatus(id: string, status: "In-Progress" | "Completed") {
    setBusy(id);
    try {
      const updated = await updateAssignment(id, { status });
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } finally {
      setBusy(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setPath(null);
    setForm(EMPTY_FORM);
    setAiPrompt("");
    setPanelError(null);
    setPanelOpen(true);
    setTab("studio");
  }

  function openEdit(course: TrainingCourse) {
    setEditing(course);
    setPath("blank");
    setForm({
      title: course.title,
      category: course.category,
      durationMins: course.durationMins ? String(course.durationMins) : "",
      contentUrl: course.contentUrl ?? "",
      description: course.description ?? "",
    });
    setAiPrompt("");
    setPanelError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
    setPath(null);
  }

  async function generateLesson() {
    const topic = aiPrompt.trim() || form.title.trim();
    if (!topic) {
      setPanelError("Describe the lesson (or set a title) so the AI knows what to build.");
      return;
    }
    setGenerating(true);
    setPanelError(null);
    try {
      const res = await askCoPilot(
        `Create a structured training lesson for coworkers on: ${topic}. ` +
          `Write a concise course description followed by a numbered module outline (5-7 modules) with one line each.`,
        "employee",
      );
      const text = res.text?.trim();
      setForm((f) => ({
        ...f,
        title: f.title || topic.slice(0, 120),
        description: text && text.length > 40 ? text : fallbackOutline(topic),
      }));
    } catch {
      setForm((f) => ({ ...f, title: f.title || topic.slice(0, 120), description: fallbackOutline(topic) }));
    } finally {
      setGenerating(false);
    }
  }

  async function saveCourse(submit: boolean) {
    if (!form.title.trim() || !form.category.trim()) {
      setPanelError("A title and category are required.");
      return;
    }
    setSaving(submit ? "submit" : "draft");
    setPanelError(null);
    const input = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      contentUrl: form.contentUrl.trim() || undefined,
      durationMins: form.durationMins ? Number(form.durationMins) : undefined,
    };
    try {
      let next: TrainingCourse[];
      if (editing) {
        next = await updatePeerCourse(editing.id, { ...input, ...(submit ? { submit: true } : {}) });
      } else {
        next = await createPeerCourse(input);
        if (submit) {
          // my-courses is newest-first, so the course we just created leads the list.
          const created = next.find((c) => c.title === input.title && c.status === "Draft");
          if (created) next = await updatePeerCourse(created.id, { submit: true });
        }
      }
      setCourses(next);
      closePanel();
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : "Something went wrong — please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function removeCourse(course: TrainingCourse) {
    if (!confirm(`Delete “${course.title}”? This can't be undone.`)) return;
    setBusy(course.id);
    try {
      setCourses(await deletePeerCourse(course.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete the course.");
    } finally {
      setBusy(null);
    }
  }

  const outstanding = items.filter((a) => a.status !== "Completed");
  const completed = items.filter((a) => a.status === "Completed");

  return (
    <div>
      <PageHeader
        title="My Training"
        subtitle="Complete assigned courses — and share your own knowledge with the team."
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Create Course
          </button>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-line">
        {(
          [
            { key: "learning", label: "My Learning" },
            { key: "studio", label: "Creator Studio", count: courses.length },
          ] as { key: Tab; label: string; count?: number }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "-mb-px border-b-2 border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600"
                : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
            }
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "learning" ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-4">
            <Card className="card-pad">
              <p className="text-2xl font-bold text-ink">{items.length}</p>
              <p className="text-[11px] text-ink-muted">Assigned</p>
            </Card>
            <Card className="card-pad">
              <p className="text-2xl font-bold text-amber-600">{outstanding.length}</p>
              <p className="text-[11px] text-ink-muted">Outstanding</p>
            </Card>
            <Card className="card-pad">
              <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
              <p className="text-[11px] text-ink-muted">Completed</p>
            </Card>
          </div>

          {items.length === 0 ? (
            <Card className="card-pad">
              <p className="text-sm text-ink-muted">No training assigned to you right now. 🎉</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((a) => {
                const overdue =
                  a.status !== "Completed" && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <Card key={a.id} className="card-pad">
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{a.courseTitle}</p>
                          <Badge tone="gray">{a.courseCategory}</Badge>
                          <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                          {overdue && <Badge tone="red">Overdue</Badge>}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <ProgressBar value={a.progress} className="max-w-xs" />
                          <span className="text-[11px] font-medium text-ink-muted">{a.progress}%</span>
                          {a.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
                              <Clock className="h-3 w-3" /> Due {formatDate(a.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {a.contentUrl && (
                          <a
                            href={a.contentUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {a.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" /> Done
                          </span>
                        ) : a.status === "Assigned" ? (
                          <button
                            onClick={() => setStatus(a.id, "In-Progress")}
                            disabled={busy === a.id}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50"
                          >
                            Start
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(a.id, "Completed")}
                            disabled={busy === a.id}
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            {busy === a.id ? "Saving…" : "Mark complete"}
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : /* ------------------------- Creator Studio ------------------------- */
      courses.length === 0 ? (
        <Card className="card-pad">
          <div className="flex flex-col items-center py-10 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-brand-600 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="text-base font-bold text-ink">Share what you know</h2>
            <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
              Record your screen or let AI turn your documents into interactive courses. Once HR
              approves, your guide becomes available to the whole team.
            </p>
            <button
              onClick={openCreate}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Plus className="h-4 w-4" /> Start your first guide
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Engagement</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const status = c.status ?? "Draft";
                const locked = status === "Published";
                return (
                  <tr key={c.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{c.title}</p>
                      <p className="text-[11px] text-ink-muted">
                        {c.category}
                        {c.durationMins ? ` · ${c.durationMins} min` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={courseTone[status] ?? "gray"}>{status}</Badge>
                      {status === "Rejected" && (
                        <p className="mt-1 text-[10px] text-ink-faint">Edit &amp; resubmit for review</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status === "Published" ? (
                        <span className="text-xs text-ink-soft">
                          <span className="font-semibold text-ink">{c.completedCount ?? 0}</span> peer completion
                          {(c.completedCount ?? 0) === 1 ? "" : "s"}
                          {c.assignedCount ? (
                            <span className="text-ink-faint"> · {c.assignedCount} assigned</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreview(c)}
                          title="Preview"
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          disabled={locked}
                          title={locked ? "Published courses are managed by HR" : "Edit"}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeCourse(c)}
                          disabled={locked || busy === c.id}
                          title={locked ? "Published courses are managed by HR" : "Delete"}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* --------------------- Create / Edit slide-over --------------------- */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  {editing ? "Edit course" : path ? "Course details" : "Create Course"}
                </h2>
                <p className="text-[11px] text-ink-muted">
                  {editing
                    ? editing.status === "Rejected"
                      ? "This course was rejected — update it and resubmit for review."
                      : "Drafts stay private until you submit them for HR approval."
                    : path
                      ? PATHS.find((p) => p.key === path)?.title
                      : "How do you want to share your knowledge?"}
                </p>
              </div>
              <button onClick={closePanel} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!path ? (
              /* Step 1 — pick a creation path */
              <div className="space-y-3 p-6">
                {PATHS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPath(p.key)}
                    className="flex w-full items-start gap-4 rounded-xl border border-line p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                      <p.icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">{p.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{p.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* Step 2 — course form */
              <div className="flex-1 space-y-4 p-6">
                {path === "recording" && !editing && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
                    <span className="font-semibold">Screen recorder</span> — recording is simulated in this
                    demo. Capture your walkthrough with your usual tool (Loom, Teams, OBS…) and paste the
                    video link below.
                  </div>
                )}

                {path === "ai" && !editing && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                      What should the lesson teach?
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={3}
                      placeholder="e.g. How to file expense reports in our finance portal, step by step"
                      className="mt-1.5 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                    <button
                      onClick={generateLesson}
                      disabled={generating}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {generating ? "Generating…" : "Generate lesson"}
                    </button>
                    <p className="mt-1.5 text-[10px] text-ink-faint">
                      The generated outline lands in the description below — edit it freely.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    maxLength={160}
                    placeholder="e.g. Mastering our CRM in 20 minutes"
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      maxLength={80}
                      placeholder="e.g. Tools & Software"
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      Duration (mins)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.durationMins}
                      onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))}
                      placeholder="20"
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {path === "recording" ? "Video link" : "Content link"}
                  </label>
                  <input
                    value={form.contentUrl}
                    onChange={(e) => setForm((f) => ({ ...f, contentUrl: e.target.value }))}
                    maxLength={500}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Description / lesson outline
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={path === "ai" ? 10 : 6}
                    maxLength={8000}
                    placeholder="What will peers learn? Outline the modules or key steps."
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>

                {panelError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{panelError}</p>
                )}
              </div>
            )}

            {path && (
              <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
                {!editing ? (
                  <button
                    onClick={() => setPath(null)}
                    className="text-xs font-semibold text-ink-muted hover:text-ink"
                  >
                    ← Change method
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveCourse(false)}
                    disabled={saving !== null}
                    className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50"
                  >
                    {saving === "draft" ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    onClick={() => saveCourse(true)}
                    disabled={saving !== null}
                    className="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving === "submit"
                      ? "Submitting…"
                      : editing?.status === "Rejected"
                        ? "Resubmit for approval"
                        : "Submit for HR approval"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------- Preview ---------------------------- */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPreview(null)} />
          <div className="relative max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-ink">{preview.title}</h2>
                  <Badge tone={courseTone[preview.status ?? "Draft"] ?? "gray"}>{preview.status ?? "Draft"}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {preview.category}
                  {preview.durationMins ? ` · ${preview.durationMins} min` : ""}
                  {preview.creatorName ? ` · by ${preview.creatorName}` : ""}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {preview.contentUrl && (
              <a
                href={preview.contentUrl}
                target="_blank"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Open course content <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="mt-4 rounded-xl bg-canvas p-4">
              {preview.description ? (
                <p className="whitespace-pre-wrap text-sm text-ink-soft">{preview.description}</p>
              ) : (
                <p className="text-sm italic text-ink-faint">No description yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
