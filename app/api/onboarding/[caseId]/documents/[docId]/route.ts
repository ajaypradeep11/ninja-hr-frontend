import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "@/lib/actor";

// Proxies an uploaded preboarding document from the backend for HR
// verification, attaching the internal key + actor cookie. The browser never
// sees the internal key; the binary passes straight through.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseId: string; docId: string }> },
) {
  const { caseId, docId } = await params;
  const store = await cookies();
  const actorId = store.get(ACTOR_COOKIE)?.value;
  const rawBase = process.env.NINJA_HR_API_URL ?? "";
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");

  const res = await fetch(`${baseUrl}/api/v1/onboarding/cases/${caseId}/documents/${docId}/file`, {
    headers: {
      "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
      "x-actor-persona": "admin",
      ...(actorId ? { "x-actor-id": actorId } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response("Document not available", { status: res.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("Content-Type") ?? "application/octet-stream");
  const disp = res.headers.get("Content-Disposition");
  if (disp) headers.set("Content-Disposition", disp);
  return new Response(res.body, { status: 200, headers });
}
