"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseClientAuth } from "@/lib/firebase/client";
import { createSession, activateAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export function WelcomeForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function finish(idToken: string) {
    await createSession(idToken);
    router.replace(`/employee/onboarding?case=${token}`);
    router.refresh();
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void withBusy(async () => {
            if (password.length < 10) throw new Error("Password must be at least 10 characters.");
            if (password !== confirm) throw new Error("Passwords don't match.");
            const { email } = await activateAccount(token, password);
            const cred = await signInWithEmailAndPassword(firebaseClientAuth(), email, password);
            await finish(await cred.user.getIdToken());
          });
        }}
      >
        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={10}
            className="field-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Setting up…" : "Set password & continue"}
        </Button>
      </form>
    </div>
  );
}
