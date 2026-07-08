"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { firebaseClientAuth } from "@/lib/firebase/client";
import { createSession } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function finish(idToken: string) {
    await createSession(idToken);
    router.replace("/admin");
    router.refresh();
  }

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setError(
        code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")
          ? "Email or password is incorrect."
          : "Sign-in failed. Try again.",
      );
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
            const cred = await signInWithEmailAndPassword(firebaseClientAuth(), email, password);
            await finish(await cred.user.getIdToken());
          });
        }}
      >
        <div>
          <label className="field-label" htmlFor="email">Work email</label>
          <input id="email" type="email" required className="field-input" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field-input" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-ink-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={() =>
          void withBusy(async () => {
            const cred = await signInWithPopup(firebaseClientAuth(), new GoogleAuthProvider());
            await finish(await cred.user.getIdToken());
          })
        }
      >
        Continue with Google
      </Button>
    </div>
  );
}
