"use server";

import { apiClient } from "@/lib/api/client";
import type { PortalView } from "@/lib/recruitment";

const api = () => apiClient("employee");

export async function getPortal(token: string): Promise<PortalView | null> {
  const { data, response } = await api().GET("/api/v1/recruitment/portal/by-token/{token}", {
    params: { path: { token } },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Failed to load application (${response.status})`);
  return (data ?? null) as PortalView | null;
}

export async function withdrawApplication(token: string): Promise<PortalView> {
  const { data, error, response } = await api().POST(
    "/api/v1/recruitment/portal/by-token/{token}/withdraw",
    { params: { path: { token } } },
  );
  if (error !== undefined || !response.ok) {
    throw new Error(`Failed to withdraw (${response.status})`);
  }
  return data as unknown as PortalView;
}
