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
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Card, CardHeader, PageHeader, Stat } from "@/components/ui";
import type { RecruitmentAnalytics } from "@/lib/recruitment";
import { formatCAD } from "@/lib/utils";

const FUNNEL_COLORS: Record<string, string> = {
  Applied: "#94a3b8",
  "AI Screened": "#38bdf8",
  Interview: "#818cf8",
  Offer: "#a78bfa",
  Hired: "#34d399",
  Rejected: "#f87171",
};

const SOURCE_COLORS = ["#818cf8", "#38bdf8", "#0ea5e9"];

export function AnalyticsView({ data }: { data: RecruitmentAnalytics }) {
  const sourceData = data.sources.filter((s) => s.count > 0);

  return (
    <div>
      <PageHeader
        title="Recruitment Analytics"
        subtitle="Time-to-fill, source effectiveness, funnel conversion and cost-per-hire across your pipeline."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Applicant → Interview"
          value={`${data.applicantToInterview.ratioPct}%`}
          hint={`${data.applicantToInterview.interviewed}/${data.applicantToInterview.applicants} candidates`}
          tone="brand"
        />
        <Stat
          label="Avg time-to-fill"
          value={data.avgTimeToFillDays != null ? `${data.avgTimeToFillDays}d` : "—"}
          hint={data.timeToFill.length ? `${data.timeToFill.length} filled role(s)` : "No hires recorded yet"}
          tone="sky"
        />
        <Stat
          label="Avg cost-per-hire"
          value={data.avgCostPerHire != null ? formatCAD(data.avgCostPerHire, { maximumFractionDigits: 0 }) : "—"}
          hint={data.costPerHire.length ? `${data.costPerHire.length} req(s) with cost data` : "Add cost on req pages"}
          tone="green"
        />
        <Stat
          label="Avg interview score"
          value={data.evaluation.avgInterviewScore != null ? `${data.evaluation.avgInterviewScore}/5` : "—"}
          hint={`${data.evaluation.scorecardsSubmitted} scorecard(s) submitted`}
          tone="violet"
        />
      </div>

      {/* Evaluation KPIs */}
      <Card className="card-pad mb-5">
        <CardHeader title="Interview evaluations" />
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-ink">
                {data.evaluation.candidatesScored}
                <span className="text-sm font-normal text-ink-faint">
                  {" "}
                  / {data.evaluation.interviewedCandidates || "—"}
                </span>
              </p>
              <p className="text-[11px] text-ink-muted">Interviewed candidates scored</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {data.evaluation.avgInterviewScore ?? "—"}
                <span className="text-sm font-normal text-ink-faint">/5</span>
              </p>
              <p className="text-[11px] text-ink-muted">Average rating (all interviewers)</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Recommendation mix
            </p>
            {data.evaluation.recommendationMix.length === 0 ? (
              <p className="text-sm text-ink-muted">No submitted scorecards yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.evaluation.recommendationMix.map((m) => (
                  <span
                    key={m.recommendation}
                    className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft"
                  >
                    {m.count}× {m.recommendation}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Funnel */}
        <Card className="card-pad">
          <CardHeader title="Pipeline funnel" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.funnel.map((f) => (
                    <Cell key={f.stage} fill={FUNNEL_COLORS[f.stage] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sources */}
        <Card className="card-pad">
          <CardHeader title="Source effectiveness" />
          {sourceData.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No sourced applications yet.</p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="count"
                    nameKey="source"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Time to fill */}
        <Card className="card-pad">
          <CardHeader title="Time-to-fill (published → hired)" />
          {data.timeToFill.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              No completed hires with audit history yet — this fills in as candidates reach Hired.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeToFill} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                  <YAxis type="category" dataKey="requisition" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} days`, "Time to fill"]} />
                  <Bar dataKey="days" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Department breakdown */}
        <Card className="card-pad">
          <CardHeader title="Applicants by department" />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDepartment} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="department" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Legend />
                <Bar dataKey="applicants" name="Applicants" fill="#818cf8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hired" name="Hired" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Cost per hire table */}
      <Card className="card-pad mt-5">
        <CardHeader title="Cost-per-hire" />
        {data.costPerHire.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No cost data yet — HR can record recruiting spend on each requisition&apos;s page.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="pb-2">Requisition</th>
                  <th className="pb-2 text-right">Recruiting spend</th>
                  <th className="pb-2 text-right">Hires</th>
                  <th className="pb-2 text-right">Cost per hire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.costPerHire.map((c) => (
                  <tr key={c.requisition}>
                    <td className="py-2.5 font-medium text-ink">{c.requisition}</td>
                    <td className="py-2.5 text-right text-ink-muted">
                      {formatCAD(c.cost, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 text-right text-ink-muted">{c.hires}</td>
                    <td className="py-2.5 text-right font-semibold text-ink">
                      {formatCAD(c.costPerHire, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
