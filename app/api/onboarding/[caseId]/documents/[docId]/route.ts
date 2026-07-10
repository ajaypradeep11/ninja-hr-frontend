import { buildProxyAuthHeaders } from "@/lib/api/proxy-headers";

// Proxies an uploaded preboarding document (SIN/banking PII) from the backend
// for HR verification on the verified-session bearer lane, so the backend
// enforces RBAC against the REAL signed-in user. The browser never sees the
// internal key; the binary passes straight through. Unauthenticated callers
// get 401 (see buildProxyAuthHeaders).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseId: string; docId: string }> },
) {
  const { caseId, docId } = await params;
  const authHeaders = await buildProxyAuthHeaders();
  if (!authHeaders) return new Response("Unauthorized", { status: 401 });
  const rawBase = process.env.NINJA_HR_API_URL ?? "";
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");

  const res = await fetch(`${baseUrl}/api/v1/onboarding/cases/${caseId}/documents/${docId}/file`, {
    headers: authHeaders,
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
