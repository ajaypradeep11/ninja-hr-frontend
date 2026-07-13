"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type {
  EmergencyContactInput,
  EmployeeDetail,
  UpdateEmployeeInput,
} from "@/lib/employees";

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

export interface CreateEmployeeInput {
  name: string;
  title: string;
  department: string;
  province: string;
  email: string;
  hireDate: string;
  birthDate?: string;
  salary?: number;
  employmentType?: string;
  phone?: string;
  preferredName?: string;
}

/** Manual profile creation (Add Employee → "Add manually"). Discriminated
 *  result — Next redacts thrown server-action messages in production. */
export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ ok: true; employee: EmployeeDetail } | { ok: false; error: string }> {
  try {
    // Endpoint added after the last openapi.d.ts generation — regenerate to type it.
    const raw = (await client()) as unknown as {
      POST: (path: string, init?: object) => Promise<{ data?: unknown; error?: unknown; response: Response }>;
    };
    const employee = await unwrap<EmployeeDetail>(raw.POST("/api/v1/people/employees", { body: input }));
    return { ok: true, employee };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create the employee." };
  }
}

export async function getEmployeeDetail(id: string): Promise<EmployeeDetail> {
  const api = await client();
  return unwrap<EmployeeDetail>(
    api.GET("/api/v1/people/employees/{id}", { params: { path: { id } } }),
  );
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeDetail> {
  const api = await client();
  return unwrap<EmployeeDetail>(
    api.PATCH("/api/v1/people/employees/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function addEmergencyContact(
  employeeId: string,
  input: EmergencyContactInput,
): Promise<EmployeeDetail> {
  const api = await client();
  return unwrap<EmployeeDetail>(
    api.POST("/api/v1/people/employees/{id}/emergency-contacts", {
      params: { path: { id: employeeId } },
      body: input as never,
    }),
  );
}

export async function deleteEmergencyContact(
  employeeId: string,
  contactId: string,
): Promise<EmployeeDetail> {
  const api = await client();
  return unwrap<EmployeeDetail>(
    api.DELETE("/api/v1/people/employees/{id}/emergency-contacts/{contactId}", {
      params: { path: { id: employeeId, contactId } },
    }),
  );
}
