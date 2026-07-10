import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { SignupForm } from "./signup-form";

export const metadata = { title: `Create company · ${BRAND.name}` };

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <BrandMark logoClassName="h-11 w-11" nameClassName="text-xl font-bold text-ink" />
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-600 dark:text-brand-300">
              Company onboarding
            </p>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Create your workspace and first HR admin account.
            </h1>
            <p className="max-w-xl text-base leading-7 text-ink-muted">
              This one-time setup creates the company profile, your employee record,
              and the first administrator login. After that, employees are invited
              through onboarding.
            </p>
          </div>
        </section>
        <SignupForm />
      </div>
    </div>
  );
}
