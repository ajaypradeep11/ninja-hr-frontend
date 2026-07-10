import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
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
        <BrandMark
          className="mb-6 justify-center"
          logoClassName="h-10 w-10"
          nameClassName="text-xl font-bold text-ink"
        />
        {unprovisioned && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your account isn&apos;t linked to an employee profile yet — contact HR.</span>
          </div>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-xs text-ink-muted">
          New company?{" "}
          <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="/signup">
            Create your workspace
          </Link>
          . Employees are invited by HR after setup.
        </p>
      </div>
    </div>
  );
}
