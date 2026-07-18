"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardHeader, Button, Badge, ProgressBar, Avatar } from "@/components/ui";
import type { LeaveRequest } from "@/lib/data";
import { cn, daysBetween, formatDate } from "@/lib/utils";
import {
  cancelLeaveRequest,
  createLeaveRequest,
  setLeaveStatus,
  updateLeaveRecord,
} from "@/app/actions/modules";
import { ontarioStatutoryHolidays } from "@/lib/holidays";
import { computeLeaveBalances } from "@/lib/leave-balances";

const balanceTone: Record<string, { bg: string; bar: "brand" | "sky" | "amber"; text: string }> = {
  brand: { bg: "bg-brand-50", bar: "brand", text: "text-brand-700 dark:text-brand-400" },
  sky: { bg: "bg-sky-50 dark:bg-sky-500/10", bar: "sky", text: "text-sky-700 dark:text-sky-300" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10", bar: "amber", text: "text-amber-700 dark:text-amber-300" },
};

const LEAVE_TYPES = [
  "Vacation",
  "Sick Leave",
  "Personal",
  "Parental",
  "Bereavement",
  "Overtime",
] as const;
const statusTone = { Pending: "amber", Approved: "green", Denied: "red" } as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Which balance card each leave type draws from (statutory leaves don't). */
const BALANCE_TYPE: Record<string, LeaveRequest["type"]> = {
  "Vacation Days Available": "Vacation",
  "Sick Leave Remaining": "Sick Leave",
  "Paid / Unpaid Personal": "Personal",
};

const duration = (r: LeaveRequest) =>
  r.hours
    ? `${r.hours}h${r.type === "Overtime" ? " OT" : ""}`
    : `${r.days} day${r.days === 1 ? "" : "s"}`;

interface Props {
  actorName: string;
  isManager: boolean;
  /** Actor-scoped: own records (+ department records when a manager). */
  initialRequests: LeaveRequest[];
}

export default function LeaveView({ actorName, isManager, initialRequests }: Props) {
  const [requests, setRequests] = React.useState<LeaveRequest[]>(initialRequests);
  const [error, setError] = React.useState<string | null>(null);

  // Request modal state — `editingId` switches it into edit mode.
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [type, setType] = React.useState<string>("Vacation");
  const [partial, setPartial] = React.useState(false);
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [hours, setHours] = React.useState(4);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const mine = requests.filter((r) => r.employee === actorName);
  // The backend scopes this list to the actor's own requests + those of anyone
  // who reports to them (by reporting line), so any non-own request here is a
  // direct report's — regardless of the actor's role code.
  const teamPending = requests.filter(
    (r) => r.employee !== actorName && r.status === "Pending",
  );

  // Derived, never stored: "used" comes from the SAME approved requests the
  // My Requests table renders, so cards and history stay in lockstep.
  const balances = computeLeaveBalances(requests, actorName);

  const isOvertime = type === "Overtime";
  const valid = isOvertime
    ? !!start && hours >= 1 && hours <= 12
    : partial
      ? !!start && hours >= 1 && hours <= 7
      : !!start && !!end && daysBetween(start, end) >= 0;

  /** Pending totals per balance card — full visibility into the math. */
  function pendingFor(balanceType: string) {
    const lt = BALANCE_TYPE[balanceType];
    if (!lt) return { days: 0, hrs: 0 };
    const rows = mine.filter((r) => r.status === "Pending" && r.type === lt);
    return {
      days: rows.filter((r) => !r.hours).reduce((s, r) => s + r.days, 0),
      hrs: rows.filter((r) => r.hours).reduce((s, r) => s + (r.hours ?? 0), 0),
    };
  }

  /** Open the modal fresh, optionally pre-filled from a calendar selection. */
  function openRequest(range?: { start: string; end: string }) {
    setEditingId(null);
    setType("Vacation");
    setPartial(false);
    setStart(range?.start ?? "");
    setEnd(range?.end ?? "");
    setHours(4);
    setNotes("");
    setSubmitError(null);
    setOpen(true);
  }

  /** Open the modal pre-filled to edit a pending request. */
  function openEdit(r: LeaveRequest) {
    setEditingId(r.id);
    setType(r.type);
    setPartial(r.hours != null);
    setStart(r.start);
    setEnd(r.end);
    setHours(r.hours ?? 4);
    setNotes("");
    setSubmitError(null);
    setOpen(true);
  }

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Overtime + partial leave are both single-date, hours-based entries.
      const hoursMode = isOvertime || partial;
      const payload = {
        type: type as LeaveRequest["type"],
        start,
        end: hoursMode ? start : end,
        days: hoursMode ? 1 : daysBetween(start, end) + 1,
        hours: hoursMode ? hours : undefined,
      };
      const all = editingId
        ? await updateLeaveRecord(editingId, { ...payload, hours: hoursMode ? hours : null })
        : await createLeaveRequest({ employeeName: actorName, ...payload });
      setRequests(all);
      setOpen(false);
      setEditingId(null);
    } catch (err) {
      // Keep the modal open with the user's input so they can retry.
      setSubmitError(err instanceof Error ? err.message : "Failed to save request");
    } finally {
      setSubmitting(false);
    }
  }

  async function mutate(fn: () => Promise<LeaveRequest[]>) {
    try {
      setError(null);
      setRequests(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Time Off</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Request full or partial days and track your year at a glance — requests go to your
            department manager.
          </p>
        </div>
        <Button onClick={() => openRequest()}>
          <Plus className="h-4 w-4" /> Request Time Off
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</p>
      )}

      {/* Manager approval queue — leave requests route HERE, not to HR. Shown to
          role-MANAGER users (empty-state included) and to anyone who actually
          has a report's request waiting, so managers of any role see it. */}
      {(isManager || teamPending.length > 0) && (
        <Card className="card-pad mb-5 border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/10">
          <CardHeader title={`Team requests awaiting your approval (${teamPending.length})`} />
          <div className="mt-3 space-y-2">
            {teamPending.length === 0 && (
              <p className="py-3 text-center text-sm text-ink-muted">
                Nothing waiting — your team is all caught up.
              </p>
            )}
            {teamPending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-card px-3.5 py-2.5">
                <Avatar name={r.employee} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.employee}</p>
                  <p className="text-xs text-ink-muted">
                    {r.type} · {duration(r)} · {formatDate(r.start, { year: undefined })}
                    {r.end !== r.start && <> – {formatDate(r.end, { year: undefined })}</>}
                  </p>
                </div>
                <button
                  onClick={() => mutate(() => setLeaveStatus(r.id, "Approved"))}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => mutate(() => setLeaveStatus(r.id, "Denied"))}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-50 dark:bg-red-500/10 px-2 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20"
                >
                  <X className="h-3.5 w-3.5" /> Deny
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Balances — with pending-days visibility */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {balances.map((b) => {
          const t = balanceTone[b.tone];
          const total = b.available + b.used;
          const pend = pendingFor(b.type);
          const hasPending = pend.days > 0 || pend.hrs > 0;
          return (
            <Card key={b.type} className="card-pad">
              <div className="flex items-center justify-between">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.bg, t.text)}>
                  <CalendarDays className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-ink-faint">{b.used} used of {total}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-ink">
                {b.available} <span className="text-sm font-medium text-ink-muted">{b.unit}</span>
              </p>
              <p className="text-xs text-ink-muted">{b.type}</p>
              {/* Pending indicator — how the balance is actually committed */}
              {hasPending && (
                <p
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                  title="Awaiting your manager's approval — not yet deducted from your balance"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Includes {pend.days > 0 && `${pend.days} pending day${pend.days === 1 ? "" : "s"}`}
                  {pend.days > 0 && pend.hrs > 0 && " + "}
                  {pend.hrs > 0 && `${pend.hrs}h pending`}
                </p>
              )}
              <ProgressBar value={(b.available / total) * 100} tone={t.bar} className="mt-3" />
            </Card>
          );
        })}
      </div>

      {/* Interactive calendar */}
      <LeaveCalendar leaves={mine} onSelectRange={(range) => openRequest(range)} />

      {/* History */}
      <Card className="card-pad mt-5">
        <CardHeader title="My Requests" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Dates</th>
                <th className="pb-2 font-semibold">Duration</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 text-right font-semibold sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.id} className="border-t border-line align-middle">
                  <td className="py-3 font-medium text-ink">{r.type}</td>
                  <td className="py-3 text-ink-muted">
                    {formatDate(r.start, { year: undefined })}
                    {r.end !== r.start && <> – {formatDate(r.end, { year: undefined })}</>}
                  </td>
                  <td className="py-3 text-ink-muted">{duration(r)}</td>
                  <td className="py-3">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="py-3 pl-2 text-right">
                    {r.status === "Pending" ? (
                      <RequestMenu
                        onEdit={() => openEdit(r)}
                        onCancel={() => {
                          if (window.confirm(`Cancel your ${r.type} request for ${formatDate(r.start)}?`)) {
                            void mutate(() => cancelLeaveRequest(r.id));
                          }
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {mine.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-ink-muted">
                    No requests yet — click a date on the calendar to start one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Request / edit modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <Card className="card-pad w-full max-w-md sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">
                {editingId ? "Edit Request" : isOvertime ? "Log Overtime" : "Request Time Off"}
              </h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">{isOvertime ? "Type" : "Leave type"}</label>
                <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              {isOvertime ? (
                /* Overtime = extra hours worked on a single date, sent to your
                   manager for approval and logged (it never touches your balances). */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Date worked</label>
                    <input type="date" className="field-input" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Overtime hours</label>
                    <select className="field-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <option key={h} value={h}>
                          {h} hour{h === 1 ? "" : "s"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="col-span-2 text-[11px] text-ink-faint">
                    Overtime is submitted for manager approval and recorded separately — it doesn&apos;t
                    deduct from your vacation, sick, or personal balances.
                  </p>
                </div>
              ) : (
                <>
                  {/* Duration: full day(s) or a partial day in hours */}
                  <div>
                    <label className="field-label">Duration</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { v: false, label: "Full day(s)" },
                        { v: true, label: "Partial day (hours)" },
                      ].map((o) => (
                        <button
                          key={o.label}
                          onClick={() => setPartial(o.v)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-xs font-semibold transition",
                            partial === o.v
                              ? "border-brand-300 bg-brand-50 text-brand-700 dark:text-brand-400"
                              : "border-line bg-card text-ink-muted hover:bg-canvas",
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {partial ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="field-label">Date</label>
                        <input type="date" className="field-input" value={start} onChange={(e) => setStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">How long?</label>
                        <select className="field-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                          {[1, 2, 3, 4, 5, 6, 7].map((h) => (
                            <option key={h} value={h}>
                              {h} hour{h === 1 ? "" : "s"}{h === 4 ? " — half day" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="field-label">Start date</label>
                        <input type="date" className="field-input" value={start} onChange={(e) => setStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="field-label">End date</label>
                        <input type="date" className="field-input" value={end} onChange={(e) => setEnd(e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="field-label">Notes (optional)</label>
                <textarea
                  className="field-input min-h-20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything your manager should know…"
                />
              </div>
            </div>
            {submitError && (
              <p className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{submitError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!valid || submitting}>
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Submit Request"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Row kebab menu ---------------------------- */

function RequestMenu({ onEdit, onCancel }: { onEdit: () => void; onCancel: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label="Request actions"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCancel();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Cancel request
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------- Interactive Year/Month calendar --------------------- */

function LeaveCalendar({
  leaves,
  onSelectRange,
}: {
  leaves: LeaveRequest[];
  onSelectRange: (range: { start: string; end: string }) => void;
}) {
  const today = new Date();
  const [mode, setMode] = React.useState<"year" | "month">("year");
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  // Click-and-drag selection → prefilled request.
  const [dragStart, setDragStart] = React.useState<string | null>(null);
  const [dragHover, setDragHover] = React.useState<string | null>(null);
  const dragRef = React.useRef<{ start: string | null; hover: string | null }>({ start: null, hover: null });
  React.useEffect(() => {
    dragRef.current = { start: dragStart, hover: dragHover };
  }, [dragStart, dragHover]);

  React.useEffect(() => {
    function onUp() {
      const { start, hover } = dragRef.current;
      if (start) {
        const a = start;
        const b = hover ?? start;
        onSelectRange(a <= b ? { start: a, end: b } : { start: b, end: a });
      }
      setDragStart(null);
      setDragHover(null);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const holidays = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const h of ontarioStatutoryHolidays(year)) map.set(h.date, h.name);
    return map;
  }, [year]);

  const leaveDays = React.useMemo(() => {
    const map = new Map<string, { status: LeaveRequest["status"]; label: string }>();
    for (const r of leaves) {
      if (r.status === "Denied") continue;
      const d = new Date(`${r.start}T00:00:00Z`);
      const end = new Date(`${r.end}T00:00:00Z`);
      let guard = 0;
      while (d.getTime() <= end.getTime() && guard < 400) {
        map.set(d.toISOString().slice(0, 10), {
          status: r.status,
          label: `${r.type}${r.hours ? ` (${r.hours}h)` : ""} — ${r.status}`,
        });
        d.setUTCDate(d.getUTCDate() + 1);
        guard++;
      }
    }
    return map;
  }, [leaves]);

  const iso = (m: number, d: number) =>
    `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const inSelection = (key: string) => {
    if (!dragStart) return false;
    const b = dragHover ?? dragStart;
    const [lo, hi] = dragStart <= b ? [dragStart, b] : [b, dragStart];
    return key >= lo && key <= hi;
  };

  function dayCell(key: string, d: number, dense: boolean) {
    const holiday = holidays.get(key);
    const leave = leaveDays.get(key);
    const selected = inSelection(key);
    return (
      <button
        key={key}
        type="button"
        title={holiday ?? leave?.label ?? "Click (or drag) to request time off"}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragStart(key);
          setDragHover(key);
        }}
        onMouseEnter={() => {
          if (dragRef.current.start) setDragHover(key);
        }}
        className={cn(
          "flex w-full select-none items-center justify-center rounded-sm text-center leading-none transition-colors",
          dense ? "text-[9px]" : "flex-col gap-0.5 rounded-lg border border-line/60 text-[11px]",
          selected
            ? "bg-brand-500 font-bold text-white"
            : holiday
              ? "bg-violet-400 font-bold text-white"
              : leave?.status === "Approved"
                ? "bg-emerald-400 font-bold text-white"
                : leave?.status === "Pending"
                  ? "bg-amber-400 font-bold text-white"
                  : dense
                    ? "text-ink-muted hover:bg-brand-50"
                    : "bg-card text-ink-soft hover:bg-brand-50",
        )}
        style={{ height: dense ? "18px" : "56px" }}
      >
        {dense ? (
          d
        ) : (
          <>
            <span className="font-semibold">{d}</span>
            {holiday && <span className="line-clamp-2 px-0.5 text-[8px] leading-tight">{holiday}</span>}
            {!holiday && leave && (
              <span className="line-clamp-2 px-0.5 text-[8px] leading-tight">{leave.label.split(" — ")[0]}</span>
            )}
          </>
        )}
      </button>
    );
  }

  function monthGrid(m: number, dense: boolean) {
    const first = new Date(Date.UTC(year, m, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const cells: (number | null)[] = [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    return (
      <div className={cn("grid grid-cols-7", dense ? "gap-0.5" : "gap-1")}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            className={cn("text-center font-semibold text-ink-faint", dense ? "text-[8px]" : "text-[10px]")}
          >
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d === null ? <span key={`b${i}`} /> : dayCell(iso(m, d), d, dense),
        )}
      </div>
    );
  }

  return (
    <Card className="card-pad mt-5">
      <CardHeader
        title="My Year"
        action={
          <div className="flex items-center gap-2">
            {/* Year / Month view toggle */}
            <div className="inline-flex rounded-lg border border-line bg-card p-0.5">
              {(["year", "month"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition",
                    mode === m ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-canvas",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  mode === "year"
                    ? setYear((y) => y - 1)
                    : month === 0
                      ? (setMonth(11), setYear((y) => y - 1))
                      : setMonth((m) => m - 1)
                }
                aria-label="Previous"
                className="rounded-lg p-1 text-ink-muted hover:bg-canvas"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-sm font-bold text-ink">
                {mode === "year" ? year : `${MONTHS_FULL[month]} ${year}`}
              </span>
              <button
                onClick={() =>
                  mode === "year"
                    ? setYear((y) => y + 1)
                    : month === 11
                      ? (setMonth(0), setYear((y) => y + 1))
                      : setMonth((m) => m + 1)
                }
                aria-label="Next"
                className="rounded-lg p-1 text-ink-muted hover:bg-canvas"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />
      <p className="mt-1 text-xs text-ink-muted">
        Click a date — or click and drag across several — to start a pre-filled request.
      </p>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" /> Ontario statutory holiday
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Approved time off
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Pending request
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Selecting
        </span>
      </div>

      {mode === "year" ? (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {MONTHS.map((label, m) => (
            <div key={label}>
              <button
                onClick={() => {
                  setMonth(m);
                  setMode("month");
                }}
                className="mb-1.5 w-full text-center text-[11px] font-bold uppercase tracking-wide text-ink-soft hover:text-brand-600 dark:hover:text-brand-300"
                title={`Open ${MONTHS_FULL[m]} in month view`}
              >
                {label}
              </button>
              {monthGrid(m, true)}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">{monthGrid(month, false)}</div>
      )}

      {/* Holiday list for the year */}
      <div className="mt-4 border-t border-line pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          Ontario statutory holidays {year}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {ontarioStatutoryHolidays(year).map((h) => (
            <span key={h.date} className="text-[11px] text-ink-muted">
              <span className="font-semibold text-violet-600 dark:text-violet-300">{formatDate(h.date, { year: undefined })}</span>{" "}
              {h.name}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
