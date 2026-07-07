"use server";

import { apiClient } from "@/lib/api/client";
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

const api = () => apiClient("admin");

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
  return (await unwrap<OnboardingCase[] | null>(api().GET("/api/v1/onboarding/cases"))) ?? [];
}

export async function createCase(input: NewCaseInput): Promise<OnboardingCase> {
  return unwrap<OnboardingCase>(api().POST("/api/v1/onboarding/cases", { body: input as never }));
}

export async function markForm(token: string, key: keyof FormFlags): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/by-token/{token}/forms/{key}", {
      params: { path: { token, key: key as string } },
    }),
  );
}

export async function submitNewHireProfile(
  token: string,
  input: NewHireProfileInput,
): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/by-token/{token}/profile", {
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
    api().POST("/api/v1/onboarding/cases/by-token/{token}/documents", {
      params: { path: { token } },
      body: input as never,
    }),
  );
}

export async function addConsent(token: string, policy: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/by-token/{token}/consent", {
      params: { path: { token } },
      body: { policy },
    }),
  );
}

export async function finalizeSubmission(token: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/by-token/{token}/finalize", {
      params: { path: { token } },
    }),
  );
}

export async function setChecklist(id: string, tasks: ChecklistTask[]): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().PUT("/api/v1/onboarding/cases/{id}/checklist", {
      params: { path: { id } },
      body: { tasks: tasks as never },
    }),
  );
}

export async function setTaskStatus(id: string, taskId: string, status: TaskStatus): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().PATCH("/api/v1/onboarding/cases/{id}/tasks/{taskId}", {
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
    api().PATCH("/api/v1/onboarding/cases/{id}/assignees", {
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
    api().GET("/api/v1/people/employees"),
  );
  return (rows ?? []).map((e) => ({ name: e.name, department: e.department, title: e.title }));
}

export async function verifyDocument(id: string, docId: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/{id}/documents/{docId}/verify", {
      params: { path: { id, docId } },
    }),
  );
}

export async function togglePolicy(id: string, policy: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/{id}/policies/toggle", {
      params: { path: { id } },
      body: { policy },
    }),
  );
}

export async function activate(id: string): Promise<OnboardingCase | null> {
  return unwrap<OnboardingCase | null>(
    api().POST("/api/v1/onboarding/cases/{id}/activate", {
      params: { path: { id } },
    }),
  );
}
