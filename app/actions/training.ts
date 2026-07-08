"use server";

import { cookies } from "next/headers";
import { authedApi } from "@/lib/api/client";
import { ACTOR_COOKIE } from "@/lib/actor";
import type { PeerCourseInput, TrainingCourse } from "@/lib/data";
import type { CreateCourseInput, TrainingAssignment, TrainingStatus } from "@/lib/training";

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

export async function createCourse(input: CreateCourseInput): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(
    api.POST("/api/v1/workplace/training-courses", { body: input as never }),
  );
}

export async function deleteCourse(id: string): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(
    api.DELETE("/api/v1/workplace/training-courses/{id}", { params: { path: { id } } }),
  );
}

/* ---------------------- Peer-created courses (Creator Studio) ------- */

export async function listMyCourses(): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(api.GET("/api/v1/workplace/my-courses"));
}

export async function createPeerCourse(input: PeerCourseInput): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(
    api.POST("/api/v1/workplace/my-courses", { body: input as never }),
  );
}

export async function updatePeerCourse(
  id: string,
  input: Partial<PeerCourseInput> & { submit?: boolean },
): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(
    api.PATCH("/api/v1/workplace/my-courses/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}

export async function deletePeerCourse(id: string): Promise<TrainingCourse[]> {
  const api = await client();
  return unwrap<TrainingCourse[]>(
    api.DELETE("/api/v1/workplace/my-courses/{id}", { params: { path: { id } } }),
  );
}

export async function assignTraining(
  courseId: string,
  employeeIds: string[],
  dueDate?: string,
): Promise<TrainingAssignment[]> {
  const api = await client();
  return unwrap<TrainingAssignment[]>(
    api.POST("/api/v1/workplace/training-assignments", {
      body: { courseId, employeeIds, dueDate } as never,
    }),
  );
}

export async function getCourseAssignments(courseId: string): Promise<TrainingAssignment[]> {
  const api = await client();
  return unwrap<TrainingAssignment[]>(
    api.GET("/api/v1/workplace/training-courses/{id}/assignments", {
      params: { path: { id: courseId } },
    }),
  );
}

export async function getAllAssignments(): Promise<TrainingAssignment[]> {
  const api = await client();
  return unwrap<TrainingAssignment[]>(api.GET("/api/v1/workplace/training-assignments"));
}

export async function getMyTraining(): Promise<TrainingAssignment[]> {
  const api = await client();
  return unwrap<TrainingAssignment[]>(api.GET("/api/v1/workplace/my-training"));
}

export async function updateAssignment(
  id: string,
  input: { status?: TrainingStatus; progress?: number },
): Promise<TrainingAssignment> {
  const api = await client();
  return unwrap<TrainingAssignment>(
    api.PATCH("/api/v1/workplace/training-assignments/{id}", {
      params: { path: { id } },
      body: input as never,
    }),
  );
}
