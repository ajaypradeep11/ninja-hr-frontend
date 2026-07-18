import { buildProxyAuthHeaders } from "@/lib/api/proxy-headers";
import { backendApiUrl } from "@/lib/backend-url";

// Proxies a training course's uploaded material file from the backend on the
// verified-session bearer lane (the course catalog is company-wide, so any
// authenticated user may open it). Mirrors the vault document proxy: the
// browser never sees the internal key; the binary passes straight through.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const authHeaders = await buildProxyAuthHeaders();
  if (!authHeaders) return new Response("Unauthorized", { status: 401 });
  const rawBase = backendApiUrl();
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");

  const res = await fetch(`${baseUrl}/api/v1/workplace/training-courses/${courseId}/material`, {
    headers: authHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response("Material not available", { status: res.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("Content-Type") ?? "application/octet-stream");
  const disp = res.headers.get("Content-Disposition");
  if (disp) headers.set("Content-Disposition", disp);
  return new Response(res.body, { status: 200, headers });
}
