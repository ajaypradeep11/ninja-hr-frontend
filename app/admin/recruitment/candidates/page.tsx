export const dynamic = "force-dynamic";
import { apiClient } from "@/lib/api/client";
import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "@/lib/actor";
import type { RequisitionCandidate } from "@/lib/recruitment";
import { CandidatesList } from "./candidates-list";

async function getAllCandidates(): Promise<RequisitionCandidate[]> {
  const store = await cookies();
  const api = apiClient("admin", store.get(ACTOR_COOKIE)?.value);
  const { data, error, response } = await api.GET("/api/v1/recruitment/candidates");
  if (error !== undefined || !response.ok) {
    throw new Error(`Failed to load candidates (${response.status})`);
  }
  return (data ?? []) as RequisitionCandidate[];
}

export default async function ManageCandidatesPage() {
  const candidates = await getAllCandidates();
  return <CandidatesList candidates={candidates} />;
}
