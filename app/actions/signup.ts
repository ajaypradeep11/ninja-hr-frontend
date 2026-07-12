"use server";

type Province = "ON" | "BC" | "AB" | "QC" | "SK" | "MB" | "NS" | "NB";

export interface CompanySignupInput {
  companyName: string;
  adminName: string;
  workEmail: string;
  password: string;
  province: Province;
}

/**
 * Discriminated result instead of a thrown Error: Next.js redacts server-action
 * error messages in production builds, which left signup failures as an opaque
 * "Server Components render" message. Returning the message keeps it visible.
 */
export type CompanySignupResult = { ok: true; email: string } | { ok: false; error: string };

function backendBaseUrl(): string | null {
  const raw = process.env.NINJA_HR_API_URL;
  return raw ? raw.replace(/\/api\/v1\/?$/, "") : null;
}

export async function createCompanySignup(input: CompanySignupInput): Promise<CompanySignupResult> {
  const base = backendBaseUrl();
  if (!base) return { ok: false, error: "Backend API URL is not configured." };

  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/identity/company-signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the NinjaHR service. Please try again." };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    return { ok: false, error: message || `Company signup failed (${response.status}).` };
  }

  const body = (await response.json()) as { email: string };
  return { ok: true, email: body.email };
}
