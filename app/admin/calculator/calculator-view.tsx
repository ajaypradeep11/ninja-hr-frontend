"use client";

import * as React from "react";
import {
  Calculator,
  Download,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { createCalcRule, deleteCalcRule, updateCalcRule } from "@/app/actions/letters";
import {
  CALC_ACTIONS,
  CALC_FIELDS,
  CALC_OPERATORS,
  CATEGORY_TABS,
  calculateRow,
  demoWeeklyHours,
  type CalcCategory,
  type CalcOperator,
  type CalcRule,
  type TimesheetRow,
} from "@/lib/calc";
import type { Employee } from "@/lib/data";
import { cn } from "@/lib/utils";

const cad = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function CalculatorView({
  initialRules,
  employees,
}: {
  initialRules: CalcRule[];
  employees: Employee[];
}) {
  const [rules, setRules] = React.useState(initialRules);
  const [tab, setTab] = React.useState<CalcCategory>("Timesheet");
  const [composing, setComposing] = React.useState(false);
  const [run, setRun] = React.useState<TimesheetRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // New-rule composer state
  const [field, setField] = React.useState<string>(CALC_FIELDS[0]);
  const [operator, setOperator] = React.useState<CalcOperator>(">");
  const [threshold, setThreshold] = React.useState("44");
  const [action, setAction] = React.useState<string>(CALC_ACTIONS[0]);
  const [value, setValue] = React.useState("1.5");

  const tabRules = rules.filter((r) => r.category === tab);
  const activeCount = rules.filter((r) => r.active).length;

  async function guard<T>(work: () => Promise<T>): Promise<T | undefined> {
    setError(null);
    setBusy(true);
    try {
      return await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function addRule() {
    const t = Number(threshold);
    const v = Number(value);
    if (!Number.isFinite(t) || !Number.isFinite(v)) return;
    const next = await guard(() =>
      createCalcRule({ category: tab, field, operator, threshold: t, action, value: v }),
    );
    if (next) {
      setRules(next);
      setComposing(false);
    }
  }

  async function toggleRule(r: CalcRule) {
    const next = await guard(() => updateCalcRule(r.id, { active: !r.active }));
    if (next) setRules(next);
  }

  async function removeRule(r: CalcRule) {
    const next = await guard(() => deleteCalcRule(r.id));
    if (next) setRules(next);
  }

  function runPayroll() {
    setRun(employees.map((e) => calculateRow(e, demoWeeklyHours(e.id), rules)));
  }

  function exportCsv() {
    if (!run) return;
    const header = [
      "Employee", "Department", "Hourly Rate", "Raw Hours", "Regular Hours",
      "OT Hours", "Base Pay", "OT Pay", "Bonus", "Vacation Accrued", "Total", "Applied Rules",
    ];
    const lines = run.map((r) =>
      [
        r.name, r.department, r.hourlyRate, r.weeklyHours, r.regularHours,
        r.overtimeHours, r.basePay, r.overtimePay, r.bonus, r.vacationAccrued,
        r.total, r.appliedRules.join(" | "),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-run-${run.length}-employees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Custom Calculator Engine"
        subtitle="Define IF/THEN calculation rules for timesheets, accruals and bonuses — then run them against live employee data."
        action={
          <button
            onClick={runPayroll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            <Play className="h-4 w-4" /> Run Payroll / Timesheet
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {/* Rules builder */}
      <Card className="card-pad">
        <CardHeader
          title="Rules Builder"
          action={
            <span className="text-[11px] font-semibold text-ink-muted">
              {activeCount} active rule{activeCount === 1 ? "" : "s"}
            </span>
          }
        />

        {/* Category tabs */}
        <div className="mt-3 flex gap-1 border-b border-line">
          {CATEGORY_TABS.map((t) => {
            const count = rules.filter((r) => r.category === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setComposing(false);
                }}
                className={
                  tab === t.key
                    ? "-mb-px border-b-2 border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600"
                    : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
                }
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-1.5 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          {tabRules.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5",
                r.active ? "border-line" : "border-line opacity-50",
              )}
            >
              <Badge tone="gray">IF</Badge>
              <span className="text-sm font-medium text-ink">{r.field}</span>
              <span className="text-sm text-ink-muted">
                {CALC_OPERATORS.find((o) => o.v === r.operator)?.label ?? r.operator}
              </span>
              <span className="rounded-lg bg-canvas px-2 py-0.5 font-mono text-sm font-semibold text-ink">
                {r.threshold}
              </span>
              <Badge tone="brand">THEN</Badge>
              <span className="text-sm font-medium text-ink">{r.action}</span>
              <span className="text-sm text-ink-muted">by</span>
              <span className="rounded-lg bg-canvas px-2 py-0.5 font-mono text-sm font-semibold text-ink">
                {r.value}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                  <input
                    type="checkbox"
                    checked={r.active}
                    disabled={busy}
                    onChange={() => toggleRule(r)}
                    className="h-4 w-4 rounded accent-brand-500"
                  />
                  Active
                </label>
                <button
                  onClick={() => removeRule(r)}
                  disabled={busy}
                  title="Delete rule"
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
          ))}
          {tabRules.length === 0 && !composing && (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
              No {CATEGORY_TABS.find((t) => t.key === tab)?.label.toLowerCase()} rules yet.
            </p>
          )}

          {composing ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-brand-200 bg-brand-50/40 px-3.5 py-3">
              <Badge tone="gray">IF</Badge>
              <select value={field} onChange={(e) => setField(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
                {CALC_FIELDS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as CalcOperator)}
                className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
              >
                {CALC_OPERATORS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="h-9 w-24 rounded-lg border border-line bg-white px-2 text-sm"
              />
              <Badge tone="brand">THEN</Badge>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
                {CALC_ACTIONS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <span className="text-sm text-ink-muted">by</span>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 w-24 rounded-lg border border-line bg-white px-2 text-sm"
              />
              <span className="ml-auto flex gap-2">
                <button
                  onClick={() => setComposing(false)}
                  className="rounded-lg p-1.5 text-ink-muted hover:bg-white"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={addRule}
                  disabled={busy}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save rule"}
                </button>
              </span>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
            >
              <Plus className="h-4 w-4" /> Add Rule
            </button>
          )}
        </div>
      </Card>

      {/* Timesheet run */}
      {run && (
        <Card className="card-pad mt-5">
          <CardHeader
            title="Timesheet Run"
            action={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-faint">
                  {run.length} employees · demo weekly hours, live rates & rules
                </span>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
                >
                  <Download className="h-3.5 w-3.5" /> Export to CSV
                </button>
              </div>
            }
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3">Employee</th>
                  <th className="pb-2 pr-3 text-right">Rate</th>
                  <th className="pb-2 pr-3 text-right">Raw hrs</th>
                  <th className="pb-2 pr-3 text-right">Reg / OT</th>
                  <th className="pb-2 pr-3 text-right">Base pay</th>
                  <th className="pb-2 pr-3 text-right">OT pay</th>
                  <th className="pb-2 pr-3 text-right">Bonus</th>
                  <th className="pb-2 pr-3 text-right">Vac. accrued</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {run.map((r) => (
                  <tr key={r.employeeId}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink">{r.name}</p>
                      <p className="text-[11px] text-ink-muted">{r.department}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-xs text-ink-muted">
                      {cad(r.hourlyRate)}/h
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ink">
                      {r.weeklyHours}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-muted">
                      {r.regularHours}
                      {r.overtimeHours > 0 && (
                        <span className="font-semibold text-amber-600">
                          {" "}
                          + {r.overtimeHours} OT
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">{cad(r.basePay)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">
                      {r.overtimePay > 0 ? cad(r.overtimePay) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">
                      {r.bonus > 0 ? cad(r.bonus) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">
                      {r.vacationAccrued > 0 ? cad(r.vacationAccrued) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-bold text-ink">{cad(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <Calculator className="h-3.5 w-3.5" />
            Hourly rate = annual salary ÷ 2080. Raw weekly hours are stable demo values; totals
            apply every active rule above (inactive rules are skipped).
          </p>
        </Card>
      )}
    </div>
  );
}
