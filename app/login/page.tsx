import { Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: `Sign in · ${BRAND.name}` };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-ink">{BRAND.name}</span>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-ink-muted">
          Accounts are created by your HR team. No account? Ask your administrator.
        </p>
      </div>
    </div>
  );
}
