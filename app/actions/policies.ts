"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "@/lib/actor";
import { authedApi } from "@/lib/api/client";

export type PolicyDocumentStatus = "Processing" | "Ready" | "Failed";

export interface PolicyDocumentSummary {
  id: string;
  title: string;
  sourceType: "pdf" | "text";
  status: PolicyDocumentStatus;
  uploadedAt: string;
  chunkCount: number;
}

async function client() {
  const store = await cookies();
  return authedApi("admin", store.get(ACTOR_COOKIE)?.value);
}

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

export async function listPolicyDocuments(): Promise<PolicyDocumentSummary[]> {
  const api = await client();
  return unwrap<PolicyDocumentSummary[]>(api.GET("/api/v1/platform/policy-documents" as never));
}

export async function uploadPolicyDocument(input: {
  title: string;
  sourceType: "pdf" | "text";
  base64?: string;
  text?: string;
}): Promise<PolicyDocumentSummary[]> {
  const api = await client();
  const documents = await unwrap<PolicyDocumentSummary[]>(
    api.POST("/api/v1/platform/policy-documents" as never, { body: input } as never),
  );
  revalidatePath("/admin/settings/policies");
  return documents;
}

export async function deletePolicyDocument(id: string): Promise<PolicyDocumentSummary[]> {
  const api = await client();
  const documents = await unwrap<PolicyDocumentSummary[]>(
    api.DELETE(
      "/api/v1/platform/policy-documents/{id}" as never,
      { params: { path: { id } } } as never,
    ),
  );
  revalidatePath("/admin/settings/policies");
  return documents;
}

export async function retryPolicyIngestion(id: string): Promise<PolicyDocumentSummary[]> {
  const api = await client();
  const documents = await unwrap<PolicyDocumentSummary[]>(
    api.POST(
      "/api/v1/platform/policy-documents/{id}/retry" as never,
      { params: { path: { id } } } as never,
    ),
  );
  revalidatePath("/admin/settings/policies");
  return documents;
}
