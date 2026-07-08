"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type { LetterTemplate, LetterTemplateInput } from "@/lib/letters";
import type { CalcRule, CalcRuleInput } from "@/lib/calc";

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

/* ------------------------------ Letter Lab ----------------------------- */

export async function listLetterTemplates(): Promise<LetterTemplate[]> {
  const api = await client();
  return unwrap<LetterTemplate[]>(api.GET("/api/v1/workplace/letter-templates"));
}

export async function createLetterTemplate(
  input: LetterTemplateInput,
): Promise<LetterTemplate[]> {
  const api = await client();
  return unwrap<LetterTemplate[]>(
    api.POST("/api/v1/workplace/letter-templates", { body: input as never }),
  );
}

export async function updateLetterTemplate(
  id: string,
  input: Partial<LetterTemplateInput>,
): Promise<LetterTemplate[]> {
  const api = await client();
  return unwrap<LetterTemplate[]>(
    api.PATCH("/api/v1/workplace/letter-templates/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function deleteLetterTemplate(id: string): Promise<LetterTemplate[]> {
  const api = await client();
  return unwrap<LetterTemplate[]>(
    api.DELETE("/api/v1/workplace/letter-templates/{id}", { params: { path: { id } } }),
  );
}

/** File the generated letter into the employee's document vault. */
export async function issueLetter(input: {
  employeeId: string;
  name: string;
  mode: "save" | "signature";
}): Promise<void> {
  const api = await client();
  await unwrap(api.POST("/api/v1/workplace/letters/issue", { body: input as never }));
}

/* ------------------------- Calculator Engine --------------------------- */

export async function listCalcRules(): Promise<CalcRule[]> {
  const api = await client();
  return unwrap<CalcRule[]>(api.GET("/api/v1/platform/calc-rules"));
}

export async function createCalcRule(input: CalcRuleInput): Promise<CalcRule[]> {
  const api = await client();
  return unwrap<CalcRule[]>(api.POST("/api/v1/platform/calc-rules", { body: input as never }));
}

export async function updateCalcRule(
  id: string,
  input: Partial<CalcRuleInput>,
): Promise<CalcRule[]> {
  const api = await client();
  return unwrap<CalcRule[]>(
    api.PATCH("/api/v1/platform/calc-rules/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function deleteCalcRule(id: string): Promise<CalcRule[]> {
  const api = await client();
  return unwrap<CalcRule[]>(
    api.DELETE("/api/v1/platform/calc-rules/{id}", { params: { path: { id } } }),
  );
}
