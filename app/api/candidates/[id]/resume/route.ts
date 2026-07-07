import { cookies } from "next/headers";
import { ACTOR_COOKIE } from "@/lib/actor";

// Proxies the résumé download from the backend, attaching the internal key +
// actor cookie so RBAC (HR / hiring team) is enforced. The browser never sees
// the internal key. Binary passes straight through.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = await cookies();
  const actorId = store.get(ACTOR_COOKIE)?.value;
  const rawBase = process.env.NINJA_HR_API_URL ?? "";
  const baseUrl = rawBase.replace(/\/api\/v1\/?$/, "");
  // `?inline=true` → in-app viewer (Content-Disposition: inline); default downloads.
  const inline = new URL(req.url).searchParams.get("inline") === "true";

  const res = await fetch(
    `${baseUrl}/api/v1/recruitment/candidates/${id}/resume${inline ? "?inline=true" : ""}`,
    {
      headers: {
        "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
        "x-actor-persona": "admin",
        ...(actorId ? { "x-actor-id": actorId } : {}),
      },
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
