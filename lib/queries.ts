import "server-only";
import { authedApi } from "@/lib/api/client";
import type {
  Employee,
  LeaveRequest,
  Requisition,
  Candidate,
  PerformanceReview,
  Pip,
  TrainingCourse,
  OffboardingTask,
  AgentRun,
  VaultDocument,
  SalaryBenchmark,
} from "@/lib/data";

const api = () => authedApi("admin");

/**
 * Unwraps an openapi-fetch result, throwing on HTTP errors instead of
 * silently coercing them to empty data — a backend 500/401 must surface as an
 * error state, not render as "the company has zero employees".
 */
async function unwrap<T>(
  promise: Promise<{ data?: unknown; error?: unknown; response: Response }>,
  fallback?: T,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    throw new Error(`NinjaHR API request failed: ${response.status} ${response.statusText} (${response.url})`);
  }
  return (data ?? fallback) as T;
}

/* ------------------------------- Employees ------------------------------- */

export async function getEmployees(): Promise<Employee[]> {
  return unwrap<Employee[]>((await api()).GET("/api/v1/people/employees"), []);
}

export async function getEmployeeByName(name: string): Promise<Employee | null> {
  return unwrap<Employee | null>(
    (await api()).GET("/api/v1/people/employees/by-name/{name}", { params: { path: { name } } }),
    null,
  );
}

/* -------------------------------- Leave ---------------------------------- */

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return unwrap<LeaveRequest[]>((await api()).GET("/api/v1/timeoff/leave-requests"), []);
}

/* ----------------------------- Recruitment ------------------------------- */

export async function getRequisitions(includeArchived = false): Promise<Requisition[]> {
  return unwrap<Requisition[]>(
    (await api()).GET("/api/v1/recruitment/requisitions", {
      params: { query: { includeArchived: includeArchived ? "true" : "false" } },
    }),
    [],
  );
}

export async function getCandidates(): Promise<Candidate[]> {
  return unwrap<Candidate[]>((await api()).GET("/api/v1/recruitment/candidates"), []);
}

/* ----------------------------- Performance ------------------------------- */

export async function getPerformanceReviews(): Promise<PerformanceReview[]> {
  return unwrap<PerformanceReview[]>((await api()).GET("/api/v1/performance/reviews"), []);
}

export async function getPips(): Promise<Pip[]> {
  return unwrap<Pip[]>((await api()).GET("/api/v1/performance/pips"), []);
}

/* ------------------------------- Training -------------------------------- */

export async function getTrainingCourses(): Promise<TrainingCourse[]> {
  return unwrap<TrainingCourse[]>((await api()).GET("/api/v1/workplace/training-courses"), []);
}

/* ------------------------------ Offboarding ------------------------------ */

export async function getOffboardingTasks(): Promise<OffboardingTask[]> {
  return unwrap<OffboardingTask[]>((await api()).GET("/api/v1/offboarding/tasks"), []);
}

/* -------------------------------- Agents --------------------------------- */

export async function getAgentRuns(): Promise<AgentRun[]> {
  return unwrap<AgentRun[]>((await api()).GET("/api/v1/platform/agent-runs"), []);
}

/* ------------------------------- Documents ------------------------------- */

export async function getVaultDocuments(): Promise<VaultDocument[]> {
  return unwrap<VaultDocument[]>((await api()).GET("/api/v1/workplace/documents"), []);
}

/* ------------------------------ Benchmarks ------------------------------- */

export async function getSalaryBenchmarks(): Promise<SalaryBenchmark[]> {
  return unwrap<SalaryBenchmark[]>((await api()).GET("/api/v1/people/salary-benchmarks"), []);
}

/* ------------------------------ Aggregates ------------------------------- */

export async function getOnboardingPipeline(): Promise<
  { id: string; name: string; title: string; startsInDays: number; progress: number }[]
> {
  return unwrap((await api()).GET("/api/v1/onboarding/pipeline"), []);
}

export async function getHeadcountByDept(): Promise<{ dept: string; count: number }[]> {
  return unwrap((await api()).GET("/api/v1/people/headcount"), []);
}

/* ------------------------------- Settings -------------------------------- */

export interface Integrations {
  google: boolean;
  m365: boolean;
  slack: boolean;
  sharepoint: boolean;
  esign: boolean;
  quickbooks: boolean;
}

export interface CompanySettings {
  companyName: string;
  provinces: string[];
  integrations: Integrations;
  recognitionPublic: boolean;
}

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "NinjaHR",
  provinces: ["ON", "BC", "QC", "SK"],
  integrations: {
    google: true,
    m365: true,
    slack: true,
    sharepoint: true,
    esign: false,
    quickbooks: true,
  },
  recognitionPublic: true,
};

export async function getSettings(): Promise<CompanySettings> {
  return unwrap<CompanySettings>((await api()).GET("/api/v1/platform/settings"), DEFAULT_SETTINGS);
}
