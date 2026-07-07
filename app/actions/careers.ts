"use server";

import { apiClient } from "@/lib/api/client";
import type { ApplyFormInput, JobPosting, JobPostingDetail } from "@/lib/recruitment";

// Public careers pages: the browser never talks to the backend directly —
// these actions call it with the internal key (same pattern as onboarding).
const api = () => apiClient("employee");

async function unwrap<T>(
  promise: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (error !== undefined || !response.ok) {
    const detail =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return data as T;
}

export async function listJobs(): Promise<JobPosting[]> {
  return unwrap<JobPosting[]>(api().GET("/api/v1/recruitment/jobs"));
}

export async function getJob(slug: string): Promise<JobPostingDetail | null> {
  const { data, response } = await api().GET("/api/v1/recruitment/jobs/{slug}", {
    params: { path: { slug } },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load job (${response.status})`);
  return (data ?? null) as JobPostingDetail | null;
}

export async function applyToJob(
  slug: string,
  input: ApplyFormInput,
): Promise<{ portalToken: string }> {
  return unwrap<{ portalToken: string }>(
    api().POST("/api/v1/recruitment/jobs/{slug}/apply", {
      params: { path: { slug } },
      body: input as never,
    }),
  );
}
