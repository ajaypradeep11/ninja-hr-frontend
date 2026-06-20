"use server";

import { apiClient } from "@/lib/api/client";
import type {
  LeaveRequest,
  Candidate,
  Pip,
  OffboardingTask,
  PerformanceReview,
  AgentRun,
} from "@/lib/data";
import type { CompanySettings } from "@/lib/queries";
import type { ProvinceCode } from "@/lib/compliance";

const api = () => apiClient("admin");

/* ------------------------------- Leave ----------------------------------- */

export async function setLeaveStatus(
  id: string,
  status: "Approved" | "Denied",
): Promise<LeaveRequest[]> {
  const { data } = await api().PATCH("/api/v1/timeoff/leave-requests/{id}/status", {
    params: { path: { id } },
    body: { status } as never,
  });
  return (data ?? []) as unknown as LeaveRequest[];
}

/* --------------------------- Recruitment / ATS --------------------------- */

export async function setCandidateStage(
  id: string,
  stage: Candidate["stage"],
): Promise<Candidate[]> {
  const { data } = await api().PATCH("/api/v1/recruitment/candidates/{id}/stage", {
    params: { path: { id } },
    body: { stage } as never,
  });
  return (data ?? []) as unknown as Candidate[];
}

/* ----------------------------- Performance ------------------------------- */

export interface NewPipInput {
  employee: string;
  manager: string;
  durationDays: number;
}

export async function issuePip(input: NewPipInput): Promise<Pip[]> {
  const { data } = await api().POST("/api/v1/performance/pips", {
    body: { employee: input.employee, manager: input.manager, durationDays: input.durationDays },
  });
  return (data ?? []) as unknown as Pip[];
}

/* ----------------------------- Recruitment ------------------------------- */

export interface NewRequisitionInput {
  title: string;
  department: string;
  province: ProvinceCode;
  salaryMin: number;
  salaryMax: number;
}

export async function publishRequisition(input: NewRequisitionInput): Promise<void> {
  await api().POST("/api/v1/recruitment/requisitions", {
    body: {
      title: input.title,
      department: input.department,
      province: input.province,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
    },
  });
}

/* ------------------------ Employee self-service leave -------------------- */

export interface NewLeaveInput {
  employeeName: string;
  type: LeaveRequest["type"];
  start: string;
  end: string;
  days: number;
}

export async function createLeaveRequest(input: NewLeaveInput): Promise<LeaveRequest[]> {
  const { data } = await api().POST("/api/v1/timeoff/leave-requests", {
    body: {
      employeeName: input.employeeName,
      type: input.type,
      start: input.start,
      end: input.end,
      days: input.days,
    },
  });
  return (data ?? []) as unknown as LeaveRequest[];
}

/* ------------------------------ Offboarding ------------------------------ */

export async function setOffboardingTaskStatus(
  id: string,
  status: OffboardingTask["status"],
): Promise<OffboardingTask[]> {
  const { data } = await api().PATCH("/api/v1/offboarding/tasks/{id}/status", {
    params: { path: { id } },
    body: { status } as never,
  });
  return (data ?? []) as unknown as OffboardingTask[];
}

/** Finalize termination — sets the employee's status to TERMINATED (kill switch). */
export async function finalizeTermination(employeeName: string): Promise<void> {
  await api().POST("/api/v1/offboarding/terminate", {
    body: { employeeName },
  });
}

/* ------------------------------ Performance ------------------------------ */

export async function advanceReviewState(id: string): Promise<PerformanceReview[]> {
  const { data } = await api().POST("/api/v1/performance/reviews/{id}/advance", {
    params: { path: { id } },
  });
  return (data ?? []) as unknown as PerformanceReview[];
}

/* -------------------------------- Agents --------------------------------- */

export async function createAgentRun(intent: string): Promise<AgentRun[]> {
  const { data } = await api().POST("/api/v1/platform/agent-runs", {
    body: { intent },
  });
  return (data ?? []) as unknown as AgentRun[];
}

export async function setAgentRunStatus(
  id: string,
  status: AgentRun["status"],
): Promise<AgentRun[]> {
  const { data } = await api().PATCH("/api/v1/platform/agent-runs/{id}/status", {
    params: { path: { id } },
    body: { status } as never,
  });
  return (data ?? []) as unknown as AgentRun[];
}

/* -------------------------------- Settings ------------------------------- */

export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  const { data } = await api().PUT("/api/v1/platform/settings", {
    body: settings as never,
  });
  return (data ?? settings) as unknown as CompanySettings;
}
