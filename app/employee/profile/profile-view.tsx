"use client";

import * as React from "react";
import {
  Briefcase,
  Check,
  Landmark,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  updateEmployee,
} from "@/app/actions/employees";
import type { EmployeeDetail } from "@/lib/employees";
import type { VaultDocument } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { DocumentsTab } from "./documents-tab";

type ProfileTab = "personal" | "documents";

/**
 * Standard settings-style profile page (the post-onboarding state of the
 * new-hire form). No welcome banner, no step tracker. Contact & address and
 * emergency contacts are directly editable; sensitive fields (SIN, banking)
 * stay masked — changing them notifies HR instead of editing inline.
 * The Documents tab is the employee's filing cabinet (formerly its own page).
 */
export function ProfileView({
  initial,
  documents,
  initialTab = "personal",
}: {
  initial: EmployeeDetail;
  documents: VaultDocument[];
  initialTab?: ProfileTab;
}) {
  const [tab, setTab] = React.useState<ProfileTab>(initialTab);
  const [emp, setEmp] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Editable contact/address fields (the backend rejects anything else for non-HR).
  const [form, setForm] = React.useState({
    preferredName: initial.preferredName ?? "",
    pronouns: initial.pronouns ?? "",
    phone: initial.phone ?? "",
    personalEmail: initial.personalEmail ?? "",
    addressStreet: initial.addressStreet ?? "",
    addressCity: initial.addressCity ?? "",
    addressPostal: initial.addressPostal ?? "",
    birthdayPrivate: initial.birthdayPrivate ?? false,
  });
  const set = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSavedAt(null);
  };

  // New emergency contact
  const [ecName, setEcName] = React.useState("");
  const [ecRel, setEcRel] = React.useState("");
  const [ecPhone, setEcPhone] = React.useState("");

  async function run(fn: () => Promise<EmployeeDetail>, section?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setEmp(await fn());
      if (section) setSavedAt(section);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function saveContact() {
    void run(
      () =>
        updateEmployee(emp.id, {
          preferredName: form.preferredName.trim() || undefined,
          pronouns: form.pronouns.trim() || undefined,
          phone: form.phone.trim() || undefined,
          personalEmail: form.personalEmail.trim() || undefined,
          addressStreet: form.addressStreet.trim() || undefined,
          addressCity: form.addressCity.trim() || undefined,
          addressPostal: form.addressPostal.trim() || undefined,
          birthdayPrivate: form.birthdayPrivate,
        }),
      "contact",
    );
  }

  /** Privacy toggle saves immediately — no separate Save click needed. */
  function toggleBirthdayPrivate(next: boolean) {
    setForm((prev) => ({ ...prev, birthdayPrivate: next }));
    void run(() => updateEmployee(emp.id, { birthdayPrivate: next }), "privacy");
  }

  function addContact() {
    if (!ecName.trim() || !ecRel.trim() || !ecPhone.trim()) return;
    void run(
      () =>
        addEmergencyContact(emp.id, {
          name: ecName.trim(),
          relationship: ecRel.trim(),
          phone: ecPhone.trim(),
          isPrimary: emp.emergencyContacts.length === 0,
        }),
      "emergency",
    );
    setEcName("");
    setEcRel("");
    setEcPhone("");
  }

  /** Sensitive-change path: opens the global HR assistant with the request. */
  function requestBankingUpdate() {
    window.dispatchEvent(
      new CustomEvent("ninjahr:ask-copilot", {
        detail: {
          question:
            "I need to update my direct deposit banking information. Please let HR know and tell me what they need from me.",
        },
      }),
    );
  }

  return (
    <div>
      {/* Standard settings header — no onboarding welcome, no step tracker. */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={emp.name} size={56} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Profile</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {emp.name} · {emp.title} · {emp.department}
            {emp.employeeNumber && <> · {emp.employeeNumber}</>}
          </p>
        </div>
        <Badge tone={emp.status === "Active" ? "green" : "gray"}>{emp.status}</Badge>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-line">
        {(
          [
            { key: "personal", label: "Personal Info" },
            { key: "documents", label: "Documents", count: documents.length },
          ] as { key: ProfileTab; label: string; count?: number }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "-mb-px border-b-2 border-brand-500 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400"
                : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
            }
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "documents" && <DocumentsTab documents={documents} />}

      {error && tab === "personal" && (
        <p className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">{error}</p>
      )}

      <div
        className={
          tab === "personal" ? "grid grid-cols-1 items-start gap-5 lg:grid-cols-2" : "hidden"
        }
      >
        <div className="space-y-5">
          {/* Personal */}
          <Card className="card-pad">
            <CardHeader title="Personal" action={<UserRound className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Legal name</label>
                <input className="field-input bg-canvas text-ink-muted" value={emp.name} readOnly disabled />
              </div>
              <div>
                <label className="field-label">Date of birth</label>
                <input className="field-input bg-canvas text-ink-muted" value={formatDate(emp.birthDate)} readOnly disabled />
              </div>
              <div>
                <label className="field-label">Preferred name</label>
                <input className="field-input" value={form.preferredName} onChange={(e) => set({ preferredName: e.target.value })} placeholder="Optional" />
              </div>
              <div>
                <label className="field-label">Pronouns</label>
                <input className="field-input" value={form.pronouns} onChange={(e) => set({ pronouns: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-line px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.birthdayPrivate}
                disabled={busy}
                onChange={(e) => toggleBirthdayPrivate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-brand-500"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                  Keep my birthday private
                  {savedAt === "privacy" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                      <Check className="h-3 w-3" /> Saved
                    </span>
                  )}
                </span>
                <span className="block text-[11px] leading-snug text-ink-faint">
                  Your date of birth is required for payroll and benefits, but checking this box
                  ensures it will not be shared on team calendars, manager dashboards, or company
                  announcements.
                </span>
              </span>
            </label>
            <p className="mt-2 text-[11px] text-ink-faint">
              Legal name and date of birth changes require HR (identity documents).
            </p>
          </Card>

          {/* Contact & address — directly editable */}
          <Card className="card-pad">
            <CardHeader title="Contact & Address" action={<MapPin className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Phone</label>
                <input className="field-input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Personal email</label>
                <input className="field-input" value={form.personalEmail} onChange={(e) => set({ personalEmail: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="field-label">Street</label>
                <input className="field-input" value={form.addressStreet} onChange={(e) => set({ addressStreet: e.target.value })} />
              </div>
              <div>
                <label className="field-label">City</label>
                <input className="field-input" value={form.addressCity} onChange={(e) => set({ addressCity: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Postal code (ON)</label>
                <input className="field-input" value={form.addressPostal} onChange={(e) => set({ addressPostal: e.target.value.toUpperCase() })} placeholder="M5V 2T6" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                disabled={busy}
                onClick={saveContact}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              {savedAt === "contact" && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              )}
            </div>
          </Card>

          {/* Emergency contacts — directly editable */}
          <Card className="card-pad">
            <CardHeader title="Emergency Contacts" action={<Phone className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 space-y-2">
              {emp.emergencyContacts.length === 0 && (
                <p className="text-sm text-ink-muted">None on file — add one below.</p>
              )}
              {emp.emergencyContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {c.name}
                      {c.isPrimary && <Badge tone="brand" className="ml-2">Primary</Badge>}
                    </p>
                    <p className="text-xs text-ink-muted">{c.relationship} · {c.phone}</p>
                  </div>
                  <button
                    onClick={() => run(() => deleteEmergencyContact(emp.id, c.id), "emergency")}
                    aria-label={`Remove ${c.name}`}
                    className="text-ink-faint hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2">
              <input className="field-input" value={ecName} onChange={(e) => setEcName(e.target.value)} placeholder="Name" />
              <input className="field-input" value={ecRel} onChange={(e) => setEcRel(e.target.value)} placeholder="Relationship" />
              <input className="field-input" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="Phone" />
              <button
                disabled={busy || !ecName.trim() || !ecRel.trim() || !ecPhone.trim()}
                onClick={addContact}
                className="rounded-xl bg-brand-500 px-3 text-white hover:bg-brand-600 disabled:opacity-50"
                aria-label="Add emergency contact"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Employment — read-only */}
          <Card className="card-pad">
            <CardHeader title="Employment" action={<Briefcase className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 space-y-1.5 text-sm">
              {[
                ["Title", emp.title],
                ["Department", emp.department],
                ["Manager", emp.manager ?? "—"],
                ["Employment type", emp.employmentType ?? "—"],
                ["Work location", emp.workLocation ?? "—"],
                ["Hire date", formatDate(emp.hireDate)],
                ["Pay frequency", emp.payFrequency ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-ink-faint">{label}</span>
                  <span className="text-right text-xs font-medium text-ink-soft">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">Managed by HR.</p>
          </Card>

          {/* Tax & eligibility — read-only */}
          <Card className="card-pad">
            <CardHeader title="Work Eligibility & Tax" action={<ShieldCheck className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
            <div className="mt-3 space-y-1.5 text-sm">
              {[
                ["Status", emp.workEligibility ?? "—"],
                ["Permit expiry", emp.workPermitExpiry ? formatDate(emp.workPermitExpiry) : "—"],
                ["TD1 (federal)", emp.td1FederalOnFile ? "On file" : "Missing"],
                ["TD1ON (Ontario)", emp.td1ProvincialOnFile ? "On file" : "Missing"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-ink-faint">{label}</span>
                  <span className="text-right text-xs font-medium text-ink-soft">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Sensitive: SIN + direct deposit — masked, HR-mediated changes */}
          <Card className="card-pad border-violet-200 dark:border-violet-500/30 bg-violet-50/20 dark:bg-violet-500/10">
            <CardHeader title="SIN & Direct Deposit" action={<Landmark className="h-4 w-4 text-violet-500 dark:text-violet-400" />} />
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              <Lock className="h-3 w-3" /> Stored securely — always masked, even to HR.
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
              {[
                ["SIN", emp.hasSin ? emp.sinMasked : "Not on file"],
                ["Institution / Transit", emp.hasBanking ? `${emp.bankInstitution} / ${emp.bankTransit}` : "—"],
                ["Account", emp.hasBanking ? emp.bankAccountMasked : "Not on file"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <span className="text-xs text-ink-faint">{label}</span>
                  <span className="text-right font-mono text-xs font-medium text-ink-soft">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={requestBankingUpdate}
              className="mt-3 w-full rounded-xl border border-violet-300 bg-card px-3.5 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 transition hover:bg-violet-50 dark:hover:bg-violet-500/20"
            >
              Update banking info…
            </button>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              For your protection, banking and SIN changes go through HR — this opens the
              assistant and notifies them of your request.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
