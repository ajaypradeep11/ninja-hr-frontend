"use server";

import { apiClient } from "@/lib/api/client";
import type {
  OnboardingCase,
  ChecklistTask,
  FormFlags,
  TaskStatus,
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

export async function listCases(): Promise<OnboardingCase[]> {
  const { data } = await api().GET("/api/v1/onboarding/cases");
  return (data ?? []) as OnboardingCase[];
}

export async function createCase(input: NewCaseInput): Promise<OnboardingCase> {
  const { data } = await api().POST("/api/v1/onboarding/cases", { body: input as never });
  return data as unknown as OnboardingCase;
}

export async function markForm(token: string, key: keyof FormFlags): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/by-token/{token}/forms/{key}", {
    params: { path: { token, key: key as string } },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function addConsent(token: string, policy: string): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/by-token/{token}/consent", {
    params: { path: { token } },
    body: { policy },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function finalizeSubmission(token: string): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/by-token/{token}/finalize", {
    params: { path: { token } },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function setChecklist(id: string, tasks: ChecklistTask[]): Promise<OnboardingCase | null> {
  const { data } = await api().PUT("/api/v1/onboarding/cases/{id}/checklist", {
    params: { path: { id } },
    body: { tasks: tasks as never },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function setTaskStatus(id: string, taskId: string, status: TaskStatus): Promise<OnboardingCase | null> {
  const { data } = await api().PATCH("/api/v1/onboarding/cases/{id}/tasks/{taskId}", {
    params: { path: { id, taskId } },
    body: { status: status as never },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function verifyDocument(id: string, docId: string): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/{id}/documents/{docId}/verify", {
    params: { path: { id, docId } },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function togglePolicy(id: string, policy: string): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/{id}/policies/toggle", {
    params: { path: { id } },
    body: { policy },
  });
  return (data ?? null) as OnboardingCase | null;
}

export async function activate(id: string): Promise<OnboardingCase | null> {
  const { data } = await api().POST("/api/v1/onboarding/cases/{id}/activate", {
    params: { path: { id } },
  });
  return (data ?? null) as OnboardingCase | null;
}
