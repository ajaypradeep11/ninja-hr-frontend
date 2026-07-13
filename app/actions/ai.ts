"use server";

import { authedApi } from "@/lib/api/client";
import type { Persona } from "@/lib/api/client";

export interface CoPilotResult {
  text: string;
  live: boolean; // true if answered by Claude, false if the caller should use its canned fallback
}

/**
 * Ask the HR Co-Pilot. Delegates to the backend which owns the Anthropic SDK.
 * Returns { live: false } when the backend has no live key configured, so the
 * client can fall back to its built-in canned response.
 */
export async function askCoPilot(
  question: string,
  persona: "admin" | "employee",
): Promise<CoPilotResult> {
  try {
    const client = await authedApi(persona as Persona);
    // Bound the wait — an unresponsive backend/model must degrade to the
    // canned fallback, not leave the drawer on "Thinking…" forever.
    const { data } = await client.POST("/api/v1/platform/copilot/ask", {
      body: { question },
      signal: AbortSignal.timeout(30_000),
    });
    const result = data as unknown as { text: string; live: boolean } | undefined;
    if (!result) return { text: "", live: false };
    return { text: result.text ?? "", live: result.live ?? false };
  } catch {
    return { text: "", live: false };
  }
}
