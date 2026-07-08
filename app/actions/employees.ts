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
