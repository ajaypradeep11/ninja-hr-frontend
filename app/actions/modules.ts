"use server";

import { prisma } from "@/lib/db";
import {
  getLeaveRequests,
  getCandidates,
  getPips,
  getOffboardingTasks,
  getPerformanceReviews,
  getAgentRuns,
  getSettings,
  type CompanySettings,
} from "@/lib/queries";
import {
  leaveStatusToDb,
  candidateStageToDb,
  pipStateToDb,
  leaveTypeToDb,
  taskStatusToDb,
  reviewStateToDb,
  agentStatusToDb,
} from "@/lib/db-map";
import type {
  LeaveRequest,
  Candidate,
  Pip,
  OffboardingTask,
  PerformanceReview,
  AgentRun,
} from "@/lib/data";
import type { ProvinceCode } from "@/lib/compliance";

/* ------------------------------- Leave ----------------------------------- */

export async function setLeaveStatus(
  id: string,
  status: "Approved" | "Denied",
): Promise<LeaveRequest[]> {
  await prisma.leaveRequest.update({
    where: { id },
    data: { status: leaveStatusToDb[status] as never },
  });
  return getLeaveRequests();
}

/* --------------------------- Recruitment / ATS --------------------------- */

export async function setCandidateStage(
  id: string,
  stage: Candidate["stage"],
): Promise<Candidate[]> {
  await prisma.candidate.update({
    where: { id },
    data: { stage: candidateStageToDb[stage] as never },
  });
  return getCandidates();
}

/* ----------------------------- Performance ------------------------------- */

export interface NewPipInput {
  employee: string;
  manager: string;
  durationDays: number;
}

export async function issuePip(input: NewPipInput): Promise<Pip[]> {
  await prisma.pip.create({
    data: {
      employeeName: input.employee,
      manager: input.manager,
      durationDays: input.durationDays,
      state: pipStateToDb["Active"] as never,
      signedByManager: true,
      signedByEmployee: true,
      startDate: new Date(),
    },
  });
  return getPips();
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
  await prisma.requisition.create({
    data: {
      title: input.title,
      department: input.department,
      province: input.province as never,
      type: "FULL_TIME",
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      status: "PUBLISHED",
      applicants: 0,
      openedDate: new Date(),
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
  const emp = await prisma.employee.findFirst({ where: { name: input.employeeName } });
  if (emp) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        type: leaveTypeToDb[input.type] as never,
        start: new Date(input.start),
        end: new Date(input.end),
        status: "PENDING",
        days: input.days,
      },
    });
  }
  return getLeaveRequests();
}

/* ------------------------------ Offboarding ------------------------------ */

export async function setOffboardingTaskStatus(
  id: string,
  status: OffboardingTask["status"],
): Promise<OffboardingTask[]> {
  await prisma.offboardingTask.update({
    where: { id },
    data: { status: taskStatusToDb[status] as never },
  });
  return getOffboardingTasks();
}

/** Finalize termination — sets the employee's status to TERMINATED (kill switch). */
export async function finalizeTermination(employeeName: string): Promise<void> {
  const emp = await prisma.employee.findFirst({ where: { name: employeeName } });
  if (emp) {
    await prisma.employee.update({ where: { id: emp.id }, data: { status: "TERMINATED" } });
  }
}

/* ------------------------------ Performance ------------------------------ */

const REVIEW_FLOW: PerformanceReview["state"][] = [
  "Draft",
  "Self-Evaluation",
  "Manager-Evaluation",
  "Calibrated",
  "Completed",
];

export async function advanceReviewState(id: string): Promise<PerformanceReview[]> {
  const row = await prisma.performanceReview.findUnique({ where: { id } });
  if (row) {
    const current = reviewStateToDb;
    const labelFromDb = (Object.keys(current) as PerformanceReview["state"][]).find(
      (k) => current[k] === row.state,
    );
    const idx = labelFromDb ? REVIEW_FLOW.indexOf(labelFromDb) : 0;
    const next = REVIEW_FLOW[Math.min(REVIEW_FLOW.length - 1, idx + 1)];
    await prisma.performanceReview.update({
      where: { id },
      data: { state: reviewStateToDb[next] as never },
    });
  }
  return getPerformanceReviews();
}

/* -------------------------------- Agents --------------------------------- */

export async function createAgentRun(intent: string): Promise<AgentRun[]> {
  await prisma.agentRun.create({
    data: {
      intent,
      status: "RUNNING",
      progress: 15,
      affected: 0,
      summary: `Agent started: ${intent}`,
      time: "just now",
    },
  });
  return getAgentRuns();
}

export async function setAgentRunStatus(
  id: string,
  status: AgentRun["status"],
): Promise<AgentRun[]> {
  await prisma.agentRun.update({
    where: { id },
    data: {
      status: agentStatusToDb[status] as never,
      progress: status === "Completed" ? 100 : undefined,
    },
  });
  return getAgentRuns();
}

/* -------------------------------- Settings ------------------------------- */

export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: {
      companyName: settings.companyName,
      provinces: settings.provinces,
      integrations: settings.integrations as never,
      recognitionPublic: settings.recognitionPublic,
    },
    create: {
      id: "default",
      companyName: settings.companyName,
      provinces: settings.provinces,
      integrations: settings.integrations as never,
      recognitionPublic: settings.recognitionPublic,
    },
  });
  return getSettings();
}
