"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type {
  CandidateDetail,
  CommunicationTemplateEntry,
  CreateRequisitionInput,
  GuideSection,
  PublishingInput,
  RecruitmentAnalytics,
  RequisitionCandidate,
  RequisitionDetail,
  RequisitionSummary,
  TemplateTrigger,
} from "@/lib/recruitment";

/** API client that forwards the switched user so the backend enforces roles. */
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

export async function listRequisitions(includeArchived = false): Promise<RequisitionSummary[]> {
  const api = await client();
  return unwrap<RequisitionSummary[]>(
    api.GET("/api/v1/recruitment/requisitions", {
      params: { query: { includeArchived: includeArchived ? "true" : "false" } },
    }),
  );
}

export async function archiveRequisition(
  id: string,
  archived: boolean,
): Promise<RequisitionSummary[]> {
  const api = await client();
  const result = await unwrap<RequisitionSummary[]>(
    api.POST("/api/v1/recruitment/requisitions/{id}/archive", {
      params: { path: { id } },
      body: { archived } as never,
    }),
  );
  revalidatePath("/admin/recruitment");
  return result;
}

export async function deleteRequisition(id: string): Promise<RequisitionSummary[]> {
  const api = await client();
  const result = await unwrap<RequisitionSummary[]>(
    api.DELETE("/api/v1/recruitment/requisitions/{id}", { params: { path: { id } } }),
  );
  revalidatePath("/admin/recruitment");
  return result;
}

export async function getRequisitionDetail(id: string): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.GET("/api/v1/recruitment/requisitions/{id}", { params: { path: { id } } }),
  );
}

export async function createRequisition(input: CreateRequisitionInput): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.POST("/api/v1/recruitment/requisitions", { body: input as never }),
  );
}

export async function updateRequisition(
  id: string,
  input: CreateRequisitionInput,
): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.PATCH("/api/v1/recruitment/requisitions/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function submitRequisition(id: string): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.POST("/api/v1/recruitment/requisitions/{id}/submit", { params: { path: { id } } }),
  );
}

export async function decideRequisition(
  id: string,
  decision: "Approved" | "Rejected",
  comment?: string,
): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.POST("/api/v1/recruitment/requisitions/{id}/decision", {
      params: { path: { id } },
      body: { decision, comment } as never,
    }),
  );
}

export async function updatePublishing(
  id: string,
  input: PublishingInput,
): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.PATCH("/api/v1/recruitment/requisitions/{id}/publishing", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function publishRequisitionById(id: string): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.POST("/api/v1/recruitment/requisitions/{id}/publish", { params: { path: { id } } }),
  );
}

export async function getRequisitionCandidates(id: string): Promise<RequisitionCandidate[]> {
  const api = await client();
  return unwrap<RequisitionCandidate[]>(
    api.GET("/api/v1/recruitment/requisitions/{id}/candidates", { params: { path: { id } } }),
  );
}

/* ------------------------- Candidate management -------------------------- */

export async function getCandidateDetail(id: string): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.GET("/api/v1/recruitment/candidates/{id}", { params: { path: { id } } }),
  );
}

/** Stage change with automated communication triggers; returns the req-scoped list. */
export async function setCandidateStageScoped(
  id: string,
  stage: RequisitionCandidate["stage"],
): Promise<RequisitionCandidate[]> {
  const api = await client();
  return unwrap<RequisitionCandidate[]>(
    api.PATCH("/api/v1/recruitment/candidates/{id}/stage", {
      params: { path: { id } },
      body: { stage } as never,
    }),
  );
}

export async function sendCommunication(
  candidateId: string,
  input: { templateId?: string; subject?: string; body?: string },
): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.POST("/api/v1/recruitment/candidates/{id}/communications", {
      params: { path: { id: candidateId } },
      body: input as never,
    }),
  );
}

/** Add an internal (never candidate-facing) evaluation note. */
export async function draftCandidateMessage(
  candidateId: string,
  instruction: string,
): Promise<{ subject: string; body: string; source: "ai" | "template" }> {
  const api = await client();
  return unwrap<{ subject: string; body: string; source: "ai" | "template" }>(
    api.POST("/api/v1/recruitment/candidates/{id}/draft-message", {
      params: { path: { id: candidateId } },
      body: { instruction } as never,
    }),
  );
}

export async function simulateCandidateReply(
  candidateId: string,
  input: { subject?: string; body: string },
): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.POST("/api/v1/recruitment/candidates/{id}/simulate-reply", {
      params: { path: { id: candidateId } },
      body: input as never,
    }),
  );
}

export async function addCandidateNote(candidateId: string, body: string): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.POST("/api/v1/recruitment/candidates/{id}/notes", {
      params: { path: { id: candidateId } },
      body: { body } as never,
    }),
  );
}

