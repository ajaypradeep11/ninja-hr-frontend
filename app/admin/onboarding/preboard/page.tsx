"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Info,
  Cloud,
  FolderGit2,
  Rocket,
  PartyPopper,
  Copy,
  Check,
  ArrowRight,
  Mail,
} from "lucide-react";
import { Card } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { PROVINCES, type ProvinceCode } from "@/lib/compliance";
import { useOnboarding } from "@/components/onboarding-store";
import type { OnboardingCase } from "@/lib/onboarding";

const DEPARTMENTS = ["Engineering", "Design", "Sales", "Finance", "Marketing", "People", "Operations"];
const agenticPoints = [
  "Automated secure data synchronization",
  "Real-time completion tracking",
  "Encrypted document storage",
];

export default function PreboardPage() {
  const { createCase } = useOnboarding();
  const [name, setName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [province, setProvince] = React.useState<ProvinceCode>("ON");
  const [start, setStart] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [created, setCreated] = React.useState<OnboardingCase | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const valid = name.trim() && start && email.includes("@");
  const inviteLink = created ? `${siteOrigin()}/employee/onboarding?case=${created.token}` : "";

  const [launchError, setLaunchError] = React.useState<string | null>(null);

  async function launch() {
    if (submitting) return;
    setSubmitting(true);
    setLaunchError(null);
    try {
      const c = await createCase({ name, title, department, province, startDate: start, personalEmail: email });
      setCreated(c);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Failed to create onboarding case");
    } finally {
      setSubmitting(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function reset() {
    setCreated(null);
    setName("");
    setTitle("");
    setDepartment("");
    setStart("");
    setEmail("");
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand-600">
        <Link href="/admin/onboarding" className="hover:underline">
          Onboarding Portal
        </Link>
      </div>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">Initiate Preboarding</h1>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Start the automated employee journey. Our agent handles the heavy lifting while you
        focus on the culture.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Form */}
        <Card className="card-pad sm:p-7">
          {created ? (
            <div className="py-2">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <PartyPopper className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-ink">Onboarding launched</h2>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  The agent created {created.name}&apos;s profile, generated a {created.department}{" "}
                  checklist, and emailed a secure invite to {created.personalEmail}.
                </p>
              </div>

              <div className="mt-6">
                <label className="field-label">Invite link (sent to personal email)</label>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="flex-1 truncate text-sm text-ink-soft">{inviteLink}</span>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/employee/onboarding?case=${created.token}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Open employee view <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/admin/onboarding/${created.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas"
                >
                  Track in pipeline
                </Link>
              </div>
              <button
                onClick={reset}
                className="mt-4 w-full text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Start another preboarding
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                <div>
                  <label className="field-label">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Julianne Sterling"
                    className="field-input"
                  />
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Start date</label>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Personal email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="julianne.s@personal.com"
                      className="field-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.3fr_1fr_1fr]">
                  <div>
                    <label className="field-label">Job title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Product Designer"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Department</label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className="field-input">
                      <option value="">Select…</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Province</label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value as ProvinceCode)}
                      className="field-input"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {launchError && (
                <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                  {launchError}
                </p>
              )}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft">
                    <Cloud className="h-3.5 w-3.5 text-brand-500" /> {BRAND.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft">
                    <FolderGit2 className="h-3.5 w-3.5 text-sky-500" /> SharePoint
                  </span>
                </div>
                <button
                  disabled={!valid || submitting}
                  onClick={launch}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket className="h-4 w-4" />
                  {submitting ? "Launching…" : "Launch Onboarding"}
                </button>
              </div>
            </>
          )}
        </Card>

        {/* Agentic Logic */}
        <div className="space-y-5">
          <Card className="card-pad sm:p-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">Agentic Logic</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The AI will create the profile and send all onboarding forms{" "}
              <span className="font-semibold text-brand-600">
                (Standard New Hire Form incl. direct deposit, TD1 &amp; TD1ON 2026 tax forms)
              </span>{" "}
              to the employee&apos;s personal email for completion.
            </p>
            <ul className="mt-5 space-y-3">
              {agenticPoints.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-sm text-ink-soft">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>

          <div className="rounded-2xl border border-line bg-white/60 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <Info className="h-3.5 w-3.5" /> Next steps
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Once launched, the candidate receives a branded invitation. You&apos;ll be notified
              as they complete each milestone, then verify their documents before activation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
