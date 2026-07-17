"use server";

import { authedApi } from "@/lib/api/client";
import type {
  OnboardingCase,
  ChecklistTask,
  FormFlags,
  NewHireProfileInput,
  TaskOwner,
  TaskStatus,
  UploadKind,
} from "@/lib/onboarding";
import type { ProvinceCode } from "@/lib/compliance";

const api = () => authedApi("admin");

export interface NewCaseInput {
  name: string;
  title?: string;
  department?: string;
  province: ProvinceCode;
  startDate: string;
  personalEmail: string;
}

/**
 * Unwraps an openapi-fetch result, throwing on HTTP errors (with the backend's
 * message when present) instead of silently coercing failures to null.
 */
async function unwrap<T>(
  promise: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    const detail =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : `${response.status} ${response.statusText}`;
    throw new Error(`Request failed: ${detail}`);
  }
  return (data ?? null) as T;
}

export async function listCases(): Promise<OnboardingCase[]> {
  return (await unwrap<OnboardingCase[] | null>((await api()).GET("/api/v1/onboarding/cases"))) ?? [];
}

export async function createCase(input: NewCaseInput): Promise<OnboardingCase> {
  return unwrap<OnboardingCase>((await api()).POST("/api/v1/onboarding/cases", { body: input as never }));
}

/**
 * Looks up a case by its invite token — backs `/welcome/:token`. The new hire
 * has no session yet, so this rides the internal-key lane like the other
 * by-token routes; returns null for an unknown/expired token instead of
 * throwing (the caller decides how to present that).
 */
export async function getCaseByToken(token: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).GET("/api/v1/onboarding/cases/by-token/{token}", {
      params: { path: { token } },
    }),
  );
}

/**
 * The signed-in caller's own case, or null when they have none (every employee
 * who was never onboarded through this system). Unlike `listCases` — which is
 * HR-only and 403s for a new hire — this is scoped to the caller's employee id
 * by the backend, so it is what the employee shell reads.
 */
export async function getMyCase(): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>((await api()).GET("/api/v1/onboarding/cases/mine"));
}

/**
 * Invite acceptance — see the `/welcome/:token` flow. The backend owns this
 * end to end (set the password / verify the Google token, then provision the
 * PRE_HIRE employee record bound to that Firebase uid), because a hire with a
 * Firebase login but no backend identity is exactly what the employee shell
 * cannot serve: ActorGuard has nothing to resolve and 403s them.
 */
export async function acceptInvite(
  token: string,
  credential: { password?: string; idToken?: string },
): Promise<{ email: string }> {
  return unwrap<{ email: string }>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/accept", {
      params: { path: { token } },
      body: credential as never,
    }),
  );
}

export async function markForm(token: string, key: keyof FormFlags): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/forms/{key}", {
      params: { path: { token, key: key as string } },
    }),
  );
}

export async function submitNewHireProfile(
  token: string,
  input: NewHireProfileInput,
): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/profile", {
      params: { path: { token } },
      body: input as never,
    }),
  );
}

export async function uploadCaseDocument(
  token: string,
  input: { kind: UploadKind; fileName: string; mimeType: string; dataBase64: string },
): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/documents", {
      params: { path: { token } },
      body: input as never,
    }),
  );
}

export async function addConsent(token: string, policy: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/consent", {
      params: { path: { token } },
      body: { policy },
    }),
  );
}

export async function finalizeSubmission(token: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/by-token/{token}/finalize", {
      params: { path: { token } },
    }),
  );
}

export async function setChecklist(id: string, tasks: ChecklistTask[]): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).PUT("/api/v1/onboarding/cases/{id}/checklist", {
      params: { path: { id } },
      body: { tasks: tasks as never },
    }),
  );
}

/**
 * Deletes ONE checklist task. Deliberately not a full-checklist PUT: two
 * concurrent full replaces (e.g. a double-clicked Delete) interleave their
 * delete-all + re-create on the server and duplicate the checklist.
 */
export async function deleteTask(id: string, taskId: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).DELETE("/api/v1/onboarding/cases/{id}/tasks/{taskId}", {
      params: { path: { id, taskId } },
    }),
  );
}

export async function setTaskStatus(id: string, taskId: string, status: TaskStatus): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).PATCH("/api/v1/onboarding/cases/{id}/tasks/{taskId}", {
      params: { path: { id, taskId } },
      body: { status: status as never },
    }),
  );
}

