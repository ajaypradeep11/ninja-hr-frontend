"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui";
import { createSession } from "@/app/actions/auth";
import { createCompanySignup } from "@/app/actions/signup";
import { firebaseClientAuth } from "@/lib/firebase/client";

const PROVINCES = [
  ["ON", "Ontario"],
  ["BC", "British Columbia"],
  ["AB", "Alberta"],
  ["QC", "Quebec"],
  ["SK", "Saskatchewan"],
  ["MB", "Manitoba"],
  ["NS", "Nova Scotia"],
  ["NB", "New Brunswick"],
] as const;

export function SignupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = React.useState("");
  const [adminName, setAdminName] = React.useState("");
  const [workEmail, setWorkEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [province, setProvince] = React.useState<(typeof PROVINCES)[number][0]>("ON");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCompanySignup({
        companyName,
        adminName,
        workEmail,
        password,
        province,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        const credential = await signInWithEmailAndPassword(firebaseClientAuth(), result.email, password);
        await createSession(await credential.user.getIdToken());
        router.replace("/admin");
        router.refresh();
      } catch {
        // Workspace was created; only the auto-login failed. Don't strand the user.
        setError("Your workspace was created, but automatic sign-in failed. Please sign in with your email and password.");
      }
    });
  }

  return (
    <div className="card card-pad">
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="companyName">Company name</label>
          <input
            id="companyName"
            className="field-input"
            required
            minLength={2}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            autoComplete="organization"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="adminName">Your name</label>
          <input
            id="adminName"
            className="field-input"
            required
            minLength={2}
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="workEmail">Work email</label>
          <input
            id="workEmail"
            className="field-input"
            required
            type="email"
            value={workEmail}
            onChange={(event) => setWorkEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="province">Primary province</label>
            <select
              id="province"
              className="field-input"
              value={province}
              onChange={(event) => setProvince(event.target.value as typeof province)}
            >
              {PROVINCES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="field-input"
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating workspace..." : "Create workspace"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        Already onboarded?{" "}
        <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-300" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
