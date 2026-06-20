"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Lock,
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
import { setLeaveStatus } from "@/app/actions/modules";
import type { LeaveRequest, Employee } from "@/lib/data";
import { formatDate } from "@/lib/utils";
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

export function LeaveView({
  initialLeave,
  employees,
}: {
  initialLeave: LeaveRequest[];
  employees: Employee[];
}) {
  const [requests, setRequests] = React.useState(initialLeave);

  async function setStatus(id: string, status: "Approved" | "Denied") {
    setRequests(await setLeaveStatus(id, status));
  }

  const pending = requests.filter((r) => r.status === "Pending");
  const approved = requests.filter((r) => r.status === "Approved");

  // Provincial policy validator state
  const [province, setProvince] = React.useState<ProvinceCode>("BC");
  const [paidSick, setPaidSick] = React.useState(0);
  const [tenure, setTenure] = React.useState(3);
  const policyError = validateSickPolicy(province, paidSick);
  const rate = vacationAccrualRate(province, tenure);

  const onStatutoryLeave = employees.filter((e) => e.status === "On Statutory Leave");

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle="Self-service requests with a backend compliance engine enforcing provincial ESA minimums."
      />

      {/* Balances summary */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Pending requests", value: pending.length, tone: "amber" as const },
          { label: "Approved (upcoming)", value: approved.length, tone: "green" as const },
          { label: "On statutory leave", value: onStatutoryLeave.length, tone: "violet" as const },
          { label: "Provinces covered", value: PROVINCES.length, tone: "brand" as const },
        ].map((s) => (
          <Card key={s.label} className="card-pad">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Approval queue */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader title="Approval Queue" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Employee</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Dates</th>
                  <th className="pb-2 font-semibold">Days</th>
                  <th className="pb-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.employee} size={28} />
                        <span className="font-medium text-ink">{r.employee}</span>
                        <Badge tone="gray">{r.province}</Badge>
                      </div>
                    </td>
                    <td className="py-2.5 text-ink-muted">{r.type}</td>
                    <td className="py-2.5 text-ink-muted">
                      {formatDate(r.start, { year: undefined })} –{" "}
                      {formatDate(r.end, { year: undefined })}
                    </td>
                    <td className="py-2.5 text-ink-muted">{r.days}</td>
                    <td className="py-2.5">
                      {r.status === "Pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setStatus(r.id, "Approved")}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setStatus(r.id, "Denied")}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-red-50 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            <X className="h-3.5 w-3.5" /> Deny
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Team coverage calendar */}
        <Card className="card-pad lg:col-span-8">
          <CardHeader
            title="Team Coverage"
            action={<CalendarDays className="h-4 w-4 text-ink-faint" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Approved leaves overlaid to spot understaffing before approving more time off.
          </p>
          <div className="mt-4 space-y-2.5">
            {approved.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-muted">No approved leaves yet.</p>
            )}
            {approved.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <Avatar name={r.employee} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.employee}</p>
                  <p className="text-xs text-ink-muted">
                    {r.type} · {r.days} day{r.days === 1 ? "" : "s"}
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

        {/* Statutory leave lock */}
        <Card className="card-pad lg:col-span-4">
          <CardHeader
            title="Statutory Leave Locks"
            action={<Lock className="h-4 w-4 text-violet-500" />}
          />
          <p className="mt-1 text-xs text-ink-muted">
            Records on maternity/parental or compassionate care are locked against termination.
          </p>
          <div className="mt-4 space-y-3">
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
              <p className="py-4 text-center text-sm text-ink-muted">No active statutory leaves.</p>
            )}
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Termination requires a multi-factor admin override and a Human Rights Code
              certification checkbox.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
