"use client";

import * as React from "react";
import Link from "next/link";
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
  ChevronDown,
  Eye,
  Loader2,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  updateEmployee,
} from "@/app/actions/employees";
import { assignTraining } from "@/app/actions/training";
import { deleteVaultDocument, uploadVaultDocument } from "@/app/actions/documents";
import {
  getDepartmentOptions,
  getJobTitleOptions,
  saveDepartmentOptions,
  saveJobTitleOptions,
} from "@/app/actions/onboarding";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  PAY_FREQUENCIES,
  WORK_ELIGIBILITY,
  type EmployeeDetail,
  type UpdateEmployeeInput,
} from "@/lib/employees";
import type { TrainingAssignment, TrainingCourse } from "@/lib/training";
import { PROVINCES, provinceName } from "@/lib/compliance";
import { formatCAD, formatDate, cn } from "@/lib/utils";

const trainingTone: Record<string, "gray" | "amber" | "green"> = {
  Assigned: "gray",
  "In-Progress": "amber",
  Completed: "green",
};

const SECTION_TITLES: Record<string, string> = {
  personal: "Personal",
  contact: "Contact & Address",
  employment: "Employment",
  comp: "Compensation",
  eligibility: "Work Eligibility & Tax",
  banking: "Direct Deposit",
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value != null && value !== "" ? value : <span className="text-ink-faint">—</span>}</p>
    </div>
  );
}

/** Every existing value of the section, so the modal opens fully pre-populated. */
function seedFor(section: string, emp: EmployeeDetail): UpdateEmployeeInput {
  switch (section) {
    case "personal":
      return {
        name: emp.name,
        preferredName: emp.preferredName,
        pronouns: emp.pronouns,
        birthDate: emp.birthDate,
      };
    case "contact":
      return {
        personalEmail: emp.personalEmail,
        phone: emp.phone,
        addressStreet: emp.addressStreet,
        addressCity: emp.addressCity,
        addressProvince: emp.addressProvince,
        addressPostal: emp.addressPostal,
      };
    case "employment":
      return {
        employeeNumber: emp.employeeNumber,
        title: emp.title,
        department: emp.department,
        manager: emp.manager,
        status: emp.status,
        employmentType: emp.employmentType,
        workLocation: emp.workLocation,
        hireDate: emp.hireDate,
      };
    case "comp":
      return { salary: emp.salary, payFrequency: emp.payFrequency };
    case "eligibility":
      return {
        workEligibility: emp.workEligibility,
        workPermitExpiry: emp.workPermitExpiry,
        td1FederalOnFile: emp.td1FederalOnFile,
        td1ProvincialOnFile: emp.td1ProvincialOnFile,
        sin: "",
      };
    case "banking":
      return {
        bankInstitution: emp.bankInstitution,
        bankTransit: emp.bankTransit,
        bankAccount: "",
      };
    default:
      return {};
  }
}

export interface CaseDocRef {
  caseId: string;
  docId: string;
  name: string;
  status: string;
  hasFile: boolean;
}