/** Candidates the current user is assigned to evaluate (hiring-team member). */
export async function getAssignedCandidates(): Promise<RequisitionCandidate[]> {
  const api = await client();
  return unwrap<RequisitionCandidate[]>(api.GET("/api/v1/recruitment/assigned-candidates"));
}

/* ------------------------------ Scorecards ------------------------------- */

export async function getGuideTemplate(): Promise<GuideSection[]> {
  const api = await client();
  return unwrap<GuideSection[]>(api.GET("/api/v1/recruitment/guide-template"));
}

export async function saveGuideTemplate(sections: GuideSection[]): Promise<GuideSection[]> {
  const api = await client();
  return unwrap<GuideSection[]>(
    api.PUT("/api/v1/recruitment/guide-template", { body: { sections } as never }),
  );
}

export async function importGuideDocument(
  text: string,
): Promise<{ sections: GuideSection[]; source: "ai" | "parser" }> {
  const api = await client();
  return unwrap<{ sections: GuideSection[]; source: "ai" | "parser" }>(
    api.POST("/api/v1/recruitment/guide-template/import", { body: { text } as never }),
  );
}

export async function setScorecardCriteria(
  requisitionId: string,
  criteria: { name: string; weight?: number; guidance?: string }[],
): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.PUT("/api/v1/recruitment/requisitions/{id}/scorecard-criteria", {
      params: { path: { id: requisitionId } },
      body: { criteria } as never,
    }),
  );
}

export async function submitScorecard(
  candidateId: string,
  input: {
    recommendation: "Strong Yes" | "Yes" | "No" | "Strong No";
    overallNotes?: string;
    ratings: { criterionId: string; rating: number; notes?: string }[];
    status?: "DRAFT" | "SUBMITTED";
  },
): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.POST("/api/v1/recruitment/candidates/{id}/scorecards", {
      params: { path: { id: candidateId } },
      body: input as never,
    }),
  );
}

/* ------------------------------ JD generator ----------------------------- */

export interface GenerateJdResult {
  jd: string;
  source: "ai" | "template";
  inclusiveFlags: { term: string; category: string; suggestion: string }[];
}

export async function generateJd(input: {
  title: string;
  department: string;
  province: string;
  type: string;
  salaryMin: number;
  salaryMax: number;
  keyPoints?: string;
}): Promise<GenerateJdResult> {
  const api = await client();
  return unwrap<GenerateJdResult>(
    api.POST("/api/v1/recruitment/jd/generate", { body: input as never }),
  );
}

/* ------------------------- Analytics + privacy --------------------------- */

export async function getRecruitmentAnalytics(): Promise<RecruitmentAnalytics> {
  const api = await client();
  return unwrap<RecruitmentAnalytics>(api.GET("/api/v1/recruitment/analytics"));
}

export async function setCostOfHire(requisitionId: string, costOfHire: number): Promise<RequisitionDetail> {
  const api = await client();
  return unwrap<RequisitionDetail>(
    api.PATCH("/api/v1/recruitment/requisitions/{id}/cost", {
      params: { path: { id: requisitionId } },
      body: { costOfHire } as never,
    }),
  );
}

/** HR-only: anonymize all candidate PII in place (audited, irreversible). */
export async function purgeCandidate(candidateId: string): Promise<CandidateDetail> {
  const api = await client();
  return unwrap<CandidateDetail>(
    api.POST("/api/v1/recruitment/candidates/{id}/purge", { params: { path: { id: candidateId } } }),
  );
}

/* ------------------------------- Templates ------------------------------- */

export async function listTemplates(): Promise<CommunicationTemplateEntry[]> {
  const api = await client();
  return unwrap<CommunicationTemplateEntry[]>(api.GET("/api/v1/recruitment/templates"));
}

export async function createTemplate(input: {
  name: string;
  subject: string;
  body: string;
  trigger: TemplateTrigger;
}): Promise<CommunicationTemplateEntry[]> {
  const api = await client();
  return unwrap<CommunicationTemplateEntry[]>(
    api.POST("/api/v1/recruitment/templates", { body: input as never }),
  );
}

export async function updateTemplate(
  id: string,
  input: Partial<{ name: string; subject: string; body: string; trigger: TemplateTrigger }>,
): Promise<CommunicationTemplateEntry[]> {
  const api = await client();
  return unwrap<CommunicationTemplateEntry[]>(
    api.PATCH("/api/v1/recruitment/templates/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function deleteTemplate(id: string): Promise<CommunicationTemplateEntry[]> {
  const api = await client();
  return unwrap<CommunicationTemplateEntry[]>(
    api.DELETE("/api/v1/recruitment/templates/{id}", { params: { path: { id } } }),
  );
}
