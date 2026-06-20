import "server-only";
import { prisma } from "@/lib/db";
import type { ProvinceCode } from "@/lib/compliance";
import type {
  Employee,
  LeaveRequest,
  Requisition,
  Candidate,
  PerformanceReview,
  Pip,
  TrainingCourse,
  OffboardingTask,
  BenefitsCarrier,
  AgentRun,
  VaultDocument,
  SalaryBenchmark,
} from "@/lib/data";
import {
  empStatusFromDb,
  leaveTypeFromDb,
  leaveStatusFromDb,
  employmentTypeFromDb,
  reqStatusFromDb,
  candidateStageFromDb,
  reviewStateFromDb,
  pipStateFromDb,
  offboardingOwnerFromDb,
  carrierStatusFromDb,
  carrierMethodFromDb,
  agentStatusFromDb,
  docAccessFromDb,
} from "@/lib/db-map";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------- Employees ------------------------------- */

export async function getEmployees(): Promise<Employee[]> {
  const rows = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    department: e.department,
    province: e.province as ProvinceCode,
    email: e.email,
    hireDate: iso(e.hireDate),
    birthDate: iso(e.birthDate),
    manager: e.manager ?? undefined,
    status: empStatusFromDb[e.status],
    salary: e.salary,
  }));
}

export async function getEmployeeByName(name: string): Promise<Employee | null> {
  const all = await getEmployees();
  return all.find((e) => e.name === name) ?? null;
}

/* -------------------------------- Leave ---------------------------------- */

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const rows = await prisma.leaveRequest.findMany({
    include: { employee: true },
    orderBy: { start: "asc" },
  });
  return rows.map((l) => ({
    id: l.id,
    employee: l.employee.name,
    type: leaveTypeFromDb[l.type],
    start: iso(l.start),
    end: iso(l.end),
    status: leaveStatusFromDb[l.status],
    province: l.employee.province as ProvinceCode,
    days: l.days,
  }));
}

/* ----------------------------- Recruitment ------------------------------- */

export async function getRequisitions(): Promise<Requisition[]> {
  const rows = await prisma.requisition.findMany({ orderBy: { openedDate: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    department: r.department,
    province: r.province as ProvinceCode,
    type: employmentTypeFromDb[r.type],
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    status: reqStatusFromDb[r.status],
    applicants: r.applicants,
    openedDate: iso(r.openedDate),
  }));
}

export async function getCandidates(): Promise<Candidate[]> {
  const rows = await prisma.candidate.findMany({ orderBy: { matchScore: "desc" } });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    stage: candidateStageFromDb[c.stage],
    matchScore: c.matchScore,
    appliedDate: iso(c.appliedDate),
    interviewDate: c.interviewDate ? iso(c.interviewDate) : undefined,
    strengths: c.strengths,
    gaps: c.gaps,
  }));
}

/* ----------------------------- Performance ------------------------------- */

export async function getPerformanceReviews(): Promise<PerformanceReview[]> {
  const rows = await prisma.performanceReview.findMany({
    include: { employee: true },
    orderBy: { due: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    employee: p.employee.name,
    cycle: p.cycle,
    state: reviewStateFromDb[p.state],
    score: p.score ?? undefined,
    due: iso(p.due),
  }));
}

export async function getPips(): Promise<Pip[]> {
  const rows = await prisma.pip.findMany({ orderBy: { startDate: "desc" } });
  return rows.map((p) => ({
    id: p.id,
    employee: p.employeeName,
    manager: p.manager,
    durationDays: p.durationDays,
    state: pipStateFromDb[p.state],
    signedByManager: p.signedByManager,
    signedByEmployee: p.signedByEmployee,
    startDate: iso(p.startDate),
  }));
}

/* ------------------------------- Training -------------------------------- */

