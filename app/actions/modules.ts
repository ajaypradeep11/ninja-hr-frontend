"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE, getActor } from "@/lib/actor";
import { computeLeaveBalances } from "@/lib/leave-balances";
import type {
  LeaveRequest,

  Pip,
  OffboardingTask,
  PerformanceReview,
  AgentRun,
} from "@/lib/data";
import type { CompanySettings } from "@/lib/queries";

const api = () => authedApi("admin");

/**
 * Untyped escape hatch for endpoints that exist backend-side but are not yet
 * in the generated OpenAPI types (lib/api/generated/openapi.d.ts). Regenerate
 * with `npm run api:generate` (requires the backend running) and migrate the
 * calls below back to the typed client.
 */
async function rawApi() {
  return (await api()) as unknown as {
    GET: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
    POST: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
    PATCH: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  };
}

/** Actor-aware client — required wherever the backend routes by role/department. */
async function actorApi() {
  const store = await cookies();
  return authedApi("admin", store.get(ACTOR_COOKIE)?.value);
}

/**
 * Unwraps an openapi-fetch mutation result. Throws on HTTP errors — coercing
 * a failed mutation to `[]` would wipe the caller's entire client-side list.
 */
async function unwrap<T>(
  promise: Promise<{ data?: unknown; error?: unknown; response: Response }>,
  fallback?: T,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    const detail =
      error && typeof error === "object" && "message" in error
        ? `${response.status} ${String((error as { message: unknown }).message)}`
        : `${response.status} ${response.statusText}`;
    throw new Error(`Request failed: ${detail}`);
  }
  return (data ?? fallback) as T;
}

/* ------------------------------- Leave ----------------------------------- */

/** Actor-scoped list: HR = all, manager = own department, employee = own. */
export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  const client = await actorApi();
  return unwrap<LeaveRequest[]>(client.GET("/api/v1/timeoff/leave-requests"), []);
}

/** The actor's live balance cards — same derivation the Leave page uses. */
export async function getMyLeaveBalances() {
  const [actor, all] = await Promise.all([getActor(), listLeaveRequests()]);
  return computeLeaveBalances(all, actor.name);
}

export async function setLeaveStatus(
  id: string,
  status: "Approved" | "Denied",
  /** Optional reviewer note. Sent with the decision; the backend's whitelist
   *  validation strips it until a LeaveRequest.note column exists, so this is
   *  forward-compatible rather than persisted today. */
  note?: string,
): Promise<LeaveRequest[]> {
  const client = await actorApi();
  return unwrap<LeaveRequest[]>(
    client.PATCH("/api/v1/timeoff/leave-requests/{id}/status", {
      params: { path: { id } },
      body: { status, ...(note?.trim() ? { note: note.trim() } : {}) } as never,
    }),
  );
}

/** Cancel/withdraw a request — owner while Pending, or HR any time. */
export async function cancelLeaveRequest(id: string): Promise<LeaveRequest[]> {
  const client = await actorApi();
  return unwrap<LeaveRequest[]>(
    client.DELETE("/api/v1/timeoff/leave-requests/{id}", { params: { path: { id } } }),
  );
}

/** Edit a record — HR overrides anything; owners edit their own PENDING requests. */
export async function updateLeaveRecord(
  id: string,
  patch: {
    type?: LeaveRequest["type"];
    start?: string;
    end?: string;
    days?: number;
    hours?: number | null;
    status?: "Pending" | "Approved" | "Denied";
  },
): Promise<LeaveRequest[]> {
  const client = await actorApi();
  return unwrap<LeaveRequest[]>(
    client.PATCH("/api/v1/timeoff/leave-requests/{id}", {
      params: { path: { id } },
      body: patch as never,
    }),
  );
}

/* ----------------------------- Performance ------------------------------- */

export interface NewPipInput {
  employee: string;
  manager: string;
  durationDays: number;
}

export async function issuePip(input: NewPipInput): Promise<Pip[]> {
  if (!input.employee.trim()) throw new Error("PIP employee name is required");
  return unwrap<Pip[]>(
    (await api()).POST("/api/v1/performance/pips", {
      body: { employee: input.employee, manager: input.manager, durationDays: input.durationDays },
    }),
  );
}

/* ------------------------ Employee self-service leave -------------------- */

export interface NewLeaveInput {
  employeeName: string;
  type: LeaveRequest["type"];
  start: string;
  end: string;
  days: number;
  /** Partial-day request: hours on `start` (1–7). Omit for full day(s). */
  hours?: number;
}

