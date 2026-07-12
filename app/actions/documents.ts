"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type { VaultDocument } from "@/lib/data";

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

export interface UploadVaultDocumentInput {
  name: string;
  type: string;
  folder: string;
  access: VaultDocument["access"];
  employeeName?: string;
}

/** File a manually uploaded document into the vault (Documents dropzone). */
export async function uploadVaultDocument(
  input: UploadVaultDocumentInput,
): Promise<VaultDocument> {
  const api = await client();
  return unwrap<VaultDocument>(
    api.POST("/api/v1/workplace/documents", {
      body: input as never,
    }),
  );
}
