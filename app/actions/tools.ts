"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";

/* ------------------------------ Types ------------------------------ */

export interface ToolInputField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
}

export interface ToolListItem {
  slug: string;
  name: string;
  category: string;
  description: string;
  kind: "PROMPT" | "BUILTIN";
  inputs: ToolInputField[];
  surfaces: string[];
  href: string | null;
  /** Company-wide switch (Super Admin controlled). */
  enabled: boolean;
  /** Whether the current caller may run/open the tool. */
  canRun: boolean;
  granted: boolean;
  grantCount: number;
}

export interface ToolLibraryView {
  canManage: boolean;
  tools: ToolListItem[];
}

export interface ToolRunResult {
  slug: string;
  text: string;
  live: boolean;
  blockedCategory: string | null;
}

export interface ToolAccessView {
  slug: string;
  grantedUserIds: string[];
  users: {
    userId: string;
    employeeId: string;
    name: string;
    title: string;
    department: string;
    role: string;
  }[];
}

/* ---------------------------- Plumbing ----------------------------- */

/**
 * Untyped escape hatch (same pattern as app/actions/modules.ts): the /tools
 * endpoints are not in the generated OpenAPI types yet. Regenerate with
 * `npm run api:generate` (backend running) and migrate to the typed client.
 * Actor-aware: the backend decides per-tool visibility from the caller's
 * role + grants, so the x-actor-id cookie must flow through.
 */
async function toolsApi() {
  const store = await cookies();
  return (await authedApi("admin", store.get(ACTOR_COOKIE)?.value)) as unknown as {
    GET: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
    POST: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
    PUT: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
  };
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

/* ----------------------------- Actions ----------------------------- */

/** Role-aware library listing; optionally filtered to one module surface. */
export async function listTools(surface?: string): Promise<ToolLibraryView> {
  const client = await toolsApi();
  const query = surface ? `?surface=${encodeURIComponent(surface)}` : "";
  return unwrap<ToolLibraryView>(client.GET(`/api/v1/tools${query}`));
}

export async function runTool(
  slug: string,
  inputs: Record<string, string>,
): Promise<ToolRunResult> {
  const client = await toolsApi();
  return unwrap<ToolRunResult>(
    client.POST(`/api/v1/tools/${encodeURIComponent(slug)}/run`, { body: { inputs } }),
  );
}

export async function getToolAccess(slug: string): Promise<ToolAccessView> {
  const client = await toolsApi();
  return unwrap<ToolAccessView>(client.GET(`/api/v1/tools/${encodeURIComponent(slug)}/access`));
}

export async function setToolEnabled(
  slug: string,
  enabled: boolean,
): Promise<{ slug: string; enabled: boolean }> {
  const client = await toolsApi();
  return unwrap(
    client.PUT(`/api/v1/tools/${encodeURIComponent(slug)}/enabled`, { body: { enabled } }),
  );
}

export async function setToolGrants(
  slug: string,
  userIds: string[],
): Promise<{ slug: string; grantedUserIds: string[] }> {
  const client = await toolsApi();
  return unwrap(
    client.PUT(`/api/v1/tools/${encodeURIComponent(slug)}/grants`, { body: { userIds } }),
  );
}
