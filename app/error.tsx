"use client";

// Global error boundary — without one, any failed backend fetch surfaces as
// the raw Next.js 500 screen (or worse, pages silently render empty).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        We couldn&apos;t reach the NinjaHR service. Check that the backend is running, then try again.
      </p>
      {error.digest && <p className="text-xs text-slate-400">Ref: {error.digest}</p>}
      <button
        onClick={reset}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  );
}
