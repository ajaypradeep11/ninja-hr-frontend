"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PartyPopper,
  ShieldCheck,
  User,
  Landmark,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { provinceName, type ProvinceCode } from "@/lib/compliance";
import { useOnboarding } from "@/components/onboarding-store";
import { mandatoryPolicies, PRIVACY_POLICY_VERSION } from "@/lib/onboarding";

const STEPS = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "tax", label: "Tax Documents", icon: Landmark },
  { id: "benefits", label: "Benefits", icon: HeartPulse },
  { id: "handbook", label: "Company Handbook", icon: BookOpen },
];

function Wizard() {
  const params = useSearchParams();
  const token = params.get("case");
  const { getByToken, markForm, addConsent, finalizeSubmission } = useOnboarding();
  const found = token ? getByToken(token) : undefined;

  // Fall back to a standalone demo persona if no case token is present.
  const profile = found
    ? { name: found.name, first: found.name.split(" ")[0], province: found.province }
    : { name: "Jim Scott", first: "Jim", province: "BC" as ProvinceCode };

  const [step, setStep] = React.useState(0);
  const [moreThanOneEmployer, setMoreThanOneEmployer] = React.useState(false);
  const [dependents, setDependents] = React.useState(false);
  const [handbookAck, setHandbookAck] = React.useState(false);
  const [privacyConsent, setPrivacyConsent] = React.useState(false);
  const done = step >= STEPS.length;

  const canAdvance = step === 3 ? handbookAck && privacyConsent : true;
  const policies = mandatoryPolicies(profile.province);

  const [busy, setBusy] = React.useState(false);

  async function next() {
    // Persist the current step to the database (if this is a real case).
    if (token) {
      setBusy(true);
      try {
        if (step === 0) {
          await markForm(token, "personal");
          await markForm(token, "directDeposit");
        }
        if (step === 1) await markForm(token, "td1");
        if (step === 2) await markForm(token, "benefits");
        if (step === 3) {
          await markForm(token, "handbook");
          await addConsent(token, "Privacy Policy");
          await finalizeSubmission(token);
        }
      } finally {
        setBusy(false);
      }
    }
    setStep((s) => s + 1);
  }

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-tight text-ink">
        Welcome aboard, {profile.first} 👋
      </h1>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        Let&apos;s get your paperwork done before day one. This takes about 8 minutes — your
        progress is saved automatically.
        {found && (
          <span className="ml-1 text-ink-faint">
            ({provinceName(profile.province)} employee)
          </span>
        )}
      </p>

      {/* Flight path */}
      <div className="mt-7 flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const state = done || i < step ? "done" : i === step ? "current" : "todo";
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors",
                    state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                    state === "current" && "border-brand-500 bg-brand-50 text-brand-600",
                    state === "todo" && "border-line bg-white text-ink-faint",
                  )}
                >
                  {state === "done" ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    state === "todo" ? "text-ink-faint" : "text-ink-soft",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full",
                    done || i < step ? "bg-emerald-500" : "bg-line",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="card-pad sm:p-7">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PartyPopper className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-ink">You&apos;re all set!</h2>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Your onboarding is complete. HR has been notified and will verify your documents
                before your account is activated. See you on your first day!
              </p>
              <Button className="mt-5" variant="secondary" onClick={() => setStep(0)}>
                Review my answers
              </Button>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Personal Information</h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Legal first name</label>
                      <input className="field-input" defaultValue={profile.first} />
                    </div>
                    <div>
                      <label className="field-label">Legal last name</label>
                      <input className="field-input" defaultValue={profile.name.split(" ").slice(1).join(" ")} />
                    </div>
                    <div>
                      <label className="field-label">Home address</label>
                      <input className="field-input" placeholder="123 Main St" />
                    </div>
                    <div>
                      <label className="field-label">Phone</label>
                      <input className="field-input" placeholder="(604) 555-0142" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Direct deposit — void cheque</label>
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-5 text-sm text-ink-muted">
                      <FileText className="h-5 w-5 text-ink-faint" />
                      Drag &amp; drop a void cheque or bank letter, or click to upload.
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Smart TD1 — Tax Credits</h3>
                  <p className="text-sm text-ink-muted">
                    Answer a couple of questions and we&apos;ll generate your federal (CRA) and{" "}
                    {profile.province} provincial TD1 forms automatically.
                  </p>
                  <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                    <span className="text-sm text-ink-soft">
                      Do you have more than one employer at the same time?
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-500"
                      checked={moreThanOneEmployer}
                      onChange={(e) => setMoreThanOneEmployer(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                    <span className="text-sm text-ink-soft">Do you support an eligible dependent?</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-500"
                      checked={dependents}
                      onChange={(e) => setDependents(e.target.checked)}
                    />
                  </label>
                  <div className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
                    Estimated basic personal amount:{" "}
                    <span className="font-semibold text-ink">
                      ${(15705 + (dependents ? 2616 : 0)).toLocaleString()}
                    </span>
                    {moreThanOneEmployer && (
                      <span className="mt-1 block text-xs text-amber-600">
                        Because you have more than one employer, you should claim $0 here to avoid
                        under-withholding.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Benefits Enrollment</h3>
                  <p className="text-sm text-ink-muted">
                    Select your coverage. Premiums sync automatically to payroll deductions.
                  </p>
                  {[
                    { name: "Health & Dental (Sun Life)", cost: "$48 / pay" },
                    { name: "Vision Care", cost: "$9 / pay" },
                    { name: "Group RRSP match (up to 4%)", cost: "Matched" },
                  ].map((p) => (
                    <label
                      key={p.name}
                      className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
                    >
                      <span className="flex items-center gap-3 text-sm text-ink-soft">
                        <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand-500" />
                        {p.name}
                      </span>
                      <span className="text-xs font-medium text-ink-muted">{p.cost}</span>
                    </label>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Company Handbook &amp; Consent</h3>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-line bg-canvas p-4 text-xs leading-relaxed text-ink-muted">
                    <p className="font-semibold text-ink-soft">
                      Required policies for {provinceName(profile.province)}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {policies.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                      checked={handbookAck}
                      onChange={(e) => setHandbookAck(e.target.checked)}
                    />
                    I acknowledge that I have read and understood the Employee Handbook and the
                    policies above.
                  </label>
                  <label className="flex items-start gap-3 rounded-xl bg-brand-50/60 p-3 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                      checked={privacyConsent}
                      onChange={(e) => setPrivacyConsent(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium text-ink">Privacy consent (Law 25 &amp; PIPEDA).</span>{" "}
                      I consent to the collection and use of my personal data as described in
                      Privacy Policy {PRIVACY_POLICY_VERSION}.
                    </span>
                  </label>
                </div>
              )}

              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={next} disabled={!canAdvance || busy}>
                  {step === STEPS.length - 1 ? "Complete Onboarding" : "Continue"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Digital Vault */}
        <div className="space-y-5">
          <Card className="card-pad">
            <h3 className="text-base font-bold text-ink">Your Digital Vault</h3>
            <p className="mt-1 text-sm text-ink-muted">Documents you can download for your own records.</p>
            <div className="mt-4 space-y-2">
              {["Signed Offer Letter.pdf", "Employment Agreement.pdf"].map((d) => (
                <button
                  key={d}
                  className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors hover:bg-canvas"
                >
                  <FileText className="h-4 w-4 text-brand-500" />
                  <span className="flex-1 truncate text-sm text-ink-soft">{d}</span>
                  <Download className="h-4 w-4 text-ink-faint" />
                </button>
              ))}
            </div>
          </Card>

          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-white/60 p-4 text-sm text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              Your data is encrypted at rest and in transit. A human HR reviewer verifies your
              identity documents before your account is activated.
            </span>
          </div>

          <div className="rounded-2xl bg-canvas p-4">
            <Badge tone="brand">{provinceName(profile.province)} employee</Badge>
            <p className="mt-2 text-xs text-ink-muted">
              You&apos;re only shown the policies and forms required for your province.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingWizardPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-ink-muted">Loading…</div>}>
      <Wizard />
    </React.Suspense>
  );
}
