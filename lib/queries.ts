import "server-only";
import { apiClient } from "@/lib/api/client";
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

const api = () => apiClient("admin");

/* ------------------------------- Employees ------------------------------- */

export async function getEmployees(): Promise<Employee[]> {
  const { data } = await api().GET("/api/v1/people/employees");
  return (data ?? []) as unknown as Employee[];
}

export async function getEmployeeByName(name: string): Promise<Employee | null> {
  const { data } = await api().GET("/api/v1/people/employees/by-name/{name}", {
    params: { path: { name } },
  });
  return (data ?? null) as unknown as Employee | null;
}

/* -------------------------------- Leave ---------------------------------- */

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const { data } = await api().GET("/api/v1/timeoff/leave-requests");
  return (data ?? []) as unknown as LeaveRequest[];
}

/* ----------------------------- Recruitment ------------------------------- */

export async function getRequisitions(): Promise<Requisition[]> {
  const { data } = await api().GET("/api/v1/recruitment/requisitions");
  return (data ?? []) as unknown as Requisition[];
}

export async function getCandidates(): Promise<Candidate[]> {
  const { data } = await api().GET("/api/v1/recruitment/candidates");
  return (data ?? []) as unknown as Candidate[];
}

/* ----------------------------- Performance ------------------------------- */

export async function getPerformanceReviews(): Promise<PerformanceReview[]> {
  const { data } = await api().GET("/api/v1/performance/reviews");
  return (data ?? []) as unknown as PerformanceReview[];
}

export async function getPips(): Promise<Pip[]> {
  const { data } = await api().GET("/api/v1/performance/pips");
  return (data ?? []) as unknown as Pip[];
}

/* ------------------------------- Training -------------------------------- */

export async function getTrainingCourses(): Promise<TrainingCourse[]> {
  const { data } = await api().GET("/api/v1/workplace/training-courses");
  return (data ?? []) as unknown as TrainingCourse[];
}

/* ------------------------------ Offboarding ------------------------------ */

export async function getOffboardingTasks(): Promise<OffboardingTask[]> {
  const { data } = await api().GET("/api/v1/offboarding/tasks");
  return (data ?? []) as unknown as OffboardingTask[];
}

/* ------------------------------- Benefits -------------------------------- */

export async function getBenefitsCarriers(): Promise<BenefitsCarrier[]> {
  const { data } = await api().GET("/api/v1/workplace/benefits-carriers");
  return (data ?? []) as unknown as BenefitsCarrier[];
}

/* -------------------------------- Agents --------------------------------- */

export async function getAgentRuns(): Promise<AgentRun[]> {
  const { data } = await api().GET("/api/v1/platform/agent-runs");
  return (data ?? []) as unknown as AgentRun[];
}

/* ------------------------------- Documents ------------------------------- */

export async function getVaultDocuments(): Promise<VaultDocument[]> {
  const { data } = await api().GET("/api/v1/workplace/documents");
  return (data ?? []) as unknown as VaultDocument[];
}

/* ------------------------------ Benchmarks ------------------------------- */

export async function getSalaryBenchmarks(): Promise<SalaryBenchmark[]> {
  const { data } = await api().GET("/api/v1/people/salary-benchmarks");
  return (data ?? []) as unknown as SalaryBenchmark[];
}

/* ------------------------------ Aggregates ------------------------------- */

export async function getOnboardingPipeline(): Promise<
  { id: string; name: string; title: string; startsInDays: number; progress: number }[]
> {
  const { data } = await apiClient("admin").GET("/api/v1/onboarding/pipeline");
  return (data ?? []) as { id: string; name: string; title: string; startsInDays: number; progress: number }[];
}

export async function getHeadcountByDept(): Promise<{ dept: string; count: number }[]> {
  const { data } = await api().GET("/api/v1/people/headcount");
  return (data ?? []) as unknown as { dept: string; count: number }[];
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
  const { data } = await api().GET("/api/v1/platform/settings");
  return (data ?? DEFAULT_SETTINGS) as unknown as CompanySettings;
}
