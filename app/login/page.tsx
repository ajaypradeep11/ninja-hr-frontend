import { Sparkles, ShieldAlert } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: `Sign in · ${BRAND.name}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const unprovisioned = error === "unprovisioned";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-ink">{BRAND.name}</span>
        </div>
        {unprovisioned && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your account isn&apos;t linked to an employee profile yet — contact HR.</span>
          </div>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-xs text-ink-muted">
          Accounts are created by your HR team. No account? Ask your administrator.
        </p>
      </div>
    </div>
  );
}
