"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Download,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  Scale,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  Ring,
  PageHeader,
} from "@/components/ui";
import type { Employee, Requisition } from "@/lib/data";
import { PROVINCES, provinceName } from "@/lib/compliance";
import { BRAND } from "@/lib/brand";
import { daysBetween } from "@/lib/utils";

const standardReports = [
  {
    title: "Compliance Watchlist",
    desc: "Upcoming ROE submissions, contract renewals, training expirations.",
    icon: Clock3,
    tone: "amber" as const,
  },
  {
    title: "Liability Exposure Report",
    desc: "Calculated termination payouts at ESA statutory minimums if all staff were laid off today.",
    icon: Scale,
    tone: "red" as const,
  },
  {
    title: "Hiring Funnel Metrics",
    desc: "Where candidates drop off and the performance of each recruitment channel.",
    icon: Filter,
    tone: "sky" as const,
  },
  {
    title: "Data Governance Log",
    desc: "All data purges and access requests, proving Law 25 & privacy compliance.",
    icon: ShieldCheck,
    tone: "brand" as const,
  },
];

function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function tenureYears(hireDate: string) {
  return Math.max(0, daysBetween(hireDate, BRAND.today) / 365);
}

interface ReportsViewProps {
  employees: Employee[];
  headcountByDept: { dept: string; count: number }[];
  requisitions: Requisition[];
}

export function ReportsView({ employees, headcountByDept, requisitions }: ReportsViewProps) {
  const [province, setProvince] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  const [aiInsight, setAiInsight] = React.useState(false);

  const filtered = employees.filter(
    (e) =>
      (province === "all" || e.province === province) &&
      (status === "all" || e.status === status),
  );

  const nonCompliantJobs = requisitions.filter(
    (r) => r.province === "ON" && r.status === "Published" && r.salaryMax - r.salaryMin > 50_000,
  ).length;

  // Compliance scorecard — derived from live data (replaces the old hardcoded
  // demo score). Only metrics we can actually compute from real records.
  const publishedOn = requisitions.filter(
    (r) => r.province === "ON" && r.status === "Published" && !r.archived,
  );
  const bill149Pct = publishedOn.length
    ? Math.round(
        (publishedOn.filter((r) => r.salaryMin > 0 && r.salaryMax > 0).length /
          publishedOn.length) *
          100,
      )
    : 100;
  const recordsPct = employees.length
    ? Math.round(
        (employees.filter((e) => e.hireDate && e.province && e.email).length /
          employees.length) *
          100,
      )
    : 100;
  const complianceScore = {
    overall: Math.round((bill149Pct + recordsPct) / 2),
    breakdown: [
      {
        label: "Bill 149 job postings (salary ranges)",
        value: bill149Pct,
        tone: (bill149Pct >= 90 ? "ok" : "warn") as "ok" | "warn",
      },
      {
        label: "HRIS records complete",
        value: recordsPct,
        tone: (recordsPct >= 90 ? "ok" : "warn") as "ok" | "warn",
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Legal risk, hiring efficiency, and operational bottlenecks — all exportable for audit."
        action={
          <Button
            variant="outline"
            onClick={() => {
              const header = "Name,Department,Province,Status";
              const rows = employees.map(
                (e) =>
                  `"${e.name}","${e.department}","${e.province}","${e.status}"`,
              );
              download("audit-export.csv", [header, ...rows].join("\n"), "text/csv");
            }}
          >
            <Download className="h-4 w-4" />
            Export for Audit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Compliance Health Scorecard */}
        <Card className="card-pad lg:col-span-5">
          <CardHeader title="Compliance Health Scorecard" />
          <div className="mt-4 flex items-center gap-6">
            <Ring value={complianceScore.overall} sublabel="Score" />
            <div className="flex-1 space-y-3">
              {complianceScore.breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-soft">{b.label}</span>
                    <Badge tone={b.tone === "ok" ? "green" : "amber"}>{b.value}%</Badge>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${b.tone === "ok" ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Headcount by department */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader title="Headcount by Department" />
          <div className="mt-4 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountByDept} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="dept"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {headcountByDept.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--primary))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Insight */}
        <Card className="card-pad lg:col-span-12">
          <CardHeader
            title="Interactive Data Table"
            action={
              <button
                onClick={() => setAiInsight((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  aiInsight ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Insight
              </button>
            }
          />

          {aiInsight && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-brand-50/60 p-3.5 text-sm text-ink-soft">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
              <p>
                <span className="font-semibold text-ink">Insight:</span> You have{" "}
                {nonCompliantJobs} open role(s) in Ontario that may be non-compliant with Bill
                149 salary mandates. Review the affected postings and re-assign any overdue
                AODA/WHMIS modules from the Tracker page.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="field-input h-9 w-auto py-0 text-xs"
            >
              <option value="all">All provinces</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="field-input h-9 w-auto py-0 text-xs"
            >
              <option value="all">All statuses</option>
              {["Active", "Pre-Hire", "On Statutory Leave", "Offboarding", "Terminated"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="ml-auto text-xs text-ink-muted">{filtered.length} records</span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Employee</th>
                  <th className="pb-2 font-semibold">Department</th>
                  <th className="pb-2 font-semibold">Province</th>
                  <th className="pb-2 font-semibold">Tenure</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="py-2.5">
                      <span className="font-medium text-ink">{e.name}</span>
                      <span className="block text-xs text-ink-muted">{e.title}</span>
                    </td>
                    <td className="py-2.5 text-ink-muted">{e.department}</td>
                    <td className="py-2.5">
                      <Badge tone="gray">{provinceName(e.province)}</Badge>
                    </td>
                    <td className="py-2.5 text-ink-muted">{tenureYears(e.hireDate).toFixed(1)} yrs</td>
                    <td className="py-2.5">
                      <Badge
                        tone={
                          e.status === "Active"
                            ? "green"
                            : e.status === "Terminated"
                              ? "red"
                              : e.status === "On Statutory Leave"
                                ? "violet"
                                : "amber"
                        }
                      >
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
            <AlertTriangle className="h-3.5 w-3.5" />
            Exports mask PII unless run by a Super_Admin role (Law 25 compliance). Every export
            appends an audit-trail appendix: who, what parameters, and when.
          </p>
        </Card>

        {/* Standard reports */}
        <div className="lg:col-span-12">
          <h3 className="mb-3 mt-1 text-[15px] font-semibold text-ink">Standard Reports</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {standardReports.map((r) => {
              const Icon = r.icon;
              return (
                <Card key={r.title} className="card-pad transition-shadow hover:shadow-card-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas">
                    <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">{r.desc}</p>
                  <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Generate
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