export async function createLeaveRequest(input: NewLeaveInput): Promise<LeaveRequest[]> {
  const client = await actorApi();
  return unwrap<LeaveRequest[]>(
    client.POST("/api/v1/timeoff/leave-requests", {
      body: {
        employeeName: input.employeeName,
        type: input.type,
        start: input.start,
        end: input.end,
        days: input.days,
        ...(input.hours ? { hours: input.hours } : {}),
      } as never,
    }),
  );
}

/* ------------------------------ Offboarding ------------------------------ */

export async function setOffboardingTaskStatus(
  id: string,
  status: OffboardingTask["status"],
): Promise<OffboardingTask[]> {
  return unwrap<OffboardingTask[]>(
    (await api()).PATCH("/api/v1/offboarding/tasks/{id}/status", {
      params: { path: { id } },
      body: { status } as never,
    }),
  );
}

/** Delegate a whole department's offboarding tasks to an internal owner. */
export async function setOffboardingAssignee(
  owner: OffboardingTask["owner"],
  assignee: string | null,
): Promise<OffboardingTask[]> {
  return unwrap<OffboardingTask[]>(
    (await api()).PATCH("/api/v1/offboarding/assignees", {
      body: { owner, assignee } as never,
    }),
  );
}

/** Persist an initiated offboarding case — the employee is moved to the
 *  Offboarding status so the separation survives reloads. */
export async function saveOffboarding(employeeName: string, template?: string): Promise<void> {
  await unwrap(
    (await rawApi()).POST("/api/v1/offboarding/save", {
      body: { employeeName, ...(template ? { template } : {}) },
    }),
    null,
  );
}

export interface TerminationOptions {
  /** Super-admin bypass of the blocking-task gate. */
  override?: boolean;
  /** Explicit admin override of the statutory-leave termination lock. */
  statutoryOverride?: boolean;
  /** Human Rights Code certification acknowledgement (required with the override). */
  hrCertified?: boolean;
  terminationType?: "Voluntary" | "Involuntary";
  reason?: string;
  rehireEligible?: boolean;
  notes?: string;
}

/** Finalize termination — sets the employee's status to TERMINATED (kill switch).
 *  Throws with a STATUTORY_LEAVE_LOCK-prefixed message when the employee is on
 *  active statutory leave and no certified override was supplied. */
export async function finalizeTermination(
  employeeName: string,
  options: TerminationOptions = {},
): Promise<void> {
  await unwrap(
    (await api()).POST("/api/v1/offboarding/terminate", {
      body: { employeeName, ...options } as never,
    }),
    null,
  );
}

/* ------------------------------ Performance ------------------------------ */

export async function advanceReviewState(id: string): Promise<PerformanceReview[]> {
  return unwrap<PerformanceReview[]>(
    (await api()).POST("/api/v1/performance/reviews/{id}/advance", {
      params: { path: { id } },
    }),
  );
}

/**
 * Guarded goal re-weighting. Saves when the change is within the 15%
 * constructive-dismissal guardrail; throws with a WEIGHT_GUARDRAIL-prefixed
 * message when the change was blocked and routed to Pending Approvals.
 */
export async function requestGoalWeightChange(
  goalId: string,
  previousWeight: number,
  proposedWeight: number,
): Promise<void> {
  await unwrap(
    (await rawApi()).PATCH(`/api/v1/performance/growth/goals/${encodeURIComponent(goalId)}/weight`, {
      body: { previousWeight, proposedWeight },
    }),
    null,
  );
}

export interface ProbationSweepResult {
  /** Employees whose 90-day probationary review was just auto-initialized. */
  initialized: string[];
  /** Employees at Day 80+ whose probationary review is still open. */
  escalated: string[];
}

/** Day-60 initialize / Day-80 escalate probationary automation — invoked on
 *  Performance dashboard load (this platform has no cron infrastructure). */
export async function runProbationSweep(): Promise<ProbationSweepResult> {
  return unwrap<ProbationSweepResult>(
    (await rawApi()).POST("/api/v1/performance/probation/sweep", {}),
    { initialized: [], escalated: [] },
  );
}

/* -------------------------------- Agents --------------------------------- */

export async function createAgentRun(intent: string): Promise<AgentRun[]> {
  return unwrap<AgentRun[]>(
    (await api()).POST("/api/v1/platform/agent-runs", {
      body: { intent },
    }),
  );
}

export async function setAgentRunStatus(
  id: string,
  status: AgentRun["status"],
): Promise<AgentRun[]> {
  return unwrap<AgentRun[]>(
    (await api()).PATCH("/api/v1/platform/agent-runs/{id}/status", {
      params: { path: { id } },
      body: { status } as never,
    }),
  );
}

/* -------------------------------- Settings ------------------------------- */

export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  return unwrap<CompanySettings>(
    (await api()).PUT("/api/v1/platform/settings", {
      body: settings as never,
    }),
    settings,
  );
}
