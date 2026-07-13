"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronDown,
  Download,
  FilterX,
  LogOut,
  MoreVertical,
  Pencil,
  Rocket,
  Search,
  UserPlus,
  UserRound,
  X,
  ClipboardPen,
  Loader2,
} from "lucide-react";
import { Avatar, Badge, Card, PageHeader, Stat } from "@/components/ui";
import type { Employee } from "@/lib/data";
import { createEmployee } from "@/app/actions/employees";
import {
  getDepartmentOptions,
  getJobTitleOptions,
  saveDepartmentOptions,
  saveJobTitleOptions,
} from "@/app/actions/onboarding";
import { formatDate } from "@/lib/utils";
import { PROVINCES, provinceName, type ProvinceCode } from "@/lib/compliance";

const statusTone: Record<string, "green" | "sky" | "violet" | "amber" | "red" | "gray"> = {
  Active: "green",
  "Pre-Hire": "sky",
  "On Statutory Leave": "violet",
  Offboarding: "amber",
  Terminated: "red",
};

/** Close a popover on outside-click or Escape. */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function csvCell(value: string | number | undefined | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: Employee[]) {
  const header = ["Employee #", "Name", "Title", "Department", "Location", "Status", "Email", "Hire date"];
  const lines = rows.map((e) =>
    [
      e.employeeNumber ?? "",
      e.name,
      e.title,
      e.department,
      provinceName(e.province),
      e.status,
      e.email,
      e.hireDate,
    ]
      .map(csvCell)
      .join(","),
  );
  const content = [header.join(","), ...lines].join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function EmployeesList({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [location, setLocation] = React.useState("All");

  const hasActiveFilters = query !== "" || dept !== "All" || status !== "All" || location !== "All";

  function clearFilters() {
    setQuery("");
    setDept("All");
    setStatus("All");
    setLocation("All");
  }

  const departments = ["All", ...Array.from(new Set(employees.map((e) => e.department))).sort()];
  // Data-driven filter options so they never list values that aren't present.
  const statuses = ["All", ...Array.from(new Set(employees.map((e) => e.status)))];
  const locationCodes = Array.from(new Set(employees.map((e) => e.province)));
  const locations: (ProvinceCode | "All")[] = [
    "All",
    ...PROVINCES.filter((p) => locationCodes.includes(p.code)).map((p) => p.code),
  ];
  const active = employees.filter((e) => e.status === "Active").length;

  const q = query.trim().toLowerCase();
  const filtered = employees.filter((e) => {
    if (dept !== "All" && e.department !== dept) return false;
    if (status !== "All" && e.status !== status) return false;
    if (location !== "All" && e.province !== location) return false;
    if (q && !`${e.name} ${e.title} ${e.email} ${e.employeeNumber ?? ""}`.toLowerCase().includes(q))
      return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Your workforce directory and complete HR records."
        action={<AddEmployeeButton />}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total employees" value={employees.length} hint="All statuses" />
        <Stat label="Active" value={active} tone="green" hint="Currently employed" />
        <Stat label="Departments" value={departments.length - 1} tone="sky" hint="Across the org" />
        <Stat
          label="On leave"
          value={employees.filter((e) => e.status === "On Statutory Leave").length}
          tone="violet"
          hint="Statutory leave"
        />
      </div>

      <Card className="card-pad mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title, email or ID…"
              className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-9 text-sm outline-none focus:border-brand-300 focus:bg-card"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition hover:bg-canvas hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <FilterSelect label="Department" value={dept} onChange={setDept}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === "All" ? "All departments" : d}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Status" value={status} onChange={setStatus}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All statuses" : s}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Location" value={location} onChange={setLocation}>
            {locations.map((code) => (
              <option key={code} value={code}>
                {code === "All" ? "All locations" : provinceName(code)}
              </option>
            ))}
          </FilterSelect>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-muted transition hover:bg-canvas hover:text-ink"
            >
              <FilterX className="h-4 w-4" /> Clear filters
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadCsv(`employees-${filtered.length}.csv`, filtered)}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 text-sm font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export to CSV
          </button>
        </div>
      </Card>

      <Card className="card-pad">
        {filtered.length === 0 ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-ink-muted">No employees match your filters.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Hired</th>
                  <th className="pb-2 text-right">Status</th>
                  <th className="pb-2 pl-2 text-right sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => router.push(`/admin/employees/${e.id}`)}
                    className="group cursor-pointer"
                  >
                    <td className="py-2.5">
                      <Link href={`/admin/employees/${e.id}`} className="flex items-center gap-2.5">
                        <Avatar name={e.name} size={30} />
                        <span>
                          <span className="block font-semibold text-ink group-hover:text-brand-600 dark:group-hover:text-brand-300">
                            {e.name}
                          </span>
                          <span className="block text-xs text-ink-muted">{e.title}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 font-mono text-xs text-ink-muted">
                      {e.employeeNumber ?? "—"}
                    </td>
                    <td className="py-2.5 text-ink-muted">{e.department}</td>
                    <td className="py-2.5 text-ink-muted">{provinceName(e.province)}</td>
                    <td className="py-2.5 text-ink-muted">{formatDate(e.hireDate)}</td>
                    <td className="py-2.5 text-right">
                      <Badge tone={statusTone[e.status]}>{e.status}</Badge>
                    </td>
                    {/* Menu clicks must not bubble into the row's navigation. */}
                    <td className="py-2.5 pl-2 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <RowMenu employee={e} />
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

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-card pl-3 pr-1 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full bg-transparent pr-1 text-sm font-semibold text-ink-soft outline-none"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        {children}
      </select>
    </label>
  );
}

/** Prominent directory CTA — routes into the two ways people join the org. */
function AddEmployeeButton() {
  const [open, setOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const ref = useDismiss(open, () => setOpen(false));

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
      >
        <UserPlus className="h-4 w-4" /> Add Employee
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg"
        >
          <Link
            href="/admin/recruitment/ats"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-canvas"
          >
            <Bot className="mt-0.5 h-4 w-4 text-brand-500 dark:text-brand-400" />
            <span>
              <span className="block text-sm font-semibold text-ink">Invite candidate</span>
              <span className="block text-xs text-ink-muted">Hire with the AI Assistant</span>
            </span>
          </Link>
          <Link
            href="/admin/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-canvas"
          >
            <UserRound className="mt-0.5 h-4 w-4 text-brand-500 dark:text-brand-400" />
            <span>
              <span className="block text-sm font-semibold text-ink">Begin onboarding</span>
              <span className="block text-xs text-ink-muted">Start a new hire&apos;s paperwork</span>
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setManualOpen(true);
            }}
            className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-canvas"
          >
            <ClipboardPen className="mt-0.5 h-4 w-4 text-brand-500 dark:text-brand-400" />
            <span>
              <span className="block text-sm font-semibold text-ink">Add manually</span>
              <span className="block text-xs text-ink-muted">
                Hired or pre-boarded outside the system
              </span>
            </span>
          </button>
        </div>
      )}
      {manualOpen && <ManualAddModal onClose={() => setManualOpen(false)} />}
    </div>
  );
}

