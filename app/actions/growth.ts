"use server";

import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type {
  Colleague,
  GrowthGoal,
  GrowthOverview,
  KudosItem,
  OneOnOneSync,
  PeerFeedback,
} from "@/lib/growth";

async function client() {
  const store = await cookies();
  return apiClient("admin", store.get(ACTOR_COOKIE)?.value);
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

export async function getGrowth(): Promise<GrowthOverview> {
  const api = await client();
  return unwrap<GrowthOverview>(api.GET("/api/v1/performance/growth"));
}

export async function updateGoalProgress(
  goalId: string,
  input: { progress: number; note?: string },
): Promise<GrowthGoal[]> {
  const api = await client();
  return unwrap<GrowthGoal[]>(
    api.PATCH("/api/v1/performance/growth/goals/{id}/progress", {
      params: { path: { id: goalId } },
      body: input as never,
    }),
  );
}

export async function addTalkingPoint(syncId: string, text: string): Promise<OneOnOneSync> {
  const api = await client();
  return unwrap<OneOnOneSync>(
    api.POST("/api/v1/performance/growth/syncs/{id}/talking-points", {
      params: { path: { id: syncId } },
      body: { text } as never,
    }),
  );
}

export async function removeTalkingPoint(syncId: string, pointId: string): Promise<OneOnOneSync> {
  const api = await client();
  return unwrap<OneOnOneSync>(
    api.DELETE("/api/v1/performance/growth/syncs/{id}/talking-points/{pointId}", {
      params: { path: { id: syncId, pointId } },
    }),
  );
}

export async function addActionItem(syncId: string, text: string): Promise<OneOnOneSync> {
  const api = await client();
  return unwrap<OneOnOneSync>(
    api.POST("/api/v1/performance/growth/syncs/{id}/action-items", {
      params: { path: { id: syncId } },
      body: { text } as never,
    }),
  );
}

export async function toggleActionItem(
  syncId: string,
  itemId: string,
  done: boolean,
): Promise<OneOnOneSync> {
  const api = await client();
  return unwrap<OneOnOneSync>(
    api.PATCH("/api/v1/performance/growth/syncs/{id}/action-items/{itemId}", {
      params: { path: { id: syncId, itemId } },
      body: { done } as never,
    }),
  );
}

export async function requestPeerFeedback(input: {
  colleagueId: string;
  topic: string;
  message?: string;
}): Promise<PeerFeedback[]> {
  const api = await client();
  return unwrap<PeerFeedback[]>(
    api.POST("/api/v1/performance/growth/feedback-requests", { body: input as never }),
  );
}

export async function respondPeerFeedback(id: string, response: string): Promise<PeerFeedback[]> {
  const api = await client();
  return unwrap<PeerFeedback[]>(
    api.POST("/api/v1/performance/growth/feedback-requests/{id}/respond", {
      params: { path: { id } },
      body: { response } as never,
    }),
  );
}

export async function giveKudos(input: {
  toEmployeeId: string;
  message: string;
  emoji?: string;
}): Promise<KudosItem> {
  const api = await client();
  return unwrap<KudosItem>(
    api.POST("/api/v1/performance/growth/kudos", { body: input as never }),
  );
}

/** Directory for the colleague pickers (feedback requests, kudos). */
export async function listColleagues(): Promise<Colleague[]> {
  const api = await client();
  const rows = await unwrap<Colleague[]>(api.GET("/api/v1/people/employees"));
  return (rows ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    title: e.title,
    department: e.department,
  }));
}
