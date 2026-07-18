import { buildProxyAuthHeaders } from "@/lib/api/proxy-headers";
import { backendApiUrl } from "@/lib/backend-url";

// Proxies a training course's cover image from the backend on the verified
// session lane — same pattern as the material proxy: the browser never sees
// the internal key; the binary passes straight through.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const authHeaders = await buildProxyAuthHeaders();
  if (!authHeaders) return new Response("Unauthorized", { status: 401 });
  const rawBase = backendApiUrl();
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");

  const res = await fetch(`${baseUrl}/api/v1/workplace/training-courses/${courseId}/cover`, {
    headers: authHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    return new Response("Cover not available", { status: res.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("Content-Type") ?? "image/jpeg");
  headers.set("Cache-Control", "private, max-age=300");
  return new Response(res.body, { status: 200, headers });
}
