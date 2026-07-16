import { buildProxyAuthHeaders } from "@/lib/api/proxy-headers";
import { backendApiUrl } from "@/lib/backend-url";

// Proxies the résumé download from the backend on the verified-session bearer
// lane so the backend enforces RBAC (HR / hiring team) against the REAL
// signed-in user. The browser never sees the internal key. Binary passes
// straight through. Unauthenticated callers get 401 (see buildProxyAuthHeaders).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authHeaders = await buildProxyAuthHeaders();
  if (!authHeaders) return new Response("Unauthorized", { status: 401 });
  const rawBase = backendApiUrl();
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");
  // `?inline=true` → in-app viewer (Content-Disposition: inline); default downloads.
  const inline = new URL(req.url).searchParams.get("inline") === "true";

  const res = await fetch(
    `${baseUrl}/api/v1/recruitment/candidates/${id}/resume${inline ? "?inline=true" : ""}`,
    {
      headers: authHeaders,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return new Response("Résumé not available", { status: res.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("Content-Type") ?? "application/octet-stream");
  const disp = res.headers.get("Content-Disposition");
  if (disp) headers.set("Content-Disposition", disp);
  return new Response(res.body, { status: 200, headers });
}
