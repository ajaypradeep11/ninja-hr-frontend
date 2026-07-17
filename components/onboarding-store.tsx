"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type {
  OnboardingCase,
  ChecklistTask,
  TaskOwner,
  TaskStatus,
  FormFlags,
  NewHireProfileInput,
  UploadKind,
} from "@/lib/onboarding";
import * as actions from "@/app/actions/onboarding";

type NewCaseInput = actions.NewCaseInput;

interface Ctx {
  cases: OnboardingCase[];
  loading: boolean;
  /**
   * The signed-in caller's OWN case (null for HR, and for anyone who never
   * onboarded through this system). This is how the wizard identifies its
   * subject when reached WITHOUT an invite token — i.e. from the sidebar,
   * where there is no `?case=` to read.
   */
  myCase: OnboardingCase | null;
  getCase: (id: string) => OnboardingCase | undefined;
  getByToken: (token: string) => OnboardingCase | undefined;
  refresh: () => Promise<void>;
  createCase: (input: NewCaseInput) => Promise<OnboardingCase>;
  // employee
  markForm: (token: string, key: keyof FormFlags) => Promise<void>;
  submitProfile: (token: string, input: NewHireProfileInput) => Promise<void>;
  uploadDocument: (
    token: string,
    input: { kind: UploadKind; fileName: string; mimeType: string; dataBase64: string },
  ) => Promise<void>;
  addConsent: (token: string, policy: string) => Promise<void>;
  finalizeSubmission: (token: string) => Promise<void>;
  // HR / admin
  setChecklist: (id: string, tasks: ChecklistTask[]) => Promise<void>;
  setTaskStatus: (id: string, taskId: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string, taskId: string) => Promise<void>;
  setTaskAssignee: (id: string, owner: TaskOwner, employeeName: string | null) => Promise<void>;
  verifyDocument: (id: string, docId: string) => Promise<void>;
  rejectDocument: (id: string, docId: string, note: string) => Promise<void>;
  togglePolicy: (id: string, policy: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
}

const OnboardingContext = React.createContext<Ctx | null>(null);

/**
 * Which cases this shell may read. The two audiences need different endpoints,
 * not just different filters:
 *  - "hr" → the whole company's cases (`listCases` is HR_ADMIN-only).
 *  - "employee" → the caller's own case. A new hire calling `listCases` gets a
 *    403, so the employee shell must never fetch it; `getMyCase` is scoped to
 *    the caller by the backend.
 */
export type OnboardingScope = "hr" | "employee";

export function OnboardingProvider({
  scope,
  children,
}: {
  scope: OnboardingScope;
  children: React.ReactNode;
}) {
  const [cases, setCases] = React.useState<OnboardingCase[]>([]);
  const [myCase, setMyCase] = React.useState<OnboardingCase | null>(null);
  const [loading, setLoading] = React.useState(true);
  // `/employee/onboarding?case=<token>` — where the invite drops the new hire,
  // and how HR previews a case from the preboard screen.
  const caseToken = useSearchParams().get("case");

  const load = React.useCallback(async (): Promise<{ cases: OnboardingCase[]; mine: OnboardingCase | null }> => {
    if (scope === "hr") return { cases: await actions.listCases(), mine: null };
    // Both, because neither alone covers everyone: the hire has a case of their
    // own but may arrive without the token (the sidebar's Onboarding tab), and
    // an HR admin previewing this shell has the token but no case of their own.
    const [mine, invited] = await Promise.all([
      actions.getMyCase(),
      caseToken ? actions.getCaseByToken(caseToken) : Promise.resolve(null),
    ]);
    const all = [mine, invited]
      .filter((c): c is OnboardingCase => !!c)
      .filter((c, i, list) => list.findIndex((o) => o.id === c.id) === i);
    return { cases: all, mine };
  }, [scope, caseToken]);

  const apply = React.useCallback((data: { cases: OnboardingCase[]; mine: OnboardingCase | null }) => {
    setCases(data.cases);
    setMyCase(data.mine);
  }, []);

  const refresh = React.useCallback(async () => {
    apply(await load());
  }, [load, apply]);

  React.useEffect(() => {
    let active = true;
    load()
      .then((data) => active && apply(data))
      .catch((err: unknown) => {
        // Don't let a backend outage become an unhandled rejection; pages
        // render their empty states and the console records the cause.
        console.error("Failed to load onboarding cases:", err);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  // Replace (or insert) a case returned from a server action.
  const upsert = React.useCallback((updated: OnboardingCase | null) => {
    if (!updated) return;
    setCases((prev) => {
      const i = prev.findIndex((c) => c.id === updated.id);
      if (i === -1) return [updated, ...prev];
      const copy = [...prev];
      copy[i] = updated;
      return copy;
    });
    // Keep the caller's own case in step with the list: the wizard renders from
    // it, so skipping this would freeze their progress at its first-loaded state.
    setMyCase((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  // Full-checklist replaces (add / import) are delete-all + re-create on the
  // server; two of them in flight at once interleave and duplicate tasks.
  // Chain them so a rapid double-click can never race itself.
  const checklistQueue = React.useRef<Promise<unknown>>(Promise.resolve());
  const enqueueChecklist = React.useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = checklistQueue.current.then(job, job);
    checklistQueue.current = next.catch(() => {});
    return next;
  }, []);

  const value: Ctx = {
    cases,
    loading,
    myCase,
    getCase: (id) => cases.find((c) => c.id === id),
    getByToken: (token) => cases.find((c) => c.token === token),
    refresh,

    createCase: async (input) => {
      const created = await actions.createCase(input);
      upsert(created);
      return created;
    },

    markForm: async (token, key) => upsert(await actions.markForm(token, key)),
    submitProfile: async (token, input) => upsert(await actions.submitNewHireProfile(token, input)),
    // upsert() re-binds the returned case, so the vault + progress update live.
    uploadDocument: async (token, input) => upsert(await actions.uploadCaseDocument(token, input)),
    addConsent: async (token, policy) => upsert(await actions.addConsent(token, policy)),
    finalizeSubmission: async (token) => upsert(await actions.finalizeSubmission(token)),

    setChecklist: (id, tasks) =>
      enqueueChecklist(async () => upsert(await actions.setChecklist(id, tasks))),
    setTaskStatus: async (id, taskId, status) =>
      upsert(await actions.setTaskStatus(id, taskId, status)),
    deleteTask: async (id, taskId) => {
      // Optimistic: drop the task instantly (the round trip made Delete feel
      // broken and invited double-clicks), then rebind to server truth.
      setCases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, checklist: c.checklist.filter((t) => t.id !== taskId) } : c,
        ),
      );
      try {
        upsert(await actions.deleteTask(id, taskId));
      } catch (err) {
        // 404 = already deleted (double click) — the optimistic state is
        // correct, don't resurrect the task or surface an error.
        if (err instanceof Error && /404|not found/i.test(err.message)) return;
        await refresh();
        throw err;
      }
    },
    setTaskAssignee: async (id, owner, employeeName) =>
      upsert(await actions.setTaskAssignee(id, owner, employeeName)),
    verifyDocument: async (id, docId) => upsert(await actions.verifyDocument(id, docId)),
    rejectDocument: async (id, docId, note) =>
      upsert(await actions.rejectDocument(id, docId, note)),
    togglePolicy: async (id, policy) => upsert(await actions.togglePolicy(id, policy)),
    activate: async (id) => upsert(await actions.activate(id)),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
