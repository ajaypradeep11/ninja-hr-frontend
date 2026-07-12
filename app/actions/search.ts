"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type { Employee, VaultDocument } from "@/lib/data";

/** Everything the ⌘K command menu can search. Fetched once per open. */
export interface SearchIndex {
  employees: Pick<Employee, "id" | "name" | "title" | "department" | "email" | "status">[];
  documents: Pick<VaultDocument, "id" | "name" | "folder" | "type">[];
}

/**
 * The command menu's data source. Both endpoints are actor-scoped on the
 * backend (employees/documents a non-HR caller must not see are excluded at
 * the DB level), so a failure on either lane degrades to an empty section
 * rather than breaking search entirely.
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const store = await cookies();
  const api = await authedApi("admin", store.get(ACTOR_COOKIE)?.value);

  const [employees, documents] = await Promise.all([
    api
      .GET("/api/v1/people/employees")
      .then(({ data, response }) => (response.ok ? ((data ?? []) as Employee[]) : []))
      .catch(() => [] as Employee[]),
    api
      .GET("/api/v1/workplace/documents")
      .then(({ data, response }) => (response.ok ? ((data ?? []) as VaultDocument[]) : []))
      .catch(() => [] as VaultDocument[]),
  ]);

  return {
    employees: employees.map(({ id, name, title, department, email, status }) => ({
      id,
      name,
      title,
      department,
      email,
      status,
    })),
    documents: documents.map(({ id, name, folder, type }) => ({ id, name, folder, type })),
  };
}