/** Assign an internal employee to own a department's task block (null = unassign). */
export async function setTaskAssignee(
  id: string,
  owner: TaskOwner,
  employeeName: string | null,
): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).PATCH("/api/v1/onboarding/cases/{id}/assignees", {
      params: { path: { id } },
      body: { owner, employeeName } as never,
    }),
  );
}

/** Lightweight employee directory for the per-department Assign pickers. */
export async function listEmployeeDirectory(): Promise<
  { name: string; department: string; title: string }[]
> {
  const rows = await unwrap<{ name: string; department: string; title: string }[]>(
    (await api()).GET("/api/v1/people/employees"),
  );
  return (rows ?? []).map((e) => ({ name: e.name, department: e.department, title: e.title }));
}

export async function verifyDocument(id: string, docId: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/{id}/documents/{docId}/verify", {
      params: { path: { id, docId } },
    }),
  );
}

/**
 * HR rejects a submitted document with a note. The backend parks it as
 * 'Pending' (the rejected/awaiting-re-upload state — no REJECTED status in
 * the schema yet), records the note in the audit trail, and keeps the
 * activation gate closed until the employee re-uploads.
 */
export async function rejectDocument(id: string, docId: string, note: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/{id}/documents/{docId}/reject", {
      params: { path: { id, docId } },
      body: { note },
    }),
  );
}

export async function togglePolicy(id: string, policy: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/{id}/policies/toggle", {
      params: { path: { id } },
      body: { policy },
    }),
  );
}

export async function activate(id: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    (await api()).POST("/api/v1/onboarding/cases/{id}/activate", {
      params: { path: { id } },
    }),
  );
}

/* ----------------------- Department options (preboard) ----------------------- */

// Seed list until an admin customizes the company's departments. Kept in sync
// with the preboard page's fallback ("use server" files may only export async
// functions, so this can't be exported from here).
const DEFAULT_DEPARTMENTS = [
  "Engineering", "Design", "Sales", "Finance", "Marketing", "People", "Operations",
];

type SettingsWithDepartments = { departments?: string[] } & Record<string, unknown>;

/** The company's department list for the Launch Onboarding form. */
export async function getDepartmentOptions(): Promise<string[]> {
  const settings = await unwrap<SettingsWithDepartments | null>(
    (await api()).GET("/api/v1/platform/settings"),
  );
  const departments = settings?.departments;
  return Array.isArray(departments) && departments.length ? departments : DEFAULT_DEPARTMENTS;
}

/**
 * Persists the admin-managed department list on the company settings
 * (read-modify-write — the settings PUT takes the whole object).
 */
export async function saveDepartmentOptions(departments: string[]): Promise<string[]> {
  const settings = await unwrap<SettingsWithDepartments | null>(
    (await api()).GET("/api/v1/platform/settings"),
  );
  const cleaned = [...new Set(departments.map((d) => d.trim()).filter(Boolean))];
  await unwrap<unknown>(
    (await api()).PUT("/api/v1/platform/settings", {
      body: { ...settings, departments: cleaned } as never,
    }),
  );
  return cleaned;
}

const DEFAULT_JOB_TITLES = [
  "Software Engineer", "Product Designer", "Account Executive", "HR Generalist",
  "Financial Analyst", "Marketing Specialist", "Operations Manager",
];

type SettingsWithTitles = { jobTitles?: string[] } & Record<string, unknown>;

/** The company's admin-managed job-title list. */
export async function getJobTitleOptions(): Promise<string[]> {
  const settings = await unwrap<SettingsWithTitles | null>(
    (await api()).GET("/api/v1/platform/settings"),
  );
  const titles = settings?.jobTitles;
  return Array.isArray(titles) && titles.length ? titles : DEFAULT_JOB_TITLES;
}

/** Persists the job-title list (read-modify-write, same as departments). */
export async function saveJobTitleOptions(jobTitles: string[]): Promise<string[]> {
  const settings = await unwrap<SettingsWithTitles | null>(
    (await api()).GET("/api/v1/platform/settings"),
  );
  const cleaned = [...new Set(jobTitles.map((t) => t.trim()).filter(Boolean))];
  await unwrap<unknown>(
    (await api()).PUT("/api/v1/platform/settings", {
      body: { ...settings, jobTitles: cleaned } as never,
    }),
  );
  return cleaned;
}
