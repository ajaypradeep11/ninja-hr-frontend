"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PartyPopper,
  ShieldCheck,
  UploadCloud,
  User,
  Landmark,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { provinceName, type ProvinceCode } from "@/lib/compliance";
import { useOnboarding } from "@/components/onboarding-store";
import {
  hasUpload,
  mandatoryPolicies,
  PRIVACY_POLICY_VERSION,
  type NewHireProfileInput,
  type UploadKind,
  type WorkEligibilityLabel,
} from "@/lib/onboarding";

/** The two CRA 2026 tax forms every Ontario hire completes (served locally). */
const TAX_FORMS = [
  {
    file: "/forms/td1-2026-e.pdf",
    name: "TD1 — 2026 Personal Tax Credits Return",
    scope: "Federal (CRA)",
  },
  {
    file: "/forms/td1on-2026-e.pdf",
    name: "TD1ON — 2026 Ontario Personal Tax Credits Return",
    scope: "Provincial (Ontario)",
  },
];

/** Employer documents for the later steps — download, complete, upload back. */
const BENEFITS_FORM = {
  file: "/forms/benefits-enrollment-form.pdf",
  name: "Group Benefits Enrollment Form",
  scope: "NinjaHR — complete, sign & upload",
};
const MANUAL_FORM = {
  file: "/forms/employee-manual-acknowledgment.pdf",
  name: "Employee Manual — Summary & Acknowledgment",
  scope: "NinjaHR — read, sign & upload",
};

const ELIGIBILITY: WorkEligibilityLabel[] = [
  "Citizen",
  "Permanent Resident",
  "Work Permit",
  "Study Permit",
];

/** Turn a browser File into the base64 body the by-token upload endpoint takes. */
async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/** Drag-and-drop / click upload zone for one required preboarding document. */
function FileDrop({
  label,
  uploaded,
  onFile,
}: {
  label: string;
  uploaded: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  const [drag, setDrag] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file || busy) return;
    setErr(null);
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setErr("PDF, PNG or JPEG only.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("File is too large (max 8 MB).");
      return;
    }
    setBusy(true);
    try {
      await onFile(file);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-left text-sm transition-colors",
          uploaded
            ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/10"
            : drag
              ? "border-brand-400 bg-brand-50"
              : "border-line hover:bg-canvas",
        )}
      >
        {uploaded ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <UploadCloud className={cn("h-5 w-5 shrink-0", drag ? "text-brand-500 dark:text-brand-400" : "text-ink-faint")} />
        )}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium", uploaded ? "text-emerald-700 dark:text-emerald-300" : "text-ink-soft")}>
            {busy ? "Uploading…" : uploaded ? `${label} — uploaded ✓` : label}
          </span>
          <span className="block text-xs text-ink-muted">
            {uploaded
              ? "Routed to your Documents for HR verification — click to replace."
              : "Drag & drop or click to upload (PDF, PNG or JPEG, max 8 MB)."}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {err && <p className="mt-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-1.5 text-xs text-red-600 dark:text-red-300">{err}</p>}
    </div>
  );
}

/**
 * The wizard draft: identical to the submit payload except work status starts
 * UNSELECTED — QA flagged that it (and the account holder name) must not come
 * pre-filled; the employee has to choose/type their own values.
 */
type ProfileDraft = Omit<NewHireProfileInput, "workEligibility"> & {
  workEligibility: WorkEligibilityLabel | "";
};

const EMPTY_PROFILE: ProfileDraft = {
  legalFirstName: "",
  legalLastName: "",
  preferredName: "",
  dateOfBirth: "",
  birthdayPrivate: false,
  sin: "",
  phone: "",
  addressStreet: "",
  addressCity: "",
  addressPostal: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",
  workEligibility: "",
  workPermitExpiry: "",
  bankInstitution: "",
  bankTransit: "",
  bankAccount: "",
  bankAccountHolder: "",
};

const STEPS = [
  { id: "personal", label: "New Hire Form", icon: User },
  { id: "tax", label: "Tax Forms (TD1)", icon: Landmark },
  { id: "benefits", label: "Benefits", icon: HeartPulse },
  { id: "handbook", label: "Company Handbook", icon: BookOpen },
];

