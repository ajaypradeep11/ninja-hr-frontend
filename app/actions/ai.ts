"use server";

import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;

/** A real key is present (not blank, not the bundled placeholder). */
function hasLiveKey(): boolean {
  return !!KEY && KEY.startsWith("sk-ant-");
}

const SYSTEM_BASE = `You are the HR Co-Pilot for TestHR, an agentic HR platform for the Canadian market.
Be concise and helpful — answer in 1-3 short sentences, no preamble. You understand Canadian
provincial employment standards (ESA), Ontario Bill 149, and Quebec Law 25 at a high level.

Hard guardrails you always respect and mention when relevant:
- You never execute destructive actions (deletions, status changes to Terminated/Rejected)
  without explicit human approval — you queue them for a one-click confirmation instead.
- For employee-facing questions you are scoped to the current user's own data only.
- This is illustrative guidance, not legal advice.`;

const SYSTEM_ADMIN = `${SYSTEM_BASE}

You are speaking to an HR Admin (Sarah Mitchell). You can read across Recruitment, Onboarding,
Leave, Documents, Performance, and Offboarding, and you can queue multi-step workflows for approval.`;

const SYSTEM_EMPLOYEE = `${SYSTEM_BASE}

You are speaking to an employee (Jim Scott, a BC-based Account Executive). Answer questions about
his leave balances, pay schedule, training, and HR policies. You cannot see other employees' data.`;

export interface CoPilotResult {
  text: string;
  live: boolean; // true if answered by Claude, false if the caller should use its canned fallback
}

/**
 * Ask the HR Co-Pilot. When a real Anthropic key is configured, this calls
 * Claude (claude-opus-4-8); otherwise it returns { live: false } so the client
 * falls back to its built-in canned response.
 */
export async function askCoPilot(
  question: string,
  persona: "admin" | "employee",
): Promise<CoPilotResult> {
  if (!hasLiveKey()) return { text: "", live: false };

  try {
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: persona === "admin" ? SYSTEM_ADMIN : SYSTEM_EMPLOYEE,
      messages: [{ role: "user", content: question }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return { text: text || "", live: true };
  } catch {
    // Any API/auth error → let the caller use its canned fallback.
    return { text: "", live: false };
  }
}