const MANUAL_PROVINCES = [
  ["ON", "Ontario"], ["BC", "British Columbia"], ["AB", "Alberta"], ["QC", "Quebec"],
  ["SK", "Saskatchewan"], ["MB", "Manitoba"], ["NS", "Nova Scotia"], ["NB", "New Brunswick"],
] as const;

/** Manual profile creation — for people hired outside the recruiting/onboarding flows.
 *  Creates a full ACTIVE directory profile (backend assigns the EMP number + login). */
function ManualAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Admin-managed option lists (Settings → Option lists); adding here persists company-wide.
  const [deptOptions, setDeptOptions] = React.useState<string[]>([]);
  const [titleOptions, setTitleOptions] = React.useState<string[]>([]);
  React.useEffect(() => {
    void getDepartmentOptions().then(setDeptOptions).catch(() => {});
    void getJobTitleOptions().then(setTitleOptions).catch(() => {});
  }, []);
  const [f, setF] = React.useState({
    name: "", title: "", department: "", province: "ON", email: "",
    hireDate: "", birthDate: "", salary: "", employmentType: "", phone: "", preferredName: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createEmployee({
      name: f.name.trim(),
      title: f.title.trim(),
      department: f.department.trim(),
      province: f.province,
      email: f.email.trim(),
      hireDate: f.hireDate,
      ...(f.birthDate ? { birthDate: f.birthDate } : {}),
      ...(f.salary ? { salary: Number(f.salary) } : {}),
      ...(f.employmentType ? { employmentType: f.employmentType } : {}),
      ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
      ...(f.preferredName.trim() ? { preferredName: f.preferredName.trim() } : {}),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  const field = "h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm outline-none focus:border-brand-300 focus:bg-card";
  const label = "mb-1 block text-xs font-semibold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-card-lg">
        <h2 className="text-base font-bold text-ink">Add employee manually</h2>
        <p className="mt-1 text-xs text-ink-muted">
          For people hired or pre-boarded outside the system. Creates an Active profile with the
          next employee number; they can sign in with this email right away.
        </p>
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="ma-name">Full legal name *</label>
              <input id="ma-name" required minLength={2} className={field} value={f.name} onChange={set("name")} />
            </div>
            <div>
              <label className={label} htmlFor="ma-preferred">Preferred name</label>
              <input id="ma-preferred" className={field} value={f.preferredName} onChange={set("preferredName")} />
            </div>
            <OptionSelect
              id="ma-title"
              label="Job title *"
              value={f.title}
              options={titleOptions}
              fieldClass={field}
              labelClass={label}
              onChange={(v) => setF((prev) => ({ ...prev, title: v }))}
              onAdd={async (v) => setTitleOptions(await saveJobTitleOptions([...titleOptions, v]))}
            />
            <OptionSelect
              id="ma-dept"
              label="Department *"
              value={f.department}
              options={deptOptions}
              fieldClass={field}
              labelClass={label}
              onChange={(v) => setF((prev) => ({ ...prev, department: v }))}
              onAdd={async (v) => setDeptOptions(await saveDepartmentOptions([...deptOptions, v]))}
            />
            <div>
              <label className={label} htmlFor="ma-email">Work email *</label>
              <input id="ma-email" required type="email" className={field} value={f.email} onChange={set("email")} />
            </div>
            <div>
              <label className={label} htmlFor="ma-phone">Phone</label>
              <input id="ma-phone" className={field} value={f.phone} onChange={set("phone")} />
            </div>
            <div>
              <label className={label} htmlFor="ma-province">Province *</label>
              <select id="ma-province" className={field} value={f.province} onChange={set("province")}>
                {MANUAL_PROVINCES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ma-type">Employment type</label>
              <select id="ma-type" className={field} value={f.employmentType} onChange={set("employmentType")}>
                <option value="">Not set</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contractor</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ma-hire">Start date *</label>
              <input id="ma-hire" required type="date" className={field} value={f.hireDate} onChange={set("hireDate")} />
            </div>
            <div>
              <label className={label} htmlFor="ma-birth">Date of birth</label>
              <input id="ma-birth" type="date" className={field} value={f.birthDate} onChange={set("birthDate")} />
            </div>
            <div>
              <label className={label} htmlFor="ma-salary">Annual salary (CAD)</label>
              <input id="ma-salary" type="number" min={0} step={1000} className={field} value={f.salary} onChange={set("salary")} />
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Creating…" : "Create profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Per-row quick administrative actions. */
function RowMenu({ employee }: { employee: Employee }) {
  const [open, setOpen] = React.useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const name = encodeURIComponent(employee.name);
  const canOffboard = employee.status !== "Terminated" && employee.status !== "Offboarding";

  const itemClass = "flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-canvas";

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={`Actions for ${employee.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-canvas hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg"
        >
          <Link
            href={`/admin/employees/${employee.id}`}
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <UserRound className="h-3.5 w-3.5" /> View Profile
          </Link>
          <Link
            href={`/admin/employees/${employee.id}?edit=1`}
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Details
          </Link>
          {employee.status === "Pre-Hire" && (
            <Link
              href="/admin/onboarding/preboard"
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <Rocket className="h-3.5 w-3.5" /> Begin Pre-boarding
            </Link>
          )}
          <div className="my-1 border-t border-line" />
          {canOffboard ? (
            <Link
              href={`/admin/offboarding?employee=${name}`}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20"
              onClick={() => setOpen(false)}
            >
              <LogOut className="h-3.5 w-3.5" /> Initiate Offboarding
            </Link>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2 text-sm text-ink-faint">
              <LogOut className="h-3.5 w-3.5" /> Initiate Offboarding
            </span>
          )}
        </div>
      )}
    </div>
  );
}


/** Select fed by an admin-managed option list, with an inline "+ Add new" that
 *  persists the new option company-wide (Settings → Option lists manages them). */
function OptionSelect({
  id,
  label,
  value,
  options,
  onChange,
  onAdd,
  fieldClass,
  labelClass,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onAdd: (v: string) => Promise<void>;
  fieldClass: string;
  labelClass: string;
}) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function commit() {
    const v = draft.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onAdd(v);
      onChange(v);
      setAdding(false);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      {adding ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            className={fieldClass}
            placeholder="New option…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commit();
              }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit()}
            className="shrink-0 rounded-xl bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? "…" : "Add"}
          </button>
        </div>
      ) : (
        <select
          id={id}
          required
          className={fieldClass}
          value={value}
          onChange={(e) => {
            if (e.target.value === "__add__") setAdding(true);
            else onChange(e.target.value);
          }}
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          {value && !options.includes(value) && <option value={value}>{value}</option>}
          <option value="__add__">+ Add new…</option>
        </select>
      )}
    </div>
  );
}
