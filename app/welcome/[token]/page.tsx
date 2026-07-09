import { ShieldAlert, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getCaseByToken } from "@/app/actions/onboarding";
import { WelcomeForm } from "./welcome-form";

export const metadata = { title: `Welcome · ${BRAND.name}` };

/**
 * Invite-acceptance landing page — the link HR sends a new hire
 * (`app/admin/onboarding/preboard/page.tsx`). No session exists yet (this
 * route is deliberately outside middleware's matcher), so the case is looked
 * up over the internal-key lane via a server action.
 */
export default async function WelcomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const onboardingCase = await getCaseByToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-ink">{BRAND.name}</span>
        </div>

        {onboardingCase ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-lg font-semibold text-ink">
                Welcome to {BRAND.name}, {onboardingCase.name.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                Set a password to activate your account and start onboarding.
              </p>
            </div>
            <WelcomeForm token={token} expectedEmail={onboardingCase.personalEmail} />
          </>
        ) : (
          <div className="card card-pad space-y-2 text-center">
            <ShieldAlert className="mx-auto h-6 w-6 text-amber-500 dark:text-amber-300" />
            <p className="text-sm font-medium text-ink">This invite link is invalid or has expired.</p>
            <p className="text-xs text-ink-muted">Ask HR to re-send your invite.</p>
          </div>
        )}
      </div>
    </div>
  );
}
