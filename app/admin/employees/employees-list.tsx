"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Download,
  LogOut,
  MoreVertical,
  Pencil,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import { Avatar, Badge, Card, PageHeader, Stat } from "@/components/ui";
import type { Employee } from "@/lib/data";
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
  const [query, setQuery] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [location, setLocation] = React.useState("All");

  const departments = ["All", ...Array.from(new Set(employees.map((e) => e.department))).sort()];
  // Data-driven filter options so they never list values that aren't present.
  const statuses = ["All", ...Array.from(new Set(employees.map((e) => e.status)))];
  const locationCodes = Array.from(new Set(employees.map((e) => e.province)));
  const locations: (ProvinceCode | "All")[] = [
    "All",
    ...PROVINCES.filter((p) => locationCodes.includes(p.code)).map((p) => p.code),
  ];
  const active = employees.filter((e) => e.status === "Active").length;

  const filtered = employees.filter((e) => {
    if (dept !== "All" && e.department !== dept) return false;
    if (status !== "All" && e.status !== status) return false;
    if (location !== "All" && e.province !== location) return false;
    if (query && !`${e.name} ${e.title} ${e.email}`.toLowerCase().includes(query.toLowerCase()))
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
              placeholder="Search by name, title or email…"
              className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:bg-white"
            />
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

          <button
            type="button"
            onClick={() => downloadCsv(`employees-${filtered.length}.csv`, filtered)}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold text-ink-soft transition hover:bg-canvas disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export to CSV
          </button>
        </div>
      </Card>

      <Card className="card-pad">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-muted">No employees match your filters.</p>
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
                  <tr key={e.id} className="group">
                    <td className="py-2.5">
                      <Link href={`/admin/employees/${e.id}`} className="flex items-center gap-2.5">
                        <Avatar name={e.name} size={30} />
                        <span>
                          <span className="block font-semibold text-ink group-hover:text-brand-600">
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
                    <td className="py-2.5 pl-2 text-right">
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
    <label className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white pl-3 pr-1 text-sm">
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
          className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          <Link
            href="/admin/recruitment"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-canvas"
          >
            <UserPlus className="mt-0.5 h-4 w-4 text-brand-500" />
            <span>
              <span className="block text-sm font-semibold text-ink">Invite candidate</span>
              <span className="block text-xs text-ink-muted">Open a requisition and start hiring</span>
            </span>
          </Link>
          <Link
            href="/admin/onboarding"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-canvas"
          >
            <UserRound className="mt-0.5 h-4 w-4 text-brand-500" />
            <span>
              <span className="block text-sm font-semibold text-ink">Begin onboarding</span>
              <span className="block text-xs text-ink-muted">Start a new hire&apos;s paperwork</span>
            </span>
          </Link>
        </div>
      )}
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
          className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
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
          <Link
            href={`/admin/leave?q=${name}`}
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Manage Leave
          </Link>
          <div className="my-1 border-t border-line" />
          {canOffboard ? (
            <Link
              href={`/admin/offboarding?employee=${name}`}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
