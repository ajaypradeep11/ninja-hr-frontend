"use client";

import Link from "next/link";
import {
  ArrowRight,
  Mail,
  Rocket,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, LinkButton, ProgressBar } from "@/components/ui";
import { onboardingForms } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { useOnboarding } from "@/components/onboarding-store";
import { caseProgress, type CaseStatus } from "@/lib/onboarding";
import { ToolLauncher } from "@/components/tools/tool-launcher";

const statusTone: Record<CaseStatus, "gray" | "amber" | "sky" | "brand" | "green"> = {
  Invited: "gray",
  "Forms In Progress": "amber",
  "Pending Verification": "sky",
  "Ready to Activate": "brand",
  Active: "green",
};

export default function OnboardingPage() {
  const { cases } = useOnboarding();
  const attention = cases.filter(
    (c) => c.status === "Pending Verification" || c.status === "Ready to Activate",
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Onboarding</h1>
          <p className="mt-1 text-sm text-ink-muted">
            One checklist, shared across HR, Finance and IT — the agent does the chasing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToolLauncher surface="onboarding" />
          <LinkButton href="/admin/onboarding/preboard">
            <Rocket className="h-4 w-4" />
            Initiate Preboarding
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Pipeline */}
        <Card className="card-pad lg:col-span-8">
          <CardHeader
            title="Active Onboarding"
            action={<span className="text-xs font-medium text-ink-muted">{cases.length} total</span>}
          />
          <div className="mt-4 space-y-3">
            {cases.map((c) => {
              const progress = caseProgress(c);
              return (
                <Link
                  key={c.id}
                  href={`/admin/onboarding/${c.id}`}
                  className="flex items-center gap-4 rounded-xl border border-line p-3.5 transition hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <Avatar name={c.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {c.title} · {c.province} · starts {formatDate(c.startDate, { year: undefined })}
                    </p>
                  </div>
                  <div className="hidden w-40 items-center gap-3 sm:flex">
                    <ProgressBar
                      value={progress}
                      tone={progress >= 75 ? "green" : progress >= 40 ? "brand" : "amber"}
                    />
                    <span className="w-9 text-right text-xs font-semibold text-ink-soft">{progress}%</span>
                  </div>
                  <Badge tone={statusTone[c.status]}>{c.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-ink-faint" />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Agentic summary + attention */}
        <div className="space-y-5 lg:col-span-4">
          <Card className="card-pad">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">How the agent works</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              On profile creation, the AI emails all onboarding forms to the new hire&apos;s
              personal inbox and tracks completion in real time.
            </p>
            <div className="mt-4 flex items-start gap-2.5 text-sm text-ink-soft">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
              <span>Forms sent for completion</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {onboardingForms.map((f) => (
                <Badge key={f} tone="brand">
                  {f}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="card-pad">
            <CardHeader title="Needs your attention" />
            {attention.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nothing waiting on you right now. 🎉</p>
            ) : (
              <div className="mt-3 space-y-2">
                {attention.map((c) => (
                  <Link
                    key={c.id}
                    href={`/admin/onboarding/${c.id}`}
                    className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5 transition hover:bg-line/50"
                  >
                    <ShieldCheck className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {c.status === "Ready to Activate" ? "Ready to activate" : "Verify documents"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-faint" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
