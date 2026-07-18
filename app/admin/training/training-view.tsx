"use client";

import * as React from "react";
import { Clock, FileUp, GraduationCap, Image as ImageIcon, Paperclip, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import type { Employee } from "@/lib/data";
import type { TrainingCourse } from "@/lib/data";
import { TRAINING_CATEGORIES } from "@/lib/training";
import { assignTraining, createCourse, deleteCourse } from "@/app/actions/training";
import { cn } from "@/lib/utils";

// Uploaded course material: PDF, images, Word, or PowerPoint, up to 8MB
// (mirrors the vault upload cap; the backend enforces the same set).
const MAX_MATERIAL_BYTES = 8 * 1024 * 1024;
// Cover image: catalog-card art, kept small.
const MAX_COVER_BYTES = 3 * 1024 * 1024;
const COVER_MIME = ["image/png", "image/jpeg", "image/webp"];
const MATERIAL_MIME: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
};

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function TrainingView({
  initialCourses,
  employees,
}: {
  initialCourses: TrainingCourse[];
  employees: Employee[];
}) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [creating, setCreating] = React.useState(false);
  const [assignFor, setAssignFor] = React.useState<TrainingCourse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const totalAssigned = courses.reduce((s, c) => s + (c.assignedCount ?? 0), 0);
  const totalCompleted = courses.reduce((s, c) => s + (c.completedCount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Create company training and assign it to your team. Track completion in the Tracker."
        action={
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> New Course
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Courses" value={courses.length} hint="In your catalog" />
        <Stat label="Active" value={courses.filter((c) => c.active).length} tone="green" hint="Assignable" />
        <Stat label="Assignments" value={totalAssigned} tone="sky" hint="Across all courses" />
        <Stat
          label="Completion"
          value={totalAssigned ? `${Math.round((totalCompleted / totalAssigned) * 100)}%` : "—"}
          tone="brand"
          hint={`${totalCompleted}/${totalAssigned} done`}
        />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</p>}

      {creating && (
        <CreateCourse
          onCreated={(c) => {
            setCourses(c);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {courses.length === 0 && !creating && (
          <Card className="card-pad lg:col-span-2">
            <p className="text-sm text-ink-muted">
              No courses yet — create your first company training course to assign it to employees.
            </p>
          </Card>
        )}
        {courses.map((c) => (
          <Card key={c.id} className="card-pad overflow-hidden">
            {/* Cover banner — streamed via the authenticated proxy when present. */}
            {c.hasCover && (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated same-origin proxy, not a static asset
              <img
                src={`/api/training/${c.id}/cover`}
                alt=""
                className="-mx-5 -mt-5 mb-4 h-28 w-[calc(100%+2.5rem)] max-w-none object-cover"
              />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{c.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                    <Badge tone="gray">{c.category}</Badge>
                    {c.durationMins && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {c.durationMins}m
                      </span>
                    )}
                    {c.passMark != null && <span>· pass {c.passMark}%</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setError(null);
                  try {
                    setCourses(await deleteCourse(c.id));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete course");
                  }
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {c.description && (
              <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">{c.description}</p>
            )}
            {c.hasMaterial && (
              <a
                href={`/api/training/${c.id}/material`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-brand-700 dark:text-brand-400 hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.materialFileName ?? "Course material"}</span>
              </a>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                <Users className="h-3.5 w-3.5" /> {c.assignedCount ?? 0} assigned · {c.completedCount ?? 0} completed
              </span>
              <button
                onClick={() => setAssignFor(c)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign
              </button>
            </div>
          </Card>
        ))}
      </div>

      {assignFor && (
        <AssignDialog
          course={assignFor}
          employees={employees}
          onClose={() => setAssignFor(null)}
          onAssigned={() => setAssignFor(null)}
        />
      )}
    </div>
  );
}

function CreateCourse({
  onCreated,
  onCancel,
}: {
  onCreated: (c: TrainingCourse[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(TRAINING_CATEGORIES[0]);
  const [description, setDescription] = React.useState("");
  const [contentUrl, setContentUrl] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [passMark, setPassMark] = React.useState("");
  const [material, setMaterial] = React.useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [cover, setCover] = React.useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const coverInput = React.useRef<HTMLInputElement>(null);

  async function selectCover(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError(null);
    if (!COVER_MIME.includes(selected.type)) {
      setError("The cover must be a PNG, JPEG, or WebP image.");
      return;
    }
    if (selected.size > MAX_COVER_BYTES) {
      setError("The cover image must be under 3MB.");
      return;
    }
    setCover({ name: selected.name, mimeType: selected.type, base64: toBase64(await selected.arrayBuffer()) });
  }

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file after a remove
    if (!selected) return;
    setError(null);
    if (!MATERIAL_MIME[selected.type]) {
      setError("Course material must be a PDF, image, Word, or PowerPoint file.");
      return;
    }
    if (selected.size > MAX_MATERIAL_BYTES) {
      setError("The material file must be under 8MB.");
      return;
    }
    setMaterial({ name: selected.name, mimeType: selected.type, base64: toBase64(await selected.arrayBuffer()) });
  }

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await createCourse({
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          contentUrl: contentUrl.trim() || undefined,
          durationMins: duration ? Number(duration) : undefined,
          passMark: passMark ? Number(passMark) : undefined,
          materialFileName: material?.name,
          materialMimeType: material?.mimeType,
          materialDataBase64: material?.base64,
          coverImageMimeType: cover?.mimeType,
          coverImageDataBase64: cover?.base64,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-pad mb-5 border-brand-200">
      <CardHeader
        title="New course"
        action={
          <button onClick={onCancel} className="text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" placeholder="Workplace Health & Safety Orientation" />
        </div>
        <div>
          <label className="field-label">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-input">
            {TRAINING_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Content link (optional)</label>
          <input value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} className="field-input" placeholder="https://…" />
        </div>
        <div>
          <label className="field-label">Duration (min)</label>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} className="field-input" inputMode="numeric" placeholder="45" />
        </div>
        <div>
          <label className="field-label">Pass mark % (optional)</label>
          <input value={passMark} onChange={(e) => setPassMark(e.target.value)} className="field-input" inputMode="numeric" placeholder="80" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="field-input resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Course material (optional)</label>
          <input
            ref={fileInput}
            type="file"
            accept={Object.keys(MATERIAL_MIME).join(",")}
            onChange={selectFile}
            className="hidden"
          />
          {material ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm text-ink">
                <Paperclip className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="truncate">{material.name}</span>
                <Badge tone="gray">{MATERIAL_MIME[material.mimeType]}</Badge>
              </span>
              <button
                type="button"
                onClick={() => setMaterial(null)}
                className="shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:border-brand-300 hover:text-ink"
            >
              <FileUp className="h-4 w-4" /> Upload a file (PDF, image, Word, or PowerPoint · 8MB max)
            </button>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Cover image (optional)</label>
          <input
            ref={coverInput}
            type="file"
            accept={COVER_MIME.join(",")}
            onChange={selectCover}
            className="hidden"
          />
          {cover ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-2.5">
              <span className="inline-flex min-w-0 items-center gap-3 text-sm text-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data-URI preview */}
                <img
                  src={`data:${cover.mimeType};base64,${cover.base64}`}
                  alt="Cover preview"
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
                <span className="truncate">{cover.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setCover(null)}
                className="shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
                aria-label="Remove cover image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:border-brand-300 hover:text-ink"
            >
              <ImageIcon className="h-4 w-4" /> Upload a cover image (PNG, JPEG, or WebP · 3MB max)
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-300">{error}</p>}
      <button
        onClick={save}
        disabled={!title.trim() || busy}
        className="mt-4 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create course"}
      </button>
    </Card>
  );
}

function AssignDialog({
  course,
  employees,
  onClose,
  onAssigned,
}: {
  course: TrainingCourse;
  employees: Employee[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assign() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await assignTraining(course.id, [...selected], dueDate || undefined);
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">Assign training</p>
            <p className="text-xs text-ink-muted">{course.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-line px-5 py-3">
          <label className="field-label">Due date (optional)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="space-y-1">
            {employees.map((e) => (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
                  selected.has(e.id) ? "border-brand-300 bg-brand-50/60" : "border-line hover:bg-canvas",
                )}
              >
                <Avatar name={e.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{e.name}</span>
                  <span className="block truncate text-[11px] text-ink-muted">{e.title} · {e.department}</span>
                </span>
                {selected.has(e.id) && <Badge tone="brand">Selected</Badge>}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-line px-5 py-4">
          {error && <p className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
          <button
            onClick={assign}
            disabled={selected.size === 0 || busy}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Assigning…" : `Assign to ${selected.size} employee${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </>
  );
}
