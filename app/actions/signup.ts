"use server";

type Province = "ON" | "BC" | "AB" | "QC" | "SK" | "MB" | "NS" | "NB";

export interface CompanySignupInput {
  companyName: string;
  adminName: string;
  workEmail: string;
  password: string;
  province: Province;
}

export interface CompanySignupResult {
  email: string;
}

function backendBaseUrl(): string {
  const raw = process.env.NINJA_HR_API_URL;
  if (!raw) throw new Error("Backend API URL is not configured.");
  return raw.replace(/\/api\/v1\/?$/, "");
}

export async function createCompanySignup(input: CompanySignupInput): Promise<CompanySignupResult> {
  const response = await fetch(`${backendBaseUrl()}/api/v1/identity/company-signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new Error(message || "Company signup failed.");
  }

  const body = (await response.json()) as { email: string };
  return { email: body.email };
}