function Wizard() {
  const params = useSearchParams();
  const token = params.get("case");
  const { getByToken, myCase, markForm, submitProfile, uploadDocument, addConsent, finalizeSubmission, loading } =
    useOnboarding();
  // The invite link carries `?case=`, but the sidebar's Onboarding tab does not
  // — so without a token, fall back to the caller's OWN case rather than to the
  // demo persona below, which showed real hires somebody else's name and data.
  const found = token ? getByToken(token) : myCase ?? undefined;
  // Writes are keyed by the CASE's token, not the URL's: the sidebar route
  // carries no `?case=`, and keying off the URL made every save from there a
  // silent no-op. Null only in the caseless demo, which persists nothing.
  const caseToken = found?.token ?? null;

  // Standalone demo persona — only ever reached tokenless AND caseless (the
  // product tour). A real invitee must never see another identity.
  const profile = found
    ? { name: found.name, first: found.name.split(" ")[0], province: found.province }
    : { name: "Jim Scott", first: "Jim", province: "ON" as ProvinceCode };

  const [step, setStep] = React.useState(0);

  // Standard new-hire form (Ontario) — controlled fields; only the legal name
  // prefills (from the invite HR created). Everything else starts blank.
  const [p, setP] = React.useState<ProfileDraft>(EMPTY_PROFILE);
  const set = (patch: Partial<ProfileDraft>) => setP((prev) => ({ ...prev, ...patch }));
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (prefilled.current) return;
    // Wait until the store resolves before prefilling. This one-shot effect
    // otherwise fires during the loading flash (found still undefined), captures
    // the demo persona ("Jim Scott"), and never corrects itself once the real
    // case loads — leaving the form stuck on the wrong name even though the
    // header shows the right one.
    if (loading) return;
    prefilled.current = true;
    const src = found?.name ?? profile.name;
    setP((prev) => ({
      ...prev,
      legalFirstName: src.split(" ")[0] ?? "",
      legalLastName: src.split(" ").slice(1).join(" "),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, loading]);

  // Uploaded documents: server truth (found.documents) plus a local set so the
  // demo (tokenless) mode and just-finished uploads reflect instantly.
  const [localUploads, setLocalUploads] = React.useState<Set<UploadKind>>(new Set());
  const isUploaded = (kind: UploadKind) =>
    localUploads.has(kind) || hasUpload(found?.documents ?? [], kind);

  /** Upload a section document — routes to the case's Documents automatically. */
  async function uploadKind(kind: UploadKind, file: File) {
    const dataBase64 = await fileToBase64(file);
    if (caseToken) {
      // Store upsert re-binds the case → vault + progress update immediately.
      await uploadDocument(caseToken, { kind, fileName: file.name, mimeType: file.type, dataBase64 });
    }
    setLocalUploads((prev) => new Set(prev).add(kind));
  }

  const [moreThanOneEmployer, setMoreThanOneEmployer] = React.useState(false);

  const [handbookAck, setHandbookAck] = React.useState(false);
  const [privacyConsent, setPrivacyConsent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);

  const needsPermitExpiry =
    p.workEligibility === "Work Permit" || p.workEligibility === "Study Permit";
  const profileValid =
    p.legalFirstName.trim() !== "" &&
    p.legalLastName.trim() !== "" &&
    p.dateOfBirth !== "" &&
    /^\d{9}$/.test(p.sin) &&
    p.phone.trim() !== "" &&
    p.addressStreet.trim() !== "" &&
    p.addressCity.trim() !== "" &&
    /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/.test(p.addressPostal) &&
    p.emergencyName.trim() !== "" &&
    p.emergencyRelationship.trim() !== "" &&
    p.emergencyPhone.trim() !== "" &&
    p.workEligibility !== "" &&
    (!needsPermitExpiry || !!p.workPermitExpiry) &&
    /^\d{3}$/.test(p.bankInstitution) &&
    /^\d{5}$/.test(p.bankTransit) &&
    /^\d{7,12}$/.test(p.bankAccount) &&
    p.bankAccountHolder.trim() !== "";

  // Resume saved progress once the case loads ("your progress is saved
  // automatically" — so don't restart a returning employee at step 0).
  const resumed = React.useRef(false);
  React.useEffect(() => {
    if (!found || resumed.current) return;
    resumed.current = true;
    const f = found.forms;
    if (f.handbook) setStep(STEPS.length);
    else if (f.benefits) setStep(3);
    else if (f.td1) setStep(2);
    else if (f.personal || f.directDeposit) setStep(1);
  }, [found]);

  const done = step >= STEPS.length;

  const canAdvance =
    step === 0
      ? profileValid
      : step === 1
        ? isUploaded("td1-federal") && isUploaded("td1-ontario")
        : step === 2
          ? isUploaded("benefits-enrollment")
          : handbookAck && privacyConsent && isUploaded("manual-acknowledgment");
  const policies = mandatoryPolicies(profile.province);

  async function next() {
    // Persist the current step to the database (if this is a real case).
    if (caseToken) {
      setBusy(true);
      setStepError(null);
      try {
        if (step === 0) {
          // One submission covers personal info + direct deposit — the server
          // stores the form (SIN/bank masked on read) and ticks both flags.
          // profileValid gates this step, so the draft's work status is set.
          await submitProfile(caseToken, {
            ...p,
            workEligibility: p.workEligibility as WorkEligibilityLabel,
            preferredName: p.preferredName?.trim() || undefined,
            workPermitExpiry: needsPermitExpiry ? p.workPermitExpiry || undefined : undefined,
          });
        }
        if (step === 1) await markForm(caseToken, "td1");
        if (step === 2) await markForm(caseToken, "benefits");
        if (step === 3) {
          await markForm(caseToken, "handbook");
          await addConsent(caseToken, "Privacy Policy");
          await finalizeSubmission(caseToken);
        }
      } catch (err) {
        // Nothing was persisted — do NOT advance to a fake success screen.
        setStepError(err instanceof Error ? err.message : "Could not save your progress. Please try again.");
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep((s) => s + 1);
  }

  // Wait for the store before rendering ANY identity — tokenless too, since the
  // caller's own case arrives from the same fetch. Rendering early here is what
  // flashed "Jim" at real hires and stuck the form on his name.
  if (loading) {
    return <div className="py-16 text-center text-sm text-ink-muted">Loading your onboarding…</div>;
  }
  // Unknown/expired invite — hard error instead of silently onboarding "Jim".
  if (token && !found) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Invite link not recognized</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
          This onboarding link is invalid or has expired. Please contact your HR team for a new
          invitation.
        </p>
      </div>
    );
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
                    state === "current" && "border-brand-500 bg-brand-50 text-brand-600 dark:text-brand-400",
                    state === "todo" && "border-line bg-card text-ink-faint",
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
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-ink">Standard New Hire Form</h3>
                    <p className="mt-1 text-sm text-ink-muted">
                      Everything HR needs on file before your first day in Ontario. Sensitive
                      fields (SIN, bank account) are masked everywhere after you submit.
                    </p>
                  </div>

                  {/* Identity */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Legal first name *</label>
                      <input className="field-input" value={p.legalFirstName} onChange={(e) => set({ legalFirstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="field-label">Legal last name *</label>
                      <input className="field-input" value={p.legalLastName} onChange={(e) => set({ legalLastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="field-label">Preferred name</label>
                      <input className="field-input" value={p.preferredName ?? ""} onChange={(e) => set({ preferredName: e.target.value })} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="field-label">Date of birth *</label>
                      <input type="date" className="field-input" value={p.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
                      <label className="mt-2 flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={p.birthdayPrivate ?? false}
                          onChange={(e) => set({ birthdayPrivate: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded accent-brand-500"
                        />
                        <span>
                          <span className="block text-xs font-semibold text-ink">
                            Keep my birthday private
                          </span>
                          <span className="block text-[11px] leading-snug text-ink-faint">
                            Your date of birth is required for payroll and benefits, but checking
                            this box ensures it will not be shared on team calendars, manager
                            dashboards, or company announcements.
                          </span>
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="field-label">Social Insurance Number *</label>
                      <input
                        className="field-input"
                        value={p.sin}
                        onChange={(e) => set({ sin: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                        placeholder="9 digits — required by the CRA"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="field-label">Phone *</label>
                      <input className="field-input" value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(416) 555-0142" />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Home address (Ontario)</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                      <div>
                        <label className="field-label">Street *</label>
                        <input className="field-input" value={p.addressStreet} onChange={(e) => set({ addressStreet: e.target.value })} placeholder="123 Main St, Unit 4" />
                      </div>
                      <div>
                        <label className="field-label">City *</label>
                        <input className="field-input" value={p.addressCity} onChange={(e) => set({ addressCity: e.target.value })} placeholder="Toronto" />
                      </div>
                      <div>
                        <label className="field-label">Postal code *</label>
                        <input className="field-input" value={p.addressPostal} onChange={(e) => set({ addressPostal: e.target.value.toUpperCase() })} placeholder="M5V 2T6" />
                      </div>
                    </div>
                  </div>

                  {/* Emergency contact */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Emergency contact</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="field-label">Name *</label>
                        <input className="field-input" value={p.emergencyName} onChange={(e) => set({ emergencyName: e.target.value })} />
                      </div>
                      <div>
                        <label className="field-label">Relationship *</label>
                        <input className="field-input" value={p.emergencyRelationship} onChange={(e) => set({ emergencyRelationship: e.target.value })} placeholder="Spouse, parent…" />
                      </div>
                      <div>
                        <label className="field-label">Phone *</label>
                        <input className="field-input" value={p.emergencyPhone} onChange={(e) => set({ emergencyPhone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Work eligibility */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Work eligibility in Canada</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="field-label">Status *</label>
                        <select
                          className="field-input"
                          value={p.workEligibility}
                          onChange={(e) => set({ workEligibility: e.target.value as WorkEligibilityLabel })}
                        >
                          {/* Starts unselected on purpose — the employee must
                              declare their own status (QA: no prefill). */}
                          <option value="" disabled>
                            Select your status…
                          </option>
                          {ELIGIBILITY.map((w) => (
                            <option key={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                      {needsPermitExpiry && (
                        <div>
                          <label className="field-label">Permit expiry date *</label>
                          <input type="date" className="field-input" value={p.workPermitExpiry ?? ""} onChange={(e) => set({ workPermitExpiry: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct deposit */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Direct deposit</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="field-label">Institution # *</label>
                        <input className="field-input" value={p.bankInstitution} onChange={(e) => set({ bankInstitution: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="3 digits" inputMode="numeric" />
                      </div>
                      <div>
                        <label className="field-label">Transit # *</label>
                        <input className="field-input" value={p.bankTransit} onChange={(e) => set({ bankTransit: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="5 digits" inputMode="numeric" />
                      </div>
                      <div>
                        <label className="field-label">Account # *</label>
                        <input className="field-input" value={p.bankAccount} onChange={(e) => set({ bankAccount: e.target.value.replace(/\D/g, "").slice(0, 12) })} placeholder="7–12 digits" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="field-label">Account holder name *</label>
                      <input
                        className="field-input"
                        value={p.bankAccountHolder}
                        onChange={(e) => set({ bankAccountHolder: e.target.value })}
                        placeholder="Name exactly as it appears on the account"
                      />
                      <p className="mt-1 text-[11px] text-ink-faint">
                        To avoid payroll delays, the name on your bank account must match your
                        legal name.
                      </p>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-faint">
                      <ShieldCheck className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                      Find these on a void cheque. Your account number is stored encrypted and
                      shown to HR as ••••{p.bankAccount ? p.bankAccount.slice(-4) : "1234"} only.
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Tax Forms — TD1 &amp; TD1ON (2026)</h3>
                  <p className="text-sm text-ink-muted">
                    The CRA requires both Personal Tax Credits Returns before your first pay.
                    Download each fillable PDF, complete and sign it, and bring it on day one
                    (or reply to your welcome email with both attached).
                  </p>

                  {TAX_FORMS.map((f) => (
                    <div key={f.file} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                      <FileText className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                        <span className="block text-xs text-ink-muted">{f.scope} · fillable PDF</span>
                      </span>
                      <a
                        href={f.file}
                        download
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </div>
                  ))}

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
                  {moreThanOneEmployer && (
                    <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                      With more than one employer, you generally can&apos;t claim the basic
                      personal amount twice — check the &quot;More than one employer&quot; box on
                      page 2 of each form and claim $0 to avoid under-withholding.
                    </p>
                  )}

                  <div className="space-y-3 border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Upload your completed forms
                    </p>
                    <FileDrop
                      label="Federal TD1 (2026) — completed & signed"
                      uploaded={isUploaded("td1-federal")}
                      onFile={(f) => uploadKind("td1-federal", f)}
                    />
                    <FileDrop
                      label="Ontario TD1ON (2026) — completed & signed"
                      uploaded={isUploaded("td1-ontario")}
                      onFile={(f) => uploadKind("td1-ontario", f)}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Benefits Enrollment</h3>
                  <p className="text-sm text-ink-muted">
                    Your coverage at a glance — premiums sync automatically to payroll
                    deductions once your enrollment form is processed.
                  </p>
                  {[
                    { name: "Health & Dental (Sun Life)", cost: "$48 / pay" },
                    { name: "Vision Care", cost: "$9 / pay" },
                    { name: "Group RRSP match (up to 4%)", cost: "Matched" },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
                    >
                      <span className="flex items-center gap-3 text-sm text-ink-soft">
                        <HeartPulse className="h-4 w-4 text-brand-500 dark:text-brand-400" />
                        {b.name}
                      </span>
                      <span className="text-xs font-medium text-ink-muted">{b.cost}</span>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{BENEFITS_FORM.name}</span>
                      <span className="block text-xs text-ink-muted">{BENEFITS_FORM.scope}</span>
                    </span>
                    <a
                      href={BENEFITS_FORM.file}
                      download
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>

                  <div className="space-y-3 border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Upload your completed enrollment form
                    </p>
                    <FileDrop
                      label="Benefits Enrollment Form — completed & signed"
                      uploaded={isUploaded("benefits-enrollment")}
                      onFile={(f) => uploadKind("benefits-enrollment", f)}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h3 className="text-base font-bold text-ink">Company Employee Manual &amp; Consent</h3>

                  <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                    <BookOpen className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{MANUAL_FORM.name}</span>
                      <span className="block text-xs text-ink-muted">{MANUAL_FORM.scope}</span>
                    </span>
                    <a
                      href={MANUAL_FORM.file}
                      download
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>

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

                  <div className="space-y-3 border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Upload your signed acknowledgment
                    </p>
                    <FileDrop
                      label="Employee Manual Acknowledgment — signed"
                      uploaded={isUploaded("manual-acknowledgment")}
                      onFile={(f) => uploadKind("manual-acknowledgment", f)}
                    />
                  </div>
                </div>
              )}

              {stepError && (
                <p className="mt-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-300">
                  {stepError}
                </p>
              )}
              <div className="mt-7 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={next} disabled={!canAdvance || busy}>
                  {busy ? "Saving…" : step === STEPS.length - 1 ? "Complete Onboarding" : "Continue"}
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
            <p className="mt-1 text-sm text-ink-muted">
              Company forms to download — and every document you upload, live.
            </p>

            {/* Resubmission loop: rejected docs demand a re-upload, with HR's note. */}
            {found && found.documents.some((d) => d.status === "Pending") && (
              <div className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                Action needed: {found.documents.filter((d) => d.status === "Pending").length} document(s)
                were rejected by HR. Review the note below, fix the document, and upload it again from its
                step — the new upload replaces the rejected one and goes back to HR for review.
              </div>
            )}

            {/* Your uploaded documents — bound to the case, updates on every upload. */}
            {found && found.documents.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Your documents
                </p>
                <div className="mt-1.5 space-y-2">
                  {found.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-soft">{doc.name}</span>
                        <span className="block text-[10px] text-ink-faint">{doc.folder}</span>
                        {doc.status === "Pending" && (
                          <span className="mt-0.5 block text-[11px] text-red-600 dark:text-red-300">
                            {rejectionNoteFor(found.auditLog, doc.name) ?? "Please re-upload this document."}
                          </span>
                        )}
                      </span>
                      <Badge
                        tone={
                          doc.status === "Verified" ? "green" : doc.status === "Pending" ? "red" : "amber"
                        }
                      >
                        {doc.status === "Verified"
                          ? "Verified"
                          : doc.status === "Pending"
                            ? "Rejected — please re-upload"
                            : "With HR"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                Company forms
              </p>
              <div className="mt-1.5 space-y-2">
                {[...TAX_FORMS, BENEFITS_FORM, MANUAL_FORM].map((f) => (
                  <a
                    key={f.file}
                    href={f.file}
                    download
                    className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors hover:bg-canvas"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                    <span className="flex-1 truncate text-sm text-ink-soft">{f.name}</span>
                    <Download className="h-4 w-4 shrink-0 text-ink-faint" />
                  </a>
                ))}
              </div>
            </div>
          </Card>

          {/* bg-card follows the theme — a hardcoded white washed out in dark mode. */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-card p-4 text-sm text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
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

/** Latest HR rejection note for a document, parsed from the case audit trail
 *  (the frozen schema has no rejectionNote column — the note lives in the
 *  immutable audit line `HR rejected document "<name>" — <note>`). */
function rejectionNoteFor(auditLog: { at: string; event: string }[], docName: string): string | null {
  const prefix = `HR rejected document "${docName}" — `;
  for (let i = auditLog.length - 1; i >= 0; i--) {
    if (auditLog[i].event.startsWith(prefix)) return auditLog[i].event.slice(prefix.length);
  }
  return null;
}

export default function OnboardingWizardPage() {
  return (
    <React.Suspense fallback={<div className="text-sm text-ink-muted">Loading…</div>}>
      <Wizard />
    </React.Suspense>
  );
}