export function EmployeeRecord({
  initial,
  training: initialTraining = [],
  courses = [],
  caseDocs = [],
  autoEdit = false,
}: {
  initial: EmployeeDetail;
  training?: TrainingAssignment[];
  courses?: TrainingCourse[];
  /** Onboarding submissions (from this person's case) — viewable via the BFF file proxy. */
  caseDocs?: CaseDocRef[];
  autoEdit?: boolean;
}) {
  const [emp, setEmp] = React.useState(initial);
  const [training, setTraining] = React.useState(initialTraining);
  const [view, setView] = React.useState<"details" | "documents">("details");
  const [addingDoc, setAddingDoc] = React.useState(false);
  // Folder accordion — folders holding files start expanded.
  const [openFolders, setOpenFolders] = React.useState<string[]>(() => {
    const withFiles = new Set(initial.documents.map((d) => d.folder));
    if (caseDocs.length) withFiles.add("02_Onboarding_and_Tax");
    return [...withFiles];
  });
  const toggleFolder = (f: string) =>
    setOpenFolders((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  // Admin-managed option lists for the Employment edit modal (Settings → Option Lists).
  const [deptOptions, setDeptOptions] = React.useState<string[]>([]);
  const [titleOptions, setTitleOptions] = React.useState<string[]>([]);
  React.useEffect(() => {
    void getDepartmentOptions().then(setDeptOptions).catch(() => {});
    void getJobTitleOptions().then(setTitleOptions).catch(() => {});
  }, []);
  const [docBusy, setDocBusy] = React.useState<string | null>(null);
  const [docError, setDocError] = React.useState<string | null>(null);

  async function removeDoc(id: string) {
    setDocBusy(id);
    setDocError(null);
    try {
      await deleteVaultDocument(id);
      setEmp((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }));
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Could not remove the document");
    } finally {
      setDocBusy(null);
    }
  }
  // Deep-linked "Edit Details" (?edit=1) opens the contact section straight away.
  const [editing, setEditing] = React.useState<string | null>(autoEdit ? "contact" : null);
  const [draft, setDraft] = React.useState<UpdateEmployeeInput>(
    autoEdit ? seedFor("contact", initial) : {},
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assigning, setAssigning] = React.useState(false);

  function startEdit(section: string) {
    setEditing(section);
    setDraft(seedFor(section, emp));
    setError(null);
  }

  function closeEdit() {
    setEditing(null);
    setDraft({});
    setError(null);
  }

  async function save() {
    if (busy) return;
    if (draft.name !== undefined && !draft.name.trim()) {
      setError("Legal name is required");
      return;
    }
    // Sanity: an employee cannot start work before they were born. Compare the
    // drafted value against the saved one when only one side is being edited.
    const hire = draft.hireDate ?? emp.hireDate;
    const birth = draft.birthDate ?? emp.birthDate;
    if (hire && birth && hire < birth) {
      setError("Start date cannot be before date of birth");
      return;
    }
    // "Leave blank to keep": an empty SIN/account means don't touch the stored
    // value, so it must not reach the API (the backend treats "" as a clear).
    const payload = { ...draft };
    if (!payload.sin) delete payload.sin;
    if (!payload.bankAccount) delete payload.bankAccount;
    setBusy(true);
    setError(null);
    try {
      setEmp(await updateEmployee(emp.id, payload));
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const editBtn = (section: string) => (
    <button
      onClick={() => startEdit(section)}
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

  /** Select fed by an admin-managed option list with an inline "+ Add new…"
   *  that persists company-wide (same lists the Add-Employee form uses). */
  const optionField = (
    key: keyof UpdateEmployeeInput,
    label: string,
    options: string[],
    persist: (items: string[]) => Promise<string[]>,
    setOptions: (items: string[]) => void,
  ) => {
    const current = (draft[key] as string) ?? "";
    return (
      <div>
        <label className="field-label">{label}</label>
        <select
          value={current}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__add__") {
              const added = window.prompt(`New ${label.toLowerCase()}:`)?.trim();
              if (added) {
                void persist([...options, added]).then(setOptions).catch(() => {});
                setDraft((d) => ({ ...d, [key]: added }));
              }
              return;
            }
            setDraft((d) => ({ ...d, [key]: v }));
          }}
          className="field-input"
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
          {current && !options.includes(current) && <option value={current}>{current}</option>}
          <option value="__add__">+ Add new…</option>
        </select>
      </div>
    );
  };

  const checkbox = (key: keyof UpdateEmployeeInput, label: string) => (
    <label className="flex items-center gap-2 text-xs text-ink-soft">
      <input
        type="checkbox"
        checked={!!draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
        className="h-4 w-4 rounded border-line text-brand-500 dark:text-brand-400"
      />
      {label}
    </label>
  );

  /** All fields of the section being edited, pre-populated from the record. */
  function sectionFields(section: string): React.ReactNode {
    switch (section) {
      case "personal":
        return (
          <>
            {input("name", "Legal name")}
            {input("preferredName", "Preferred name")}
            {input("birthDate", "Date of birth", { type: "date" })}
            {input("pronouns", "Pronouns")}
          </>
        );
      case "contact":
        return (
          <>
            {input("personalEmail", "Personal email", { type: "email" })}
            {input("phone", "Phone")}
            {input("addressStreet", "Street")}
            <div className="grid grid-cols-2 gap-3">
              {input("addressCity", "City")}
              {select("addressProvince", "Province", PROVINCES.map((p) => p.code))}
            </div>
            {input("addressPostal", "Postal code")}
          </>
        );
      case "employment":
        return (
          <>
            {input("employeeNumber", "Employee ID")}
            {optionField("title", "Job title", titleOptions, saveJobTitleOptions, setTitleOptions)}
            {optionField("department", "Department", deptOptions, saveDepartmentOptions, setDeptOptions)}
            {input("manager", "Manager")}
            {select("employmentType", "Employment type", EMPLOYMENT_TYPES)}
            {input("workLocation", "Work location")}
            {input("hireDate", "Start date", { type: "date" })}
            {select("status", "Status", EMPLOYEE_STATUSES)}
          </>
        );
      case "comp":
        return (
          <>
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
          </>
        );
      case "eligibility":
        return (
          <>
            {select("workEligibility", "Work eligibility", WORK_ELIGIBILITY)}
            {input("workPermitExpiry", "Permit expiry (if any)", { type: "date" })}
            {input("sin", "SIN (leave blank to keep)", { placeholder: "000000000" })}
            {checkbox("td1FederalOnFile", "Federal TD1 on file")}
            {checkbox("td1ProvincialOnFile", "Provincial TD1 on file")}
          </>
        );
      case "banking":
        return (
          <>
            {input("bankInstitution", "Institution")}
            {input("bankTransit", "Transit no.")}
            {input("bankAccount", "Account no. (leave blank to keep)")}
          </>
        );
      default:
        return null;
    }
  }

  /** Merge freshly created assignments for this employee into the local record. */
  function handleAssigned(returned: TrainingAssignment[]) {
    const mine = returned.filter((a) => a.employeeId === emp.id);
    setTraining((prev) => [
      ...prev.filter((p) => !mine.some((m) => m.courseId === p.courseId)),
      ...mine,
    ]);
    setAssigning(false);
  }

  // Header shows the name the person goes by; legal name stays in Personal.
  const displayName = emp.preferredName || emp.name;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} size={56} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {displayName}
              {emp.pronouns && <span className="ml-2 text-sm font-normal text-ink-faint">({emp.pronouns})</span>}
            </h1>
            <p className="text-sm text-ink-muted">
              {emp.title} · {emp.department} · {emp.employeeNumber ?? "—"}
            </p>
          </div>
        </div>
        <Badge tone={emp.status === "Active" ? "green" : "amber"}>{emp.status}</Badge>
      </div>

      {/* Tabs — HRIS details vs. the document cabinet. */}
      <div className="flex gap-1 border-b border-line">
        {(
          [
            ["details", "Details"],
            ["documents", `Documents (${emp.documents.length + caseDocs.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "-mb-px rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors",
              view === key
                ? "border-x border-t border-line bg-card text-ink"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "details" && (
      <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Personal */}
        <Card className="card-pad">
          <CardHeader title="Personal" action={editBtn("personal")} />
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Legal name" value={emp.name} />
            <Field label="Preferred name" value={emp.preferredName} />
            <Field label="Date of birth" value={formatDate(emp.birthDate)} />
            <Field label="Pronouns" value={emp.pronouns} />
          </div>
        </Card>

        {/* Contact & address */}
        <Card className="card-pad">
          <CardHeader title="Contact & Address" action={editBtn("contact")} />
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
        </Card>

        {/* Employment */}
        <Card className="card-pad">
          <CardHeader title="Employment" action={editBtn("employment")} />
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
        </Card>

        {/* Compensation */}
        <Card className="card-pad">
          <CardHeader title="Compensation" action={editBtn("comp")} />
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Annual salary" value={formatCAD(emp.salary, { maximumFractionDigits: 0 })} />
            <Field label="Pay frequency" value={emp.payFrequency} />
          </div>
        </Card>

        {/* Work eligibility & tax */}
        <Card className="card-pad">
          <CardHeader title="Work Eligibility & Tax" action={editBtn("eligibility")} />
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
        </Card>

        {/* Direct deposit */}
        <Card className="card-pad">
          <CardHeader title="Direct Deposit" action={editBtn("banking")} />
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
          <p className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> SIN and account numbers are masked and HR-only.
          </p>
        </Card>
      </div>

      {/* Emergency contacts */}
      <EmergencyContacts emp={emp} onChange={setEmp} />

      {/* Training record — the employee's assigned courses live on their profile. */}
      <Card className="card-pad">
        <CardHeader
          title="Training record"
          action={<GraduationCap className="h-4 w-4 text-brand-500 dark:text-brand-400" />}
        />
        {training.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-8 text-center">
            <p className="text-sm text-ink-muted">No training assigned to this employee yet.</p>
            <button
              onClick={() => setAssigning(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Training
            </button>
          </div>
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

      </>
      )}

      {view === "documents" && (
        <Card className="card-pad">
          <CardHeader
            title="Document cabinet"
            action={
              <button
                onClick={() => setAddingDoc(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:bg-brand-100"
              >
                <Plus className="h-3.5 w-3.5" /> Add Document
              </button>
            }
          />
          <p className="mt-1 text-xs text-ink-muted">
            Filed by vault folder. Onboarding submissions live under 02 · Onboarding &amp; Tax.
          </p>
          <div className="mt-4 space-y-2.5">
            {employeeFolders(emp.documents).map((folder) => {
              const vaultDocs = emp.documents.filter((d) => d.folder === folder);
              const onboardingDocs = folder === ONBOARDING_FOLDER ? caseDocs : [];
              const count = vaultDocs.length + onboardingDocs.length;
              const open = openFolders.includes(folder);
              return (
                <div key={folder} className="overflow-hidden rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-canvas"
                  >
                    {open && count > 0 ? (
                      <FolderOpen className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                    ) : (
                      <Folder className="h-4 w-4 shrink-0 text-ink-faint" />
                    )}
                    <span className="flex-1 text-sm font-semibold text-ink">{folderLabel(folder)}</span>
                    <span className="text-[11px] font-semibold text-ink-faint">
                      {count === 0 ? "Empty" : `${count} file${count === 1 ? "" : "s"}`}
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-ink-faint transition-transform", open && "rotate-180")}
                    />
                  </button>
                  {open && count > 0 && (
                    <div className="space-y-2 border-t border-line bg-canvas/50 p-2.5">
                      {vaultDocs.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                            <span className="block text-[11px] text-ink-muted">
                              {d.type} · uploaded {formatDate(d.uploaded)}
                            </span>
                          </span>
                          <DocRowMenu
                            viewHref={d.hasFile ? `/api/vault/${d.id}` : undefined}
                            onRemove={() => void removeDoc(d.id)}
                            busy={docBusy === d.id}
                          />
                        </div>
                      ))}
                      {onboardingDocs.map((d) => (
                        <div key={d.docId} className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                            <span className="block text-[11px] text-ink-muted">
                              Onboarding submission · {d.status === "Pending" ? "Rejected — awaiting re-upload" : d.status}
                            </span>
                          </span>
                          {d.hasFile ? (
                            <DocRowMenu viewHref={`/api/onboarding/${d.caseId}/documents/${d.docId}`} />
                          ) : (
                            <span className="shrink-0 text-[11px] text-ink-faint">No file</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {docError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {docError}
            </p>
          )}
          {addingDoc && (
            <AddDocumentModal
              employeeName={emp.name}
              onClose={() => setAddingDoc(false)}
              onAdded={(doc) => {
                setEmp((prev) => ({
                  ...prev,
                  documents: [
                    { id: doc.id, name: doc.name, type: doc.type, folder: doc.folder, uploaded: doc.uploaded, hasFile: doc.hasFile },
                    ...prev.documents,
                  ],
                }));
                setOpenFolders((prev) => (prev.includes(doc.folder) ? prev : [...prev, doc.folder]));
              }}
            />
          )}
        </Card>
      )}

      {/* Section edit modal — every field of the section, pre-populated. */}
      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/20" onClick={closeEdit} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="text-sm font-bold text-ink">Edit {SECTION_TITLES[editing] ?? "section"}</p>
              <button onClick={closeEdit} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">{sectionFields(editing)}</div>
            <div className="border-t border-line px-5 py-4">
              {error && <p className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={closeEdit}
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-canvas"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {assigning && (
        <AssignTrainingModal
          emp={emp}
          courses={courses}
          onClose={() => setAssigning(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}

/** In-place "+ Assign Training" flow: pick a published course, optional due date. */
function AssignTrainingModal({
  emp,
  courses,
  onClose,
  onAssigned,
}: {
  emp: EmployeeDetail;
  courses: TrainingCourse[];
  onClose: () => void;
  onAssigned: (assignments: TrainingAssignment[]) => void;
}) {
  const [courseId, setCourseId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Only published catalog entries can be assigned (backend rejects the rest).
  const assignable = courses.filter((c) => c.active && (c.status ?? "Published") === "Published");

  async function assign() {
    if (!courseId || busy) return;
    setBusy(true);
    setError(null);
    try {
      onAssigned(await assignTraining(courseId, [emp.id], dueDate || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-card shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-bold text-ink">Assign training</p>
            <p className="text-xs text-ink-muted">{emp.preferredName || emp.name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div>
            <label className="field-label">Course</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="field-input"
            >
              <option value="">Select a course…</option>
              {assignable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Due date (optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="field-input"
            />
          </div>
          {assignable.length === 0 && (
            <p className="text-xs text-ink-muted">
              No published courses in the catalog yet — create one under{" "}
              <Link href="/admin/training" className="font-semibold text-brand-600 dark:text-brand-400">
                Training
              </Link>
              .
            </p>
          )}
        </div>
        <div className="border-t border-line px-5 py-4">
          {error && <p className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</p>}
          <button
            onClick={assign}
            disabled={!courseId || busy}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign course"}
          </button>
        </div>
      </div>
    </>
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


/** Per-row actions dropdown (chevron at the side): View when a file is
 *  stored, Remove for vault entries HR curates. */
function DocRowMenu({
  viewHref,
  onRemove,
  busy = false,
}: {
  viewHref?: string;
  onRemove?: () => void;
  busy?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!viewHref && !onRemove) return null;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Document actions"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg">
          {viewHref && (
            <a
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-canvas"
            >
              <Eye className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" /> View
            </a>
          )}
          {onRemove && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const ONBOARDING_FOLDER = "02_Onboarding_and_Tax";

/** "03_Certifications" → "03 · Certifications" (display only). */
function folderLabel(folder: string): string {
  const m = folder.match(/^(\d+)_(.+)$/);
  return m ? `${m[1]} · ${m[2].replace(/_/g, " ").replace(/\band\b/gi, "&")}` : folder;
}

/** The canonical folder order, plus any stray folders documents actually use. */
function employeeFolders(docs: { folder: string }[]): string[] {
  const stray = docs.map((d) => d.folder).filter((f) => !VAULT_FOLDERS.includes(f));
  return [...VAULT_FOLDERS, ...[...new Set(stray)]];
}

const VAULT_FOLDERS = [
  "01_Recruitment", "02_Onboarding_and_Tax", "03_Certifications",
  "04_Performance", "05_HR_Letters", "06_Offboarding",
];

/** Files a document into this employee's personal vault (metadata record —
 *  file binaries only exist for onboarding submissions today). */
function AddDocumentModal({
  employeeName,
  onClose,
  onAdded,
}: {
  employeeName: string;
  onClose: () => void;
  onAdded: (doc: { id: string; name: string; type: string; folder: string; uploaded: string; hasFile?: boolean }) => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("General");
  const [folder, setFolder] = React.useState(VAULT_FOLDERS[1]);
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !ACCEPTED.includes(f.type)) {
      setError("Supported files: PDF, PNG, JPG, DOCX.");
      return;
    }
    if (f && f.size > 8 * 1024 * 1024) {
      setError("File is too large — 8 MB max.");
      return;
    }
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.[a-z0-9]+$/i, ""));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let filePayload: { mimeType: string; dataBase64: string } | undefined;
      if (file) {
        const buf = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        const CHUNK = 0x8000;
        for (let i = 0; i < bytes.length; i += CHUNK) {
          binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
        }
        filePayload = { mimeType: file.type, dataBase64: btoa(binary) };
      }
      const doc = await uploadVaultDocument({
        name: name.trim(),
        type: type.trim() || "General",
        folder,
        access: "Employee",
        employeeName,
        ...filePayload,
      });
      onAdded(doc);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the document");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-300 focus:bg-card";
  const label = "mb-1 block text-xs font-semibold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-card-lg">
        <h2 className="text-base font-bold text-ink">Add document for {employeeName}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Goes into their personal vault (visible to them in My Profile → Documents). Attach the file itself to make it viewable, or save a metadata-only record.
        </p>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className={label} htmlFor="doc-file">File (PDF, PNG, JPG or DOCX — optional)</label>
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={pickFile}
              className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
            {file && (
              <p className="mt-1 text-[11px] text-ink-faint">
                {file.name} · {(file.size / 1024).toFixed(0)} KB — will be stored and viewable.
              </p>
            )}
          </div>
          <div>
            <label className={label} htmlFor="doc-name">Document name *</label>
            <input id="doc-name" required minLength={2} className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="doc-type">Type</label>
              <input id="doc-type" className={field} value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="doc-folder">Folder</label>
              <select id="doc-folder" className={field} value={folder} onChange={(e) => setFolder(e.target.value)}>
                {VAULT_FOLDERS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-canvas">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {busy ? "Adding…" : "Add document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
