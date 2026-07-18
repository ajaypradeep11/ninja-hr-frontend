"use client";

import * as React from "react";
import { AlertTriangle, Clock, FileUp, GraduationCap, Image as ImageIcon, ListChecks, Loader2, Paperclip, Pencil, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, PageHeader, ProgressBar, Stat } from "@/components/ui";
import type { Employee } from "@/lib/data";
import type { TrainingCourse } from "@/lib/data";
import type { TrainingAssignment, TrainingStatus } from "@/lib/training";
import { TRAINING_CATEGORIES } from "@/lib/training";
import {
  adminUpdateAssignment,
  assignTraining,
  createCourse,
  deleteAssignment,
  deleteCourse,
  getAllAssignments,
  getCourseAssignments,
  updateCourse,
} from "@/app/actions/training";
import { cn, formatDate } from "@/lib/utils";

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
  const [editing, setEditing] = React.useState<TrainingCourse | null>(null);
  const [assignFor, setAssignFor] = React.useState<TrainingCourse | null>(null);
  const [manageFor, setManageFor] = React.useState<TrainingCourse | null>(null);
  const [statDrawer, setStatDrawer] = React.useState<StatKind | null>(null);
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const totalAssigned = courses.reduce((s, c) => s + (c.assignedCount ?? 0), 0);
  const totalCompleted = courses.reduce((s, c) => s + (c.completedCount ?? 0), 0);
  const activeCount = courses.filter((c) => c.active).length;
  const completionPct = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  const q = query.trim().toLowerCase();
  const visibleCourses = q
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q),
      )
    : courses;

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Create company training and assign it to your team. Track completion in the Tracker."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> New Course
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Courses" value={courses.length} hint="In your catalog" onClick={() => setStatDrawer("courses")} />
        <Stat label="Active" value={activeCount} tone="green" hint="Assignable" onClick={() => setStatDrawer("active")} />
        <Stat label="Assignments" value={totalAssigned} tone="sky" hint="Across all courses" onClick={() => setStatDrawer("assignments")} />
        <Stat
          label="Completion"
          value={totalAssigned ? `${completionPct}%` : "—"}
          tone="brand"
          hint={`${totalCompleted}/${totalAssigned} done`}
          onClick={() => setStatDrawer("completion")}
        />
      </div>

      {/* Search across the catalog. */}
      <div className="mb-5 relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses by title, category, or description…"
          className="field-input w-full pl-10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-faint hover:bg-canvas hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</p>}

      {(creating || editing) && (
        <CourseForm
          editing={editing}
          onSaved={(c) => {
            setCourses(c);
            setCreating(false);
            setEditing(null);
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
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
        {courses.length > 0 && visibleCourses.length === 0 && (
          <Card className="card-pad lg:col-span-2">
            <p className="text-sm text-ink-muted">
              No courses match “{query}”. <button onClick={() => setQuery("")} className="font-semibold text-brand-700 dark:text-brand-400 hover:underline">Clear search</button>
            </p>
          </Card>
        )}
        {visibleCourses.map((c) => (
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
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(c);
                  }}
                  title="Edit course"
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete “${c.title}”? This removes the course and all its assignments.`)) return;
                    setError(null);
                    try {
                      setCourses(await deleteCourse(c.id));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to delete course");
                    }
                  }}
                  title="Delete course"
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setManageFor(c)}
                  disabled={!c.assignedCount}
                  title={c.assignedCount ? "Manage assignments" : "No one assigned yet"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-line/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ListChecks className="h-3.5 w-3.5" /> Manage
                </button>
                <button
                  onClick={() => setAssignFor(c)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Assign
                </button>
              </div>
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

      {manageFor && <ManageAssignments course={manageFor} onClose={() => setManageFor(null)} />}

      {statDrawer && (
        <StatDrawer
          kind={statDrawer}
          courses={courses}
          onClose={() => setStatDrawer(null)}
          onManage={(c) => {
            setStatDrawer(null);
            setManageFor(c);
          }}
          onAssign={(c) => {
            setStatDrawer(null);
            setAssignFor(c);
          }}
        />
      )}
    </div>
  );
}

/* ============================= Stat drawers ============================= */

type StatKind = "courses" | "active" | "assignments" | "completion";

const STAT_META: Record<StatKind, { title: string; subtitle: string }> = {
  courses: { title: "All courses", subtitle: "Everything in your training catalog" },
  active: { title: "Active courses", subtitle: "Courses employees can currently be assigned" },
  assignments: { title: "All assignments", subtitle: "Every employee training record across courses" },
  completion: { title: "Completion", subtitle: "How your assigned training is progressing" },
};

const ASSIGN_STATUS_TONE: Record<TrainingStatus, "gray" | "amber" | "green"> = {
  Assigned: "gray",
  "In-Progress": "amber",
  Completed: "green",
};

/** An assignment past its due date that isn't complete. */
function isOverdue(a: TrainingAssignment): boolean {
  return !!a.dueDate && a.status !== "Completed" && new Date(a.dueDate) < new Date();
}

/** Right drawer that explains what's behind a clicked stat box. */
function StatDrawer({
  kind,
  courses,
  onClose,
  onManage,
  onAssign,
}: {
  kind: StatKind;
  courses: TrainingCourse[];
  onClose: () => void;
  onManage: (c: TrainingCourse) => void;
  onAssign: (c: TrainingCourse) => void;
}) {
  const needsAssignments = kind === "assignments" || kind === "completion";
  const [assignments, setAssignments] = React.useState<TrainingAssignment[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!needsAssignments) return;
    let live = true;
    setAssignments(null);
    setLoadError(null);
    getAllAssignments()
      .then((rows) => live && setAssignments(rows))
      .catch((e) => live && setLoadError(e instanceof Error ? e.message : "Failed to load assignments"));
    return () => {
      live = false;
    };
  }, [kind, needsAssignments]);

  const meta = STAT_META[kind];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">{meta.title}</p>
            <p className="text-xs text-ink-muted">{meta.subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {(kind === "courses" || kind === "active") && (
            <CourseListDrawer kind={kind} courses={courses} onManage={onManage} onAssign={onAssign} />
          )}
          {needsAssignments &&
            (loadError ? (
              <p className="py-8 text-center text-sm text-red-600 dark:text-red-300">{loadError}</p>
            ) : assignments === null ? (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : kind === "assignments" ? (
              <AssignmentsDrawer assignments={assignments} courses={courses} onManage={onManage} />
            ) : (
              <CompletionDrawer assignments={assignments} courses={courses} onManage={onManage} />
            ))}
        </div>
      </div>
    </>
  );
}

/** Courses / Active tab: the catalog, each row actionable (Assign / Manage). */
function CourseListDrawer({
  kind,
  courses,
  onManage,
  onAssign,
}: {
  kind: "courses" | "active";
  courses: TrainingCourse[];
  onManage: (c: TrainingCourse) => void;
  onAssign: (c: TrainingCourse) => void;
}) {
  const shown = kind === "active" ? courses.filter((c) => c.active) : courses;
  const inactive = courses.length - courses.filter((c) => c.active).length;

  if (shown.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        {kind === "active" ? "No active courses — every course is currently inactive." : "No courses yet."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {kind === "active" && inactive > 0 && (
        <p className="mb-1 text-xs text-ink-faint">
          {inactive} inactive course{inactive === 1 ? "" : "s"} hidden — they can’t be assigned until reactivated.
        </p>
      )}
      {shown.map((c) => {
        const assigned = c.assignedCount ?? 0;
        const done = c.completedCount ?? 0;
        const pct = assigned ? Math.round((done / assigned) * 100) : 0;
        return (
          <div key={c.id} className="rounded-xl border border-line p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                  <Badge tone="gray">{c.category}</Badge>
                  {!c.active && <Badge tone="amber">Inactive</Badge>}
                  {c.durationMins ? <span>{c.durationMins}m</span> : null}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-ink-muted">
              <Users className="h-3.5 w-3.5" /> {assigned} assigned · {done} completed
              {assigned > 0 && <span className="ml-auto font-medium text-ink-soft">{pct}%</span>}
            </div>
            {assigned > 0 && <ProgressBar value={pct} tone="brand" className="mt-1.5" />}
            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                onClick={() => onAssign(c)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign
              </button>
              <button
                onClick={() => onManage(c)}
                disabled={!assigned}
                className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-line/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ListChecks className="h-3.5 w-3.5" /> Manage
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Small labeled count chip used in the assignment/completion drawers. */
function CountChip({ label, value, tone }: { label: string; value: number; tone: "gray" | "amber" | "green" | "red" }) {
  const toneCls = {
    gray: "bg-canvas text-ink-soft",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    green: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
  }[tone];
  return (
    <div className={cn("rounded-xl px-3 py-2", toneCls)}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium">{label}</p>
    </div>
  );
}

/** One assignment row (employee + course + status + due). */
function AssignmentRow({ a, onManage }: { a: TrainingAssignment; onManage: () => void }) {
  const overdue = isOverdue(a);
  return (
    <button
      onClick={onManage}
      className="flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-left transition hover:bg-canvas"
    >
      <Avatar name={a.employeeName} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{a.employeeName}</p>
        <p className="truncate text-[11px] text-ink-muted">
          {a.courseTitle}
          {a.dueDate && (
            <span className={overdue ? "text-red-600 dark:text-red-300" : ""}>
              {" "}· {overdue ? "overdue " : "due "}
              {formatDate(a.dueDate)}
            </span>
          )}
        </p>
      </div>
      {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
      <Badge tone={ASSIGN_STATUS_TONE[a.status]}>{a.status}</Badge>
    </button>
  );
}

/** Assignments tab: every record, overdue/in-progress first. */
function AssignmentsDrawer({
  assignments,
  courses,
  onManage,
}: {
  assignments: TrainingAssignment[];
  courses: TrainingCourse[];
  onManage: (c: TrainingCourse) => void;
}) {
  const byId = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const openCourse = (a: TrainingAssignment) => {
    const c = byId.get(a.courseId);
    if (c) onManage(c);
  };

  if (assignments.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No one is assigned to any course yet.</p>;
  }

  const completed = assignments.filter((a) => a.status === "Completed").length;
  const inProgress = assignments.filter((a) => a.status === "In-Progress").length;
  const notStarted = assignments.filter((a) => a.status === "Assigned").length;
  const overdue = assignments.filter(isOverdue).length;

  // Overdue first, then In-Progress, then Assigned, then Completed.
  const rank: Record<TrainingStatus, number> = { "In-Progress": 1, Assigned: 2, Completed: 3 };
  const sorted = [...assignments].sort((a, b) => {
    if (isOverdue(a) !== isOverdue(b)) return isOverdue(a) ? -1 : 1;
    return rank[a.status] - rank[b.status];
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <CountChip label="Not started" value={notStarted} tone="gray" />
        <CountChip label="In progress" value={inProgress} tone="amber" />
        <CountChip label="Completed" value={completed} tone="green" />
        <CountChip label="Overdue" value={overdue} tone="red" />
      </div>
      <div className="space-y-1.5">
        {sorted.map((a) => (
          <AssignmentRow key={a.id} a={a} onManage={() => openCourse(a)} />
        ))}
      </div>
    </div>
  );
}

/** Completion tab: overall progress, per-course bars, and what's outstanding. */
function CompletionDrawer({
  assignments,
  courses,
  onManage,
}: {
  assignments: TrainingAssignment[];
  courses: TrainingCourse[];
  onManage: (c: TrainingCourse) => void;
}) {
  const byId = React.useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const openCourse = (a: TrainingAssignment) => {
    const c = byId.get(a.courseId);
    if (c) onManage(c);
  };

  if (assignments.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-muted">No assignments yet — nothing to track.</p>;
  }

  const total = assignments.length;
  const completed = assignments.filter((a) => a.status === "Completed").length;
  const pct = Math.round((completed / total) * 100);
  const outstanding = assignments.filter((a) => a.status !== "Completed");
  const overdue = outstanding.filter(isOverdue);

  // Per-course completion, only courses with assignments, least-complete first.
  const perCourse = courses
    .map((c) => {
      const rows = assignments.filter((a) => a.courseId === c.id);
      const done = rows.filter((a) => a.status === "Completed").length;
      return { course: c, total: rows.length, done, pct: rows.length ? Math.round((done / rows.length) * 100) : 0 };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line p-4 text-center">
        <p className="text-3xl font-bold text-ink">{pct}%</p>
        <p className="mt-1 text-xs text-ink-muted">
          {completed} of {total} assignments completed
        </p>
        <ProgressBar value={pct} tone="brand" className="mt-3" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CountChip label="Completed" value={completed} tone="green" />
        <CountChip label="Outstanding" value={outstanding.length} tone="amber" />
        <CountChip label="Overdue" value={overdue.length} tone="red" />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">By course</p>
        <div className="space-y-2.5">
          {perCourse.map((r) => (
            <button
              key={r.course.id}
              onClick={() => onManage(r.course)}
              className="block w-full rounded-xl border border-line p-3 text-left transition hover:bg-canvas"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.course.title}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {r.done}/{r.total} · {r.pct}%
                </span>
              </div>
              <ProgressBar value={r.pct} tone={r.pct === 100 ? "green" : "brand"} className="mt-2" />
            </button>
          ))}
        </div>
      </div>

      {overdue.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Overdue ({overdue.length})
          </p>
          <div className="space-y-1.5">
            {overdue.map((a) => (
              <AssignmentRow key={a.id} a={a} onManage={() => openCourse(a)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: TrainingCourse | null;
  onSaved: (c: TrainingCourse[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [category, setCategory] = React.useState(editing?.category ?? TRAINING_CATEGORIES[0]);
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [contentUrl, setContentUrl] = React.useState(editing?.contentUrl ?? "");
  const [duration, setDuration] = React.useState(editing?.durationMins ? String(editing.durationMins) : "");
  const [passMark, setPassMark] = React.useState(editing?.passMark != null ? String(editing.passMark) : "");
  const [material, setMaterial] = React.useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [cover, setCover] = React.useState<{ name: string; mimeType: string; base64: string } | null>(null);
  // Edit mode: whether to drop the file/cover already stored on the course.
  const [removeMaterial, setRemoveMaterial] = React.useState(false);
  const [removeCover, setRemoveCover] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const coverInput = React.useRef<HTMLInputElement>(null);

  // Keep a peer/legacy category selectable even if it's not a preset.
  const categoryOptions = TRAINING_CATEGORIES.includes(category)
    ? TRAINING_CATEGORIES
    : [category, ...TRAINING_CATEGORIES];
  // Existing stored assets still in effect (edit mode, not replaced/removed).
  const keptMaterial = !!editing?.hasMaterial && !removeMaterial && !material;
  const keptCover = !!editing?.hasCover && !removeCover && !cover;

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
    setRemoveCover(false);
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
    setRemoveMaterial(false);
    setMaterial({ name: selected.name, mimeType: selected.type, base64: toBase64(await selected.arrayBuffer()) });
  }

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const base = {
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        contentUrl: contentUrl.trim() || undefined,
        durationMins: duration ? Number(duration) : undefined,
        passMark: passMark ? Number(passMark) : undefined,
      };
      const materialFields = material
        ? { materialFileName: material.name, materialMimeType: material.mimeType, materialDataBase64: material.base64 }
        : editing && removeMaterial
          ? { removeMaterial: true }
          : {};
      const coverFields = cover
        ? { coverImageMimeType: cover.mimeType, coverImageDataBase64: cover.base64 }
        : editing && removeCover
          ? { removeCover: true }
          : {};
      const payload = { ...base, ...materialFields, ...coverFields };
      onSaved(editing ? await updateCourse(editing.id, payload) : await createCourse(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : editing ? "Failed to save course" : "Failed to create course");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-pad mb-5 border-brand-200">
      <CardHeader
        title={editing ? "Edit course" : "New course"}
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
            {categoryOptions.map((c) => (
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
          ) : keptMaterial ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm text-ink">
                <Paperclip className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="truncate">{editing?.materialFileName ?? "Course material"}</span>
                <Badge tone="gray">Current</Badge>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-canvas"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveMaterial(true)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500"
                  aria-label="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
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
          ) : keptCover ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-2.5">
              <span className="inline-flex min-w-0 items-center gap-3 text-sm text-ink">
                {/* eslint-disable-next-line @next/next/no-img-element -- streamed from backend */}
                <img
                  src={`/api/training/${editing?.id}/cover`}
                  alt="Current cover"
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
                <span className="truncate text-ink-muted">Current cover</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-canvas"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setRemoveCover(true)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500"
                  aria-label="Remove cover image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
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
        {editing ? (busy ? "Saving…" : "Save changes") : busy ? "Creating…" : "Create course"}
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
  const [ackText, setAckText] = React.useState("");
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
      await assignTraining(course.id, [...selected], dueDate || undefined, ackText.trim() || undefined);
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
        <div className="space-y-3 border-b border-line px-5 py-3">
          <div>
            <label className="field-label">Due date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Acknowledgement message (optional)</label>
            <textarea
              value={ackText}
              onChange={(e) => setAckText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. I confirm I have read and understood this policy and agree to comply with it."
              className="field-input resize-none"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              If set, employees must e-sign this statement to complete the course.
            </p>
          </div>
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

const MANAGE_STATUS_TONE: Record<TrainingStatus, "gray" | "amber" | "green"> = {
  Assigned: "gray",
  "In-Progress": "amber",
  Completed: "green",
};

/** HR drawer to edit (due date / acknowledgement / status) or delete each
 *  employee's training record for a course. */
function ManageAssignments({ course, onClose }: { course: TrainingCourse; onClose: () => void }) {
  const [list, setList] = React.useState<TrainingAssignment[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rowError, setRowError] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ dueDate: string; acknowledgementText: string; status: TrainingStatus }>({
    dueDate: "",
    acknowledgementText: "",
    status: "Assigned",
  });

  React.useEffect(() => {
    let live = true;
    getCourseAssignments(course.id)
      .then((rows) => live && setList(rows))
      .catch((e) => live && setLoadError(e instanceof Error ? e.message : "Failed to load assignments"));
    return () => {
      live = false;
    };
  }, [course.id]);

  function startEdit(a: TrainingAssignment) {
    setRowError(null);
    setEditingId(a.id);
    setForm({
      dueDate: a.dueDate ?? "",
      acknowledgementText: a.acknowledgementText ?? "",
      status: a.status,
    });
  }

  async function saveRow(a: TrainingAssignment) {
    setBusyId(a.id);
    setRowError(null);
    try {
      const rows = await adminUpdateAssignment(a.id, {
        dueDate: form.dueDate,
        acknowledgementText: form.acknowledgementText,
        status: form.status,
      });
      setList(rows);
      setEditingId(null);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(a: TrainingAssignment) {
    if (!confirm(`Delete ${a.employeeName}'s record for “${a.courseTitle}”? This can't be undone.`)) return;
    setBusyId(a.id);
    setRowError(null);
    try {
      setList(await deleteAssignment(a.id));
      if (editingId === a.id) setEditingId(null);
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "Failed to delete record");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-card shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">Manage assignments</p>
            <p className="text-xs text-ink-muted">{course.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {rowError && <p className="mb-3 text-xs text-red-600 dark:text-red-300">{rowError}</p>}
          {loadError ? (
            <p className="py-8 text-center text-sm text-red-600 dark:text-red-300">{loadError}</p>
          ) : list === null ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">No one is assigned to this course.</p>
          ) : (
            <div className="space-y-2">
              {list.map((a) => {
                const isEditing = editingId === a.id;
                const rowBusy = busyId === a.id;
                return (
                  <div key={a.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.employeeName} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{a.employeeName}</p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {a.dueDate ? `Due ${formatDate(a.dueDate)}` : "No due date"}
                          {a.acknowledgedAt && ` · signed ${formatDate(a.acknowledgedAt)}`}
                          {!a.acknowledgedAt && a.acknowledgementText && " · e-sign required"}
                        </p>
                      </div>
                      <Badge tone={MANAGE_STATUS_TONE[a.status]}>{a.status}</Badge>
                      {!isEditing && (
                        <span className="flex items-center gap-0.5">
                          <button
                            onClick={() => startEdit(a)}
                            disabled={rowBusy}
                            title="Edit assignment"
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-canvas hover:text-ink disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeRow(a)}
                            disabled={rowBusy}
                            title="Delete record"
                            className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 disabled:opacity-50"
                          >
                            {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </span>
                      )}
                    </div>

                    {isEditing && (
                      <div className="mt-3 space-y-3 border-t border-line pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="field-label">Due date</label>
                            <input
                              type="date"
                              value={form.dueDate}
                              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                              className="field-input"
                            />
                          </div>
                          <div>
                            <label className="field-label">Status</label>
                            <select
                              value={form.status}
                              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TrainingStatus }))}
                              className="field-input"
                            >
                              <option value="Assigned">Assigned</option>
                              <option value="In-Progress">In-Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="field-label">Acknowledgement message</label>
                          <textarea
                            value={form.acknowledgementText}
                            onChange={(e) => setForm((f) => ({ ...f, acknowledgementText: e.target.value }))}
                            rows={2}
                            maxLength={2000}
                            placeholder="Leave blank for no e-sign requirement."
                            className="field-input resize-none"
                          />
                          {a.acknowledgedAt && (
                            <p className="mt-1 text-[11px] text-ink-faint">
                              Signed by {a.acknowledgementName} on {formatDate(a.acknowledgedAt)}. Reopening
                              (Assigned/In-Progress) clears this signature.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={rowBusy}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveRow(a)}
                            disabled={rowBusy}
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                          >
                            {rowBusy ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
