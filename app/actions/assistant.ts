"use server";

import { authedApi, type Persona } from "@/lib/api/client";

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  blockedCategory: string | null;
  createdAt: string;
}

export interface ConversationView {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageView[];
}

async function result<T>(request: Promise<{ data?: unknown; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request;
  if (error !== undefined || !response.ok || data === undefined) {
    throw new Error(`Assistant request failed (${response.status}). Please try again.`);
  }
  return data as T;
}

export async function listConversations(persona: Persona): Promise<ConversationView[]> {
  const client = await authedApi(persona);
  return result(client.GET("/api/v1/platform/conversations" as never));
}

export async function createConversation(persona: Persona): Promise<ConversationView> {
  const client = await authedApi(persona);
  return result(client.POST("/api/v1/platform/conversations" as never, {} as never));
}

export async function deleteConversation(id: string, persona: Persona): Promise<ConversationView[]> {
  const client = await authedApi(persona);
  return result(
    client.DELETE("/api/v1/platform/conversations/{id}" as never, { params: { path: { id } } } as never),
  );
}

export async function sendChatMessage(
  id: string,
  content: string,
  persona: Persona,
): Promise<ConversationView> {
  const client = await authedApi(persona);
  return result(
    client.POST("/api/v1/platform/conversations/{id}/messages" as never, {
      params: { path: { id } },
      body: { content },
      signal: AbortSignal.timeout(65_000),
    } as never),
  );
}
