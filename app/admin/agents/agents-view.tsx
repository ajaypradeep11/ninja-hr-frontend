"use client";

import * as React from "react";
import {
  Bot,
  CornerDownLeft,
  ShieldOff,
  FileEdit,
  ScrollText,
  CheckCircle2,
  Eye,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  ProgressBar,
  PageHeader,
} from "@/components/ui";
import type { AgentRun } from "@/lib/data";
import { createAgentRun, setAgentRunStatus } from "@/app/actions/modules";

const guardrails = [
  {
    icon: ShieldOff,
    title: "No autonomous destruction",
    desc: "The agent never executes a DELETE or a transition to Terminated / Rejected without explicit human confirmation.",
  },
  {
    icon: FileEdit,
    title: "Geofenced legal updates",
    desc: "When a provincial ESA changes, the agent drafts a config update for review — it never mutates live parameters.",
  },
  {
    icon: ScrollText,
    title: "Auditable reasoning",
    desc: "Every run logs timestamp, intent, affected record count, and a reasoning summary to ai_agent_execution_logs.",
  },
];

const statusTone = {
  Running: "sky",
  "Awaiting Approval": "amber",
  Completed: "green",
} as const;

interface AgentsViewProps {
  initial: AgentRun[];
}

export function AgentsView({ initial }: AgentsViewProps) {
  const [runs, setRuns] = React.useState<AgentRun[]>(initial);
  const [command, setCommand] = React.useState("");
  const [runError, setRunError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [resolving, setResolving] = React.useState<string | null>(null);

  const pending = runs.filter((r) => r.status === "Awaiting Approval");

  async function submit() {
    const t = command.trim();
    if (!t) return;
    setCommand("");
    try {
      setRunError(null);
      setRuns(await createAgentRun(t));
    } catch (err) {
      // Restore the command so the user can retry; keep the current run list.
      setCommand(t);
      setRunError(err instanceof Error ? err.message : "Failed to start agent run");
    }
  }

  async function resolve(id: string) {
    const run = runs.find((candidate) => candidate.id === id);
    if (run?.items.length && !confirm(`File ${run.items.filter((item) => item.status === "Pending").length} pending letter(s) to employee vaults? Failed drafts will not be filed.`)) return;
    try {
      setRunError(null);
      setResolving(id);
      setRuns(await setAgentRunStatus(id, "Completed"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update run";
      setRunError(message.includes("409") || message.toLowerCase().includes("processed") ? "This run is already being processed. Refresh to see its latest status." : message);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Agents"
        subtitle="Autonomous workflow executors for the admin heavy lifting — with hard guardrails."
      />

      {runError && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{runError}</div>
      )}

      {/* Command bar */}
      <Card className="card-pad mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3 py-1 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder='e.g. "Audit our jobs for Bill 149" or "Generate an offboarding checklist for Jane Doe"'
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-ink-faint"
            />
            <button
              onClick={submit}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600"
            >
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Activity ledger */}
        <Card className="card-pad lg:col-span-7">
          <CardHeader title="Agent Activity Ledger" />
          <div className="mt-4 space-y-4">
            {runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{run.intent}</p>
                  <Badge tone={statusTone[run.status]}>
                    {run.status === "Running" && <Loader2 className="h-3 w-3 animate-spin" />}
                    {run.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{run.summary}</p>
                {run.status === "Running" && (
                  <div className="mt-3 flex items-center gap-2">
                    <ProgressBar value={run.progress} tone="sky" />
                    <span className="text-[11px] font-medium text-ink-muted">{run.progress}%</span>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-ink-faint">
                  {run.affected > 0 && `${run.affected} record(s) affected · `}
                  {run.time}
                </p>
                {run.items.length > 0 && <button onClick={() => setExpanded(expanded === run.id ? null : run.id)} className="mt-2 text-xs font-semibold text-brand-600">{expanded === run.id ? "Hide review" : "Review letters"}</button>}
                {expanded === run.id && <div className="mt-3 max-h-80 space-y-3 overflow-y-auto border-t border-line pt-3">{run.items.map((item) => <div key={item.id} className="rounded-xl bg-canvas p-3"><div className="flex flex-wrap items-center gap-2 text-xs"><strong>{item.payload.employeeName}</strong><Badge tone={item.status === "Issued" ? "green" : item.status === "Failed" ? "red" : "amber"}>{item.status}</Badge><span>{item.payload.mode === "signature" ? "Signature" : "Save"}</span>{item.payload.aiPersonalized && <span>AI personalized</span>}</div>{item.payload.error && <p className="mt-2 text-xs text-red-600">{item.payload.error}</p>}<pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-3 text-xs text-ink">{item.payload.body}</pre></div>)}</div>}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-5">
          {/* Intercept guard */}
          <Card className="card-pad">
            <CardHeader
              title="Intercept Guard"
              action={<Badge tone="amber">{pending.length} awaiting</Badge>}
            />
            <p className="mt-1 text-xs text-ink-muted">
              Actions that mutate critical records queue here for a human click.
            </p>
            <div className="mt-4 space-y-3">
              {pending.length === 0 && (
                <p className="rounded-xl bg-canvas px-3 py-4 text-center text-xs text-ink-muted">
                  Nothing awaiting approval.
                </p>
              )}
              {pending.map((run) => (
                <div key={run.id} className="rounded-2xl bg-canvas p-3.5">
                  <p className="text-sm font-medium text-ink">{run.summary}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" disabled={resolving !== null} onClick={() => resolve(run.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={resolving !== null} className="flex-1" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                      <Eye className="h-3.5 w-3.5" /> Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Guardrails */}
          <Card className="card-pad">
            <CardHeader title="Operational Guardrails" />
            <div className="mt-4 space-y-4">
              {guardrails.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{g.title}</p>
                      <p className="text-xs text-ink-muted">{g.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Execution log */}
        <Card className="card-pad lg:col-span-12">
          <CardHeader title="ai_agent_execution_logs" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 font-semibold">Timestamp</th>
                  <th className="pb-2 font-semibold">Intent</th>
                  <th className="pb-2 font-semibold">Affected</th>
                  <th className="pb-2 font-semibold">Reasoning summary</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-line align-top">
                    <td className="whitespace-nowrap py-2.5 text-ink-muted">{run.time}</td>
                    <td className="py-2.5 font-medium text-ink">{run.intent}</td>
                    <td className="py-2.5 text-ink-muted">{run.affected}</td>
                    <td className="py-2.5 text-ink-muted">{run.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
