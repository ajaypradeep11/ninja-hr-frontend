"use client";

import * as React from "react";
import {
  Banknote,
  Briefcase,
  Check,
  FileText,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  updateEmployee,
} from "@/app/actions/employees";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  PAY_FREQUENCIES,
  WORK_ELIGIBILITY,
  type EmployeeDetail,
  type UpdateEmployeeInput,
} from "@/lib/employees";
import type { TrainingAssignment } from "@/lib/training";
import { PROVINCES, provinceName } from "@/lib/compliance";
import { formatCAD, formatDate } from "@/lib/utils";

const trainingTone: Record<string, "gray" | "amber" | "green"> = {
  Assigned: "gray",
  "In-Progress": "amber",
  Completed: "green",
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value != null && value !== "" ? value : <span className="text-ink-faint">—</span>}</p>
    </div>
  );
}

export function EmployeeRecord({
  initial,
  training = [],
  autoEdit = false,
}: {
  initial: EmployeeDetail;
  training?: TrainingAssignment[];
  autoEdit?: boolean;
}) {
  const [emp, setEmp] = React.useState(initial);
  // Deep-linked "Edit Details" (?edit=1) opens the contact section straight away.
  const [editing, setEditing] = React.useState<string | null>(autoEdit ? "contact" : null);
  const [draft, setDraft] = React.useState<UpdateEmployeeInput>(
    autoEdit
      ? {
          personalEmail: initial.personalEmail,
          phone: initial.phone,
          addressStreet: initial.addressStreet,
          addressCity: initial.addressCity,
          addressProvince: initial.addressProvince,
          addressPostal: initial.addressPostal,
        }
      : {},
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function startEdit(section: string, seed: UpdateEmployeeInput) {
    setEditing(section);
    setDraft(seed);
    setError(null);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setEmp(await updateEmployee(emp.id, draft));
      setEditing(null);
      setDraft({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const SectionEdit = ({ section, children }: { section: string; children: React.ReactNode }) =>
    editing === section ? (
      <div className="space-y-3">
        {children}
        {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setDraft({});
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : null;

  const editBtn = (section: string, seed: UpdateEmployeeInput) => (
    <button
      onClick={() => startEdit(section, seed)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
    >
      <Pencil className="h-3 w-3" /> Edit
    </button>
  );

  const input = (
    key: keyof UpdateEmployeeInput,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label className="field-label">{label}</label>
      <input
        value={(draft[key] as string) ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className="field-input"
        {...props}
      />
    </div>
  );

  const select = (
    key: keyof UpdateEmployeeInput,
    label: string,
    options: readonly string[],
  ) => (
    <div>
      <label className="field-label">{label}</label>
      <select
        value={(draft[key] as string) ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className="field-input"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={emp.name} size={56} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {emp.name}
              {emp.pronouns && <span className="ml-2 text-sm font-normal text-ink-faint">({emp.pronouns})</span>}
            </h1>
            <p className="text-sm text-ink-muted">
              {emp.title} · {emp.department} · {emp.employeeNumber ?? "—"}
            </p>
          </div>
        </div>
        <Badge tone={emp.status === "Active" ? "green" : "amber"}>{emp.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Personal */}
        <Card className="card-pad">
          <CardHeader
            title="Personal"
            action={
              editing === "personal"
                ? undefined
                : editBtn("personal", {
                    preferredName: emp.preferredName,
                    pronouns: emp.pronouns,
                  })
            }
          />
          {editing === "personal" ? (
            <div className="mt-3">
              <SectionEdit section="personal">
                {input("preferredName", "Preferred name")}
                {input("pronouns", "Pronouns")}
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="Legal name" value={emp.name} />
              <Field label="Preferred name" value={emp.preferredName} />
              <Field label="Date of birth" value={formatDate(emp.birthDate)} />
              <Field label="Pronouns" value={emp.pronouns} />
            </div>
          )}
        </Card>

        {/* Contact & address */}
        <Card className="card-pad">
          <CardHeader
            title="Contact & Address"
            action={
              editing === "contact"
                ? undefined
                : editBtn("contact", {
                    personalEmail: emp.personalEmail,
                    phone: emp.phone,
                    addressStreet: emp.addressStreet,
                    addressCity: emp.addressCity,
                    addressProvince: emp.addressProvince,
                    addressPostal: emp.addressPostal,
                  })
            }
          />
          {editing === "contact" ? (
            <div className="mt-3">
              <SectionEdit section="contact">
                {input("personalEmail", "Personal email", { type: "email" })}
                {input("phone", "Phone")}
                {input("addressStreet", "Street")}
                <div className="grid grid-cols-2 gap-3">
                  {input("addressCity", "City")}
                  {select("addressProvince", "Province", PROVINCES.map((p) => p.code))}
                </div>
                {input("addressPostal", "Postal code")}
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="Work email" value={emp.email} />
              <Field label="Personal email" value={emp.personalEmail} />
              <Field
                label="Phone"
                value={emp.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 text-ink-faint" /> {emp.phone}
                  </span>
                )}
              />
              <Field label="Province" value={provinceName(emp.province)} />
              <div className="col-span-2">
                <Field
                  label="Home address"
                  value={
                    emp.addressStreet && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-ink-faint" />
                        {[emp.addressStreet, emp.addressCity, emp.addressProvince, emp.addressPostal]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )
                  }
                />
              </div>
            </div>
          )}
        </Card>

        {/* Employment */}
        <Card className="card-pad">
          <CardHeader
            title="Employment"
            action={
              editing === "employment"
                ? undefined
                : editBtn("employment", {
                    title: emp.title,
                    department: emp.department,
                    manager: emp.manager,
                    status: emp.status,
                    employmentType: emp.employmentType,
                    workLocation: emp.workLocation,
                    employeeNumber: emp.employeeNumber,
                  })
            }
          />
          {editing === "employment" ? (
            <div className="mt-3">
              <SectionEdit section="employment">
                {input("employeeNumber", "Employee ID")}
                {input("title", "Job title")}
                {input("department", "Department")}
                {input("manager", "Manager")}
                {select("employmentType", "Employment type", EMPLOYMENT_TYPES)}
                {input("workLocation", "Work location")}
                {select("status", "Status", EMPLOYEE_STATUSES)}
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="Employee ID" value={emp.employeeNumber} />
              <Field
                label="Title"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-ink-faint" /> {emp.title}
                  </span>
                }
              />
              <Field label="Department" value={emp.department} />
              <Field label="Manager" value={emp.manager} />
              <Field label="Employment type" value={emp.employmentType} />
              <Field label="Work location" value={emp.workLocation} />
              <Field label="Start date" value={formatDate(emp.hireDate)} />
              <Field label="Status" value={emp.status} />
            </div>
          )}
        </Card>

        {/* Compensation */}
        <Card className="card-pad">
          <CardHeader
            title="Compensation"
            action={
              editing === "comp"
                ? undefined
                : editBtn("comp", { salary: emp.salary, payFrequency: emp.payFrequency })
            }
          />
          {editing === "comp" ? (
            <div className="mt-3">
              <SectionEdit section="comp">
                <div>
                  <label className="field-label">Annual salary</label>
                  <input
                    type="number"
                    value={(draft.salary as number) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, salary: Number(e.target.value) }))}
                    className="field-input"
                  />
                </div>
                {select("payFrequency", "Pay frequency", PAY_FREQUENCIES)}
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="Annual salary" value={formatCAD(emp.salary, { maximumFractionDigits: 0 })} />
              <Field label="Pay frequency" value={emp.payFrequency} />
            </div>
          )}
        </Card>

        {/* Work eligibility & tax */}
        <Card className="card-pad">
          <CardHeader
            title="Work Eligibility & Tax"
            action={
              editing === "eligibility"
                ? undefined
                : editBtn("eligibility", {
                    workEligibility: emp.workEligibility,
                    workPermitExpiry: emp.workPermitExpiry,
                    td1FederalOnFile: emp.td1FederalOnFile,
                    td1ProvincialOnFile: emp.td1ProvincialOnFile,
                    sin: "",
                  })
            }
          />
          {editing === "eligibility" ? (
            <div className="mt-3">
              <SectionEdit section="eligibility">
                {select("workEligibility", "Work eligibility", WORK_ELIGIBILITY)}
                {input("workPermitExpiry", "Permit expiry (if any)", { type: "date" })}
                {input("sin", "SIN (leave blank to keep)", { placeholder: "000000000" })}
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={!!draft.td1FederalOnFile}
                    onChange={(e) => setDraft((d) => ({ ...d, td1FederalOnFile: e.target.checked }))}
                    className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400"
                  />
                  Federal TD1 on file
                </label>
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={!!draft.td1ProvincialOnFile}
                    onChange={(e) => setDraft((d) => ({ ...d, td1ProvincialOnFile: e.target.checked }))}
                    className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400"
                  />
                  Provincial TD1 on file
                </label>
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field label="Work eligibility" value={emp.workEligibility} />
              <Field label="Permit expiry" value={emp.workPermitExpiry && formatDate(emp.workPermitExpiry)} />
              <Field
                label="SIN"
                value={
                  emp.hasSin ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Lock className="h-3 w-3 text-ink-faint" /> {emp.sinMasked}
                    </span>
                  ) : undefined
                }
              />
              <Field
                label="TD1 forms"
                value={
                  <span className="flex gap-1">
                    <Badge tone={emp.td1FederalOnFile ? "green" : "gray"}>
                      Federal {emp.td1FederalOnFile ? "✓" : "—"}
                    </Badge>
                    <Badge tone={emp.td1ProvincialOnFile ? "green" : "gray"}>
                      Prov. {emp.td1ProvincialOnFile ? "✓" : "—"}
                    </Badge>
                  </span>
                }
              />
            </div>
          )}
        </Card>

        {/* Direct deposit */}
        <Card className="card-pad">
          <CardHeader
            title="Direct Deposit"
            action={
              editing === "banking"
                ? undefined
                : editBtn("banking", {
                    bankInstitution: emp.bankInstitution,
                    bankTransit: emp.bankTransit,
                    bankAccount: "",
                  })
            }
          />
          {editing === "banking" ? (
            <div className="mt-3">
              <SectionEdit section="banking">
                {input("bankInstitution", "Institution")}
                {input("bankTransit", "Transit no.")}
                {input("bankAccount", "Account no. (leave blank to keep)")}
              </SectionEdit>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field
                label="Institution"
                value={
                  emp.bankInstitution && (
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="h-3 w-3 text-ink-faint" /> {emp.bankInstitution}
                    </span>
                  )
                }
              />
              <Field label="Transit" value={emp.bankTransit} />
              <Field
                label="Account"
                value={
                  emp.hasBanking ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Banknote className="h-3 w-3 text-ink-faint" /> {emp.bankAccountMasked}
                    </span>
                  ) : undefined
                }
              />
            </div>
          )}
          <p className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> SIN and account numbers are masked and HR-only.
          </p>
        </Card>
      </div>

      {/* Emergency contacts */}
      <EmergencyContacts emp={emp} onChange={setEmp} />

      {/* Documents */}
      <Card className="card-pad">
        <CardHeader title="Documents" action={<FileText className="h-4 w-4 text-brand-500 dark:text-brand-400" />} />
        <div className="mt-3 space-y-2">
          {emp.documents.length === 0 ? (
            <p className="text-sm text-ink-muted">No documents on file for this employee.</p>
          ) : (
            emp.documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                  <span className="block text-[11px] text-ink-muted">
                    {d.type} · {d.folder} · uploaded {formatDate(d.uploaded)}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Training record — the employee's assigned courses live on their profile. */}
      <Card className="card-pad">
        <CardHeader
          title="Training record"
          action={<GraduationCap className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
        />
        {training.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No training assigned to this employee yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {training.map((t) => {
              const overdue =
                t.status !== "Completed" &&
                t.dueDate &&
                t.dueDate < new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <GraduationCap className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{t.courseTitle}</span>
                      <Badge tone="gray">{t.courseCategory}</Badge>
                      {overdue && <Badge tone="red">Overdue</Badge>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <ProgressBar value={t.progress} className="max-w-[160px]" />
                      <span className="text-[11px] font-medium text-ink-muted">{t.progress}%</span>
                      {t.dueDate && (
                        <span className="text-[11px] text-ink-faint">
                          Due {formatDate(t.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge tone={trainingTone[t.status]}>{t.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function EmergencyContacts({
  emp,
  onChange,
}: {
  emp: EmployeeDetail;
  onChange: (e: EmployeeDetail) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", relationship: "", phone: "", altPhone: "", isPrimary: false });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const valid = form.name.trim() && form.relationship.trim() && form.phone.trim();

  async function add() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      onChange(
        await addEmergencyContact(emp.id, {
          name: form.name.trim(),
          relationship: form.relationship.trim(),
          phone: form.phone.trim(),
          altPhone: form.altPhone.trim() || undefined,
          isPrimary: form.isPrimary,
        }),
      );
      setForm({ name: "", relationship: "", phone: "", altPhone: "", isPrimary: false });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      onChange(await deleteEmergencyContact(emp.id, id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-pad">
      <CardHeader
        title="Emergency Contacts"
        action={
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
          >
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {adding ? "Cancel" : "Add"}
          </button>
        }
      />
      {adding && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-line bg-canvas/40 p-3.5 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="field-input" />
          <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Relationship" className="field-input" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="field-input" />
          <input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} placeholder="Alt phone (optional)" className="field-input" />
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400" />
            Primary contact
          </label>
          <div className="sm:col-span-2">
            {error && <p className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
            <button onClick={add} disabled={!valid || busy} className="rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              {busy ? "Adding…" : "Add contact"}
            </button>
          </div>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {emp.emergencyContacts.length === 0 && !adding && (
          <p className="text-sm text-ink-muted">No emergency contacts on file.</p>
        )}
        {emp.emergencyContacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            <UserRound className="h-4 w-4 shrink-0 text-ink-faint" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                {c.name}
                {c.isPrimary && <Badge tone="brand">Primary</Badge>}
              </span>
              <span className="block text-[11px] text-ink-muted">
                {c.relationship} · {c.phone}
                {c.altPhone && ` · ${c.altPhone}`}
              </span>
            </span>
            <button onClick={() => remove(c.id)} disabled={busy} className="text-ink-faint hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