export async function getTrainingCourses(): Promise<TrainingCourse[]> {
  const rows = await prisma.trainingCourse.findMany({ orderBy: { title: "asc" } });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    progress: t.progress,
    mandatory: t.mandatory,
    province: (t.province ?? undefined) as ProvinceCode | undefined,
    due: t.due ? iso(t.due) : undefined,
  }));
}

/* ------------------------------ Offboarding ------------------------------ */

export async function getOffboardingTasks(): Promise<OffboardingTask[]> {
  const rows = await prisma.offboardingTask.findMany();
  return rows.map((t) => ({
    id: t.id,
    label: t.label,
    owner: offboardingOwnerFromDb[t.owner],
    status: t.status === "COMPLETED" ? "Completed" : t.status === "IN_PROGRESS" ? "In-Progress" : "Pending",
    blocking: t.blocking,
  }));
}

/* ------------------------------- Benefits -------------------------------- */

export async function getBenefitsCarriers(): Promise<BenefitsCarrier[]> {
  const rows = await prisma.benefitsCarrier.findMany();
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    status: carrierStatusFromDb[b.status],
    enrolled: b.enrolled,
    method: carrierMethodFromDb[b.method],
    lastSync: b.lastSync,
  }));
}

/* -------------------------------- Agents --------------------------------- */

export async function getAgentRuns(): Promise<AgentRun[]> {
  const rows = await prisma.agentRun.findMany();
  return rows.map((a) => ({
    id: a.id,
    intent: a.intent,
    status: agentStatusFromDb[a.status],
    progress: a.progress,
    affected: a.affected,
    summary: a.summary,
    time: a.time,
  }));
}

/* ------------------------------- Documents ------------------------------- */

export async function getVaultDocuments(): Promise<VaultDocument[]> {
  const rows = await prisma.vaultDocument.findMany({ orderBy: { uploaded: "desc" } });
  return rows.map((d) => ({
    id: d.id,
    name: d.name,
    folder: d.folder,
    type: d.type,
    uploaded: iso(d.uploaded),
    access: docAccessFromDb[d.access],
  }));
}

/* ------------------------------ Benchmarks ------------------------------- */

export async function getSalaryBenchmarks(): Promise<SalaryBenchmark[]> {
  const rows = await prisma.salaryBenchmark.findMany();
  return rows.map((s) => ({ role: s.role, low: s.low, high: s.high, current: s.current }));
}

/* ------------------------------ Aggregates ------------------------------- */

export async function getOnboardingPipeline(): Promise<
  { id: string; name: string; title: string; startsInDays: number; progress: number }[]
> {
  const { apiClient } = await import("@/lib/api/client");
  const { data } = await apiClient("admin").GET("/api/v1/onboarding/pipeline");
  return (data ?? []) as { id: string; name: string; title: string; startsInDays: number; progress: number }[];
}

export async function getHeadcountByDept(): Promise<{ dept: string; count: number }[]> {
  const grouped = await prisma.employee.groupBy({
    by: ["department"],
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ dept: g.department, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------- Settings -------------------------------- */

export interface Integrations {
  google: boolean;
  m365: boolean;
  slack: boolean;
  sharepoint: boolean;
  esign: boolean;
  wagepoint: boolean;
  payworks: boolean;
  quickbooks: boolean;
}

export interface CompanySettings {
  companyName: string;
  provinces: string[];
  integrations: Integrations;
  recognitionPublic: boolean;
}

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "TestHR Inc.",
  provinces: ["ON", "BC", "QC", "SK"],
  integrations: {
    google: true,
    m365: true,
    slack: true,
    sharepoint: true,
    esign: false,
    wagepoint: false,
    payworks: false,
    quickbooks: true,
  },
  recognitionPublic: true,
};

export async function getSettings(): Promise<CompanySettings> {
  const row = await prisma.companySettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    companyName: row.companyName,
    provinces: row.provinces,
    integrations: row.integrations as unknown as Integrations,
    recognitionPublic: row.recognitionPublic,
  };
}
