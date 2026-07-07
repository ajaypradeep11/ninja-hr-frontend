"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ClipboardList,
  Lock,
  MoreVertical,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { setLeaveStatus, updateLeaveRecord } from "@/app/actions/modules";
import type { LeaveRequest, Employee } from "@/lib/data";
import { cn, formatDate } from "@/lib/utils";
import {
  PROVINCES,
  provinceName,
  vacationAccrualRate,
  accrualWeeks,
  statutoryPaidSickDays,
  validateSickPolicy,
  type ProvinceCode,
} from "@/lib/compliance";

type Status = "Pending" | "Approved" | "Denied";
const statusTone: Record<Status, "amber" | "green" | "red"> = {
  Pending: "amber",
  Approved: "green",
  Denied: "red",
};
const LEAVE_TYPES = [
  "Vacation",
  "Sick Leave",
  "Personal",
  "Parental",
  "Bereavement",
  "Overtime",
] as const;

const duration = (r: LeaveRequest) =>
  r.hours
    ? `${r.hours}h${r.type === "Overtime" ? " OT" : ""}`
    : `${r.days} day${r.days === 1 ? "" : "s"}`;

export function LeaveView({
  initialLeave,
  employees,
  initialQuery = "",
}: {
  initialLeave: LeaveRequest[];
  employees: Employee[];
  initialQuery?: string;
}) {
  const [requests, setRequests] = React.useState(initialLeave);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Absence-records filters (pre-seeded when deep-linked from the directory).
  const [q, setQ] = React.useState(initialQuery);
  const [statusFilter, setStatusFilter] = React.useState<"All" | Status>("All");
  const [typeFilter, setTypeFilter] = React.useState<string>("All");

  // Edit-record modal
  const [editing, setEditing] = React.useState<LeaveRequest | null>(null);

  async function mutate(fn: () => Promise<LeaveRequest[]>) {
    try {
      setActionError(null);
      setRequests(await fn());
      return true;
    } catch (err) {
      // Keep the current log — a failed PATCH must not wipe the list.
      setActionError(err instanceof Error ? err.message : "Failed to update record");
      return false;
    }
  }

  const filtered = requests.filter(
    (r) =>
      (statusFilter === "All" || r.status === statusFilter) &&
      (typeFilter === "All" || r.type === typeFilter) &&
      (q.trim() === "" ||
        r.employee.toLowerCase().includes(q.toLowerCase()) ||
        r.department.toLowerCase().includes(q.toLowerCase())),
  );

  const pending = requests.filter((r) => r.status === "Pending");
  const approved = requests.filter((r) => r.status === "Approved");
  const onStatutoryLeave = employees.filter((e) => e.status === "On Statutory Leave");

  // Provincial policy validator state (unchanged compliance widget)
  const [province, setProvince] = React.useState<ProvinceCode>("ON");
  const [paidSick, setPaidSick] = React.useState(0);
  const [tenure, setTenure] = React.useState(3);
  const policyError = validateSickPolicy(province, paidSick);
  const rate = vacationAccrualRate(province, tenure);

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle="Company-wide absence records with HR override — approvals are routed to each employee's department manager."
      />

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Awaiting manager approval", value: pending.length },
          { label: "Approved (upcoming)", value: approved.length },
          { label: "On statutory leave", value: onStatutoryLeave.length },
          { label: "Records on file", value: requests.length },
        ].map((s) => (
          <Card key={s.label} className="card-pad">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* -------------------- Absence Records (company-wide) -------------------- */}
      <Card className="card-pad mb-5">
        <CardHeader
          title="Absence Records"
          action={<ClipboardList className="h-4 w-4 text-brand-500" />}
        />
        <p className="mt-1 text-xs text-ink-muted">
          Full visibility across all departments. Day-to-day approvals live with each
          department manager — use the row menu to edit, override or adjust any record.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employee or department…"
            className="field-input h-9 max-w-60 text-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | Status)}
            className="field-input h-9 w-auto text-xs"
          >
            {["All", "Pending", "Approved", "Denied"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="field-input h-9 w-auto text-xs"
          >
            <option>All</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <span className="ml-auto text-[11px] text-ink-faint">
            {filtered.length} of {requests.length} records
          </span>
        </div>

        <div className="mt-3 max-h-[480px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="pb-2 font-semibold">Employee</th>
                <th className="pb-2 font-semibold">Department</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Dates</th>
                <th className="pb-2 font-semibold">Duration</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 text-right font-semibold sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-line align-middle">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.employee} size={28} />
                      <span className="font-medium text-ink">{r.employee}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <Badge tone="gray">{r.department}</Badge>
                  </td>
                  <td className="py-2.5 text-ink-muted">{r.type}</td>
                  <td className="py-2.5 text-ink-muted">
                    {formatDate(r.start, { year: undefined })}
                    {r.end !== r.start && <> – {formatDate(r.end, { year: undefined })}</>}
                  </td>
                  <td className="py-2.5 text-ink-muted">{duration(r)}</td>
                  <td className="py-2.5">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <RecordMenu
                      record={r}
                      onApprove={() => mutate(() => setLeaveStatus(r.id, "Approved"))}
                      onDeny={() => mutate(() => setLeaveStatus(r.id, "Denied"))}
                      onEdit={() => setEditing(r)}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-muted">
                    No absence records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Team coverage calendar */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader
            title="Team Coverage"
            action={<CalendarDays className="h-4 w-4 text-ink-faint" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Approved leaves overlaid to spot understaffing before more time off is approved.
          </p>
          <div className="mt-4 space-y-2.5">
            {approved.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-muted">No approved leaves yet.</p>
            )}
            {approved.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                <Avatar name={r.employee} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.employee}</p>
                  <p className="text-xs text-ink-muted">
                    {r.type} · {duration(r)} · {r.department}
                  </p>
                </div>
                <span className="text-xs text-ink-muted">
                  {formatDate(r.start, { year: undefined })} –{" "}
                  {formatDate(r.end, { year: undefined })}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Provincial policy validator */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader
            title="Provincial Policy"
            action={<ShieldCheck className="h-4 w-4 text-brand-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            The Provincial Policy Factory enforces ESA minimums by <code>province_id</code>.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="field-label">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value as ProvinceCode)}
                className="field-input"
              >
                {PROVINCES.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Configured paid sick days</label>
                <input
                  type="number"
                  min={0}
                  value={paidSick}
                  onChange={(e) => setPaidSick(Number(e.target.value))}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Years of service</label>
                <input
                  type="number"
                  min={0}
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="field-input"
                />
              </div>
            </div>

            {policyError ? (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{policyError}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Policy meets the {provinceName(province)} statutory floor (
                  {statutoryPaidSickDays(province)} paid sick days).
                </span>
              </div>
            )}

            <Button disabled={!!policyError} className="w-full">
              {policyError ? "Save blocked — fix to continue" : "Save policy"}
            </Button>

            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="text-ink-muted">Auto-configured vacation accrual</p>
              <p className="mt-1 font-semibold text-ink">
                {accrualWeeks(rate)} weeks · {(rate * 100).toFixed(0)}% of gross wages
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {provinceName(province)}, {tenure} year{tenure === 1 ? "" : "s"} of service
              </p>
            </div>
          </div>
        </Card>

        {/* Statutory leave lock */}
        <Card className="card-pad lg:col-span-12">
          <CardHeader
            title="Statutory Leave Locks"
            action={<Lock className="h-4 w-4 text-violet-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Records on maternity/parental or compassionate care are locked against termination.
            Termination requires a multi-factor admin override and a Human Rights Code
            certification checkbox.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {onStatutoryLeave.map((e) => (
              <div key={e.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={e.name} size={32} />
                  <div>
                    <p className="text-sm font-semibold text-ink">{e.name}</p>
                    <p className="text-xs text-ink-muted">{e.title}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-violet-700">
                  <Lock className="h-3.5 w-3.5" />
                  Active — On Statutory Leave
                </div>
              </div>
            ))}
            {onStatutoryLeave.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-muted sm:col-span-2 lg:col-span-4">
                No active statutory leaves.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* ------------------------- Edit-record modal ------------------------- */}
      {editing && (
        <EditRecordModal
          record={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const ok = await mutate(() => updateLeaveRecord(editing.id, patch));
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Row kebab ------------------------------ */

function RecordMenu({
  record,
  onApprove,
  onDeny,
  onEdit,
}: {
  record: LeaveRequest;
  onApprove: () => void;
  onDeny: () => void;
  onEdit: () => void;
}) {
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
        aria-label={`Actions for ${record.employee}'s ${record.type} record`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          {record.status === "Pending" && (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onApprove();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
              >
                <Check className="h-3.5 w-3.5" /> Approve (override)
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDeny();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" /> Deny (override)
              </button>
            </>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-canvas"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit record…
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Edit modal ------------------------------ */

function EditRecordModal({
  record,
  onClose,
  onSave,
}: {
  record: LeaveRequest;
  onClose: () => void;
  onSave: (patch: {
    type?: LeaveRequest["type"];
    start?: string;
    end?: string;
    days?: number;
    hours?: number | null;
    status?: Status;
  }) => Promise<void>;
}) {
  const [type, setType] = React.useState<LeaveRequest["type"]>(record.type);
  const [start, setStart] = React.useState(record.start);
  const [end, setEnd] = React.useState(record.end);
  const [days, setDays] = React.useState(record.days);
  const [partial, setPartial] = React.useState(record.hours != null);
  const [hours, setHours] = React.useState(record.hours ?? 4);
  const [status, setStatus] = React.useState<Status>(record.status);
  const [busy, setBusy] = React.useState(false);

  const valid =
    start && end && end >= start && days >= 1 && (!partial || (hours >= 1 && hours <= 12));

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSave({
        type,
        start,
        end: partial ? start : end,
        days: partial ? 1 : days,
        hours: partial ? hours : null,
        status,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <Card className="card-pad w-full max-w-md sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            Edit record — {record.employee}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Leave type</label>
              <select
                className="field-input"
                value={type}
                onChange={(e) => setType(e.target.value as LeaveRequest["type"])}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select
                className="field-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                {["Pending", "Approved", "Denied"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

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
                    "rounded-lg border px-2 py-1.5 text-xs font-semibold transition",
                    partial === o.v
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-ink-muted hover:bg-canvas",
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
                <label className="field-label">Hours</label>
                <select className="field-input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                  {/* 1–7 = partial-day leave; 8–12 available for overtime records. */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h}h{h === 4 ? " — half day" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="field-label">Start</label>
                <input type="date" className="field-input" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <label className="field-label">End</label>
                <input type="date" className="field-input" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Working days</label>
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
