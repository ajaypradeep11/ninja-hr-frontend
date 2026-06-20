"use client";

import * as React from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import { Card, CardHeader, Button, Badge, ProgressBar } from "@/components/ui";
import type { LeaveBalance, LeaveRequest } from "@/lib/data";
import { cn, daysBetween, formatDate } from "@/lib/utils";
import { createLeaveRequest } from "@/app/actions/modules";

const balanceTone: Record<string, { bg: string; bar: "brand" | "sky" | "amber"; text: string }> = {
  brand: { bg: "bg-brand-50", bar: "brand", text: "text-brand-700" },
  sky: { bg: "bg-sky-50", bar: "sky", text: "text-sky-700" },
  amber: { bg: "bg-amber-50", bar: "amber", text: "text-amber-700" },
};

const LEAVE_TYPES = ["Vacation", "Sick Leave", "Personal", "Parental", "Bereavement"] as const;

interface Row {
  id: string;
  type: string;
  start: string;
  end: string;
  status: "Pending" | "Approved" | "Denied";
  days: number;
}

const statusTone = { Pending: "amber", Approved: "green", Denied: "red" } as const;

interface Props {
  initialRows: Row[];
  balances: LeaveBalance[];
}

export default function LeaveView({ initialRows, balances }: Props) {
  const [rows, setRows] = React.useState<Row[]>(initialRows);
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<string>("Vacation");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const valid = start && end && daysBetween(start, end) >= 0;

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    const days = daysBetween(start, end) + 1;
    const all = await createLeaveRequest({
      employeeName: "Jim Scott",
      type: type as LeaveRequest["type"],
      start,
      end,
      days,
    });
    setRows(
      all
        .filter((r) => r.employee === "Jim Scott")
        .map((r) => ({
          id: r.id,
          type: r.type,
          start: r.start,
          end: r.end,
          status: r.status,
          days: r.days,
        })),
    );
    setOpen(false);
    setStart("");
    setEnd("");
    setNotes("");
    setType("Vacation");
    setSubmitting(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Time Off</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Request leave and track your balances. Balances reflect BC ESA minimums.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Request Time Off
        </Button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {balances.map((b) => {
          const t = balanceTone[b.tone];
          const total = b.available + b.used;
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
              <ProgressBar value={(b.available / total) * 100} tone={t.bar} className="mt-3" />
            </Card>
          );
        })}
      </div>

      {/* History */}
      <Card className="card-pad mt-5">
        <CardHeader title="My Requests" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Dates</th>
                <th className="pb-2 font-semibold">Days</th>
                <th className="pb-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-3 font-medium text-ink">{r.type}</td>
                  <td className="py-3 text-ink-muted">
                    {formatDate(r.start, { year: undefined })} – {formatDate(r.end, { year: undefined })}
                  </td>
                  <td className="py-3 text-ink-muted">{r.days}</td>
                  <td className="py-3 text-right">
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
          <Card className="w-full max-w-md card-pad sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Request Time Off</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">Leave type</label>
                <select className="field-input" value={type} onChange={(e) => setType(e.target.value)}>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
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
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={!valid || submitting}>
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
