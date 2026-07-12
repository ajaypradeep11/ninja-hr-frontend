"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  Upload,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Lock,
  CheckCircle2,
  XCircle,
  Rocket,
  History,
  X,
  Download,
  CircleDot,
  Circle,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { AssigneePicker } from "@/components/assignee-picker";
import { TaskStatusPill, BlockingTag } from "@/components/task-pills";
import { cn, formatDate } from "@/lib/utils";
import { provinceName } from "@/lib/compliance";
import { useOnboarding } from "@/components/onboarding-store";
import { listEmployeeDirectory } from "@/app/actions/onboarding";
import {
  activationGates,
  canActivate,
  caseProgress,
  type CaseDocument,
  type ChecklistTask,
  type TaskOwner,
  type TaskStatus,
  type DataAccess,
} from "@/lib/onboarding";

const OWNERS: TaskOwner[] = ["HR", "Finance", "IT / Ops", "Manager"];

/** Which company department typically staffs each task-owner team — used to
 *  sort the best-fit people to the top of the per-department Assign picker. */
const OWNER_HOME_DEPT: Record<TaskOwner, string | null> = {
  HR: "People",
  Finance: "Finance",
  "IT / Ops": "Engineering",
  Manager: null,
};
const STATUS_CYCLE: TaskStatus[] = ["Pending", "In-Progress", "Completed"];
const ownerTone: Record<TaskOwner, "brand" | "sky" | "amber" | "violet"> = {
  HR: "brand",
  Finance: "sky",
  "IT / Ops": "amber",
  Manager: "violet",
};
const accessTone: Record<DataAccess, "gray" | "amber" | "red"> = {
  general: "gray",
  banking: "amber",
  medical: "red",
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    getCase,
    loading,
    setChecklist,
    setTaskStatus,
    deleteTask,
    setTaskAssignee,
    verifyDocument,
    rejectDocument,
    activate,
  } = useOnboarding();
  const c = getCase(params.id);

  const [showUpload, setShowUpload] = React.useState(false);
  const [uploadText, setUploadText] = React.useState("");
  const [showAudit, setShowAudit] = React.useState(false);
  const [preview, setPreview] = React.useState<CaseDocument | null>(null);
  // Document being rejected + the note sent to the employee / audit trail.
  const [rejecting, setRejecting] = React.useState<CaseDocument | null>(null);
  const [rejectNote, setRejectNote] = React.useState("");
  const [rejectBusy, setRejectBusy] = React.useState(false);
  const [newTask, setNewTask] = React.useState<{ label: string; owner: TaskOwner; blocking: boolean; access: DataAccess }>(
    { label: "", owner: "HR", blocking: false, access: "general" },
  );
  const [actionError, setActionError] = React.useState<string | null>(null);
  // Department accordion collapse state (all expanded by default).
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  // Internal employee directory for the per-department Assign pickers.
  const [directory, setDirectory] = React.useState<
    { name: string; department: string; title: string }[]
  >([]);
  React.useEffect(() => {
    listEmployeeDirectory()
      .then(setDirectory)
      .catch(() => setDirectory([]));
  }, []);

  // Surface failed mutations (e.g. activation blocked by gates → 409) instead
  // of leaving them as silent unhandled rejections.
  const run = (p: Promise<unknown>) =>
    p
      .then(() => setActionError(null))
      .catch((err: unknown) =>
        setActionError(err instanceof Error ? err.message : "Action failed"),
      );

  if (!c) {
    return (
      <div>
        <Link href="/admin/onboarding" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          ← Back to Onboarding
        </Link>
        <p className="mt-6 text-sm text-ink-muted">
          {loading ? "Loading onboarding case…" : "This onboarding case wasn’t found."}
        </p>
      </div>
    );
  }

  const gates = activationGates(c);
  const ready = canActivate(c);
  const progress = caseProgress(c);

  // Human-in-the-loop blockers: documents HR still has to verify before the
  // account can be activated. Drives the tooltip + "Action Required" banner.
  const pendingVerifyCount = c.documents.filter((d) => d.status === "Needs Verification").length;
  const showActionBanner = pendingVerifyCount > 0 && c.status !== "Active";
  const verifyHint =
    pendingVerifyCount > 0
      ? `Awaiting HR review of ${pendingVerifyCount} uploaded document${
          pendingVerifyCount === 1 ? "" : "s"
        } (e.g. TD1 tax forms) before the account can go Active.`
      : "The new hire has submitted their forms — HR verification is required before this account can be activated.";

  function cycleStatus(t: ChecklistTask) {
    const idx = STATUS_CYCLE.indexOf(t.status);
    void run(setTaskStatus(c!.id, t.id, STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]));
  }

  /** Assign an internal employee as owner of a department's task block. */
  function assignOwner(owner: TaskOwner, employeeName: string | null) {
    void run(setTaskAssignee(c!.id, owner, employeeName));
  }

  function applyUpload() {
    const tasks: ChecklistTask[] = uploadText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => {
        const m = line.match(/^(HR|Finance|IT|Manager)\s*[-:]\s*(.+)$/i);
        const owner: TaskOwner = m
          ? ((m[1].toUpperCase() === "IT" ? "IT / Ops" : titleCase(m[1])) as TaskOwner)
          : "HR";
        const label = m ? m[2] : line;
        return {
          id: `up_${Date.now()}_${i}`,
          label,
          owner,
          status: "Pending" as TaskStatus,
          blocking: /laptop|hardware|payroll|deposit|access/i.test(label),
          dataAccess: /deposit|payroll|bank/i.test(label) ? "banking" : "general",
        };
      });
    if (tasks.length) void run(setChecklist(c!.id, tasks));
    setShowUpload(false);
    setUploadText("");
  }

  function addTask() {
    if (!newTask.label.trim()) return;
    const t: ChecklistTask = {
      id: `man_${Date.now()}`,
      label: newTask.label.trim(),
      owner: newTask.owner,
      status: "Pending",
      blocking: newTask.blocking,
      dataAccess: newTask.access,
    };
    void run(setChecklist(c!.id, [...c!.checklist, t]));
    setNewTask({ label: "", owner: "HR", blocking: false, access: "general" });
  }

  function removeTask(id: string) {
    // Single-task delete (optimistic in the store) — a full-checklist replace
    // here used to duplicate tasks when two deletes raced each other.
    void run(deleteTask(c!.id, id));
  }

  function downloadDoc(doc: CaseDocument) {
    const cert = `${doc.name}
Document type: ${doc.type}
Filed to: ${doc.folder}
----------------------------------------
ELECTRONIC SIGNATURE CERTIFICATE (simulated)
Signed by:  ${doc.signedBy ?? "—"}
Signed at:  ${doc.signedAt ?? "—"}
IP address: ${doc.ip ?? "—"}
Status:     ${doc.status}
Policy:     ESIGN / PIPEDA compliant signing
`;
    const blob = new Blob([cert], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name.replace(/\.(pdf|jpg|png)$/i, ".txt");
    a.click();
    URL.revokeObjectURL(url);
  }

  const grouped = OWNERS.map((o) => ({ owner: o, tasks: c.checklist.filter((t) => t.owner === o) })).filter(
    (g) => g.tasks.length,
  );

  return (
    <div>
      <Link
        href="/admin/onboarding"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Onboarding
      </Link>

      {actionError && (
        <div className="mb-3 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{actionError}</div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={c.name} size={52} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{c.name}</h1>
            <p className="text-sm text-ink-muted">
              {c.title} · {c.department} · {provinceName(c.province)} · starts{" "}
              {formatDate(c.startDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-ink">{progress}%</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">Complete</p>
          </div>
          <span className="inline-flex items-center gap-1">
            <Badge tone={c.status === "Active" ? "green" : ready ? "brand" : "sky"}>
              {c.status}
            </Badge>
            {c.status === "Pending Verification" && <InfoTip text={verifyHint} />}
          </span>
          <button
            onClick={() => setShowAudit(true)}
            className="rounded-lg border border-line p-2 text-ink-muted hover:bg-canvas"
            title="Audit trail"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thick progress bar — a fast visual read of pipeline position. */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Onboarding progress
          </span>
          <span className="text-xs font-semibold text-ink-soft">{progress}% complete</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress === 100 ? "bg-emerald-500" : "bg-brand-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action Required — surface human-in-the-loop blockers up top so HR
          instantly sees why the account isn't Active. */}
      {showActionBanner && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Action Required: {pendingVerifyCount} document
              {pendingVerifyCount === 1 ? "" : "s"} require HR verification to activate this account.
            </p>
            <a
              href="#hr-verification"
              className="mt-0.5 inline-block text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Jump to verification →
            </a>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT column */}
        <div className="space-y-5 lg:col-span-8">
          {/* Checklist engine — one modern card per department. */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Onboarding Checklist</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Grouped by department — assign an owner to each block. Each owner sees only the data
                their tasks require (<span className="font-medium text-amber-600 dark:text-amber-300">banking</span> is
                visible to Finance &amp; HR, never IT).
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-canvas"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          </div>

          {grouped.map((g) => {
            const done = g.tasks.filter((t) => t.status === "Completed").length;
            const openBlockers = g.tasks.filter((t) => t.blocking && t.status !== "Completed").length;
            const isCollapsed = collapsed[g.owner] ?? false;
            return (
              <Card key={g.owner} className="card-pad">
                {/* Accordion header: department + progress + delegation */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setCollapsed((p) => ({ ...p, [g.owner]: !isCollapsed }))}
                    className="flex items-center gap-2"
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-ink-faint transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <Badge tone={ownerTone[g.owner]}>{g.owner}</Badge>
                    <span className="text-[11px] font-medium text-ink-faint">
                      {done}/{g.tasks.length} done
                    </span>
                    {openBlockers > 0 && <BlockingTag />}
                  </button>
                  <AssigneePicker
                    assignee={c.taskAssignees[g.owner] ?? null}
                    homeDept={OWNER_HOME_DEPT[g.owner]}
                    directory={directory}
                    onAssign={(name) => assignOwner(g.owner, name)}
                  />
                </div>

                {!isCollapsed && (
                  <div className="mt-3 space-y-1.5">
                    {g.tasks.map((t) => (
                      <div
                        key={t.id}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border px-3 py-2.5",
                          t.blocking && t.status !== "Completed"
                            ? "border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10"
                            : "border-line",
                        )}
                      >
                        <button onClick={() => cycleStatus(t)} title="Cycle status">
                          {t.status === "Completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                          ) : t.status === "In-Progress" ? (
                            <CircleDot className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-ink-faint" />
                          )}
                        </button>
                        {/* Blocking marker sits right beside the task name. */}
                        <div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                          {t.blocking && t.status !== "Completed" && <BlockingTag />}
                          <span
                            className={cn(
                              "text-sm",
                              t.status === "Completed"
                                ? "text-ink-muted line-through"
                                : "text-ink-soft",
                            )}
                          >
                            {t.label}
                          </span>
                        </div>
                        {t.dataAccess !== "general" && (
                          <Badge tone={accessTone[t.dataAccess]}>{t.dataAccess}</Badge>
                        )}
                        <TaskStatusPill status={t.status} />
                        <button
                          onClick={() => removeTask(t.id)}
                          className="text-ink-faint opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Add task */}
          <Card className="card-pad">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newTask.label}
                onChange={(e) => setNewTask({ ...newTask, label: e.target.value })}
                placeholder="Add a task…"
                className="h-9 flex-1 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-brand-300"
              />
              <select
                value={newTask.owner}
                onChange={(e) => setNewTask({ ...newTask, owner: e.target.value as TaskOwner })}
                className="h-9 rounded-lg border border-line bg-card px-2 text-sm"
              >
                {OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <select
                value={newTask.access}
                onChange={(e) => setNewTask({ ...newTask, access: e.target.value as DataAccess })}
                className="h-9 rounded-lg border border-line bg-card px-2 text-sm"
              >
                <option value="general">general</option>
                <option value="banking">banking</option>
                <option value="medical">medical</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={newTask.blocking}
                  onChange={(e) => setNewTask({ ...newTask, blocking: e.target.checked })}
                  className="h-4 w-4 accent-brand-500"
                />
                Blocking
              </label>
              <button
                onClick={addTask}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </Card>

          {/* Document verification queue */}
          <Card className="card-pad scroll-mt-6" id="hr-verification">
            <CardHeader title="Documents · HR Verification" />
            <p className="mt-1 text-xs text-ink-muted">
              Human-in-the-loop: identity &amp; banking documents must be verified by HR before the
              account can go Active. All files route to <code>02_Onboarding_and_Tax</code>.
            </p>
            {c.documents.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-line py-8 text-center text-sm text-ink-muted">
                The new hire hasn&apos;t submitted their forms yet.
              </div>
            ) : (
              <div className="mt-4 space-y-1.5">
                {c.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
                    <button onClick={() => setPreview(d)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-ink hover:text-brand-600 dark:hover:text-brand-300">{d.name}</p>
                      <p className="truncate text-[11px] text-ink-faint">
                        {d.type} · signed {d.signedAt}
                      </p>
                    </button>
                    {/* Uploaded file — download to verify its contents. */}
                    {d.hasFile && (
                      <a
                        href={`/api/onboarding/${c.id}/documents/${d.id}`}
                        title="Download uploaded file"
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    {d.status === "Verified" ? (
                      <Badge tone="green">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : d.status === "Pending" ? (
                      // Rejected — parked until the employee re-uploads (the
                      // rejection note is in the audit trail).
                      <Badge tone="red">
                        <XCircle className="h-3 w-3" /> Rejected — awaiting re-upload
                      </Badge>
                    ) : (
                      <>
                        <Badge tone="amber">Needs verification</Badge>
                        <button
                          onClick={() => {
                            setRejectNote("");
                            setRejecting(d);
                          }}
                          className="rounded-lg border border-red-200 dark:border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => run(verifyDocument(c.id, d.id))}
                          className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                        >
                          Verify
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT column */}
        <div className="space-y-5 lg:col-span-4">
          {/* Activation gate */}
          <Card className="card-pad">
            <CardHeader title="Activation gate" />
            <div className="mt-3 space-y-2.5">
              {gates.map((g, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {g.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <div>
                    <p className={cn("text-sm", g.ok ? "text-ink-soft" : "text-ink")}>{g.label}</p>
                    {!g.ok && g.detail && <p className="text-[11px] text-red-500 dark:text-red-400">{g.detail}</p>}
                  </div>
                </div>
              ))}
            </div>

            {c.status === "Active" ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" /> Account active — payroll &amp; SSO provisioned
              </div>
            ) : (
              <>
                <button
                  disabled={!ready}
                  onClick={() => run(activate(c.id))}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket className="h-4 w-4" /> Activate account
                </button>
                {!ready && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-muted">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                    Activation fires <code>onboarding.workflow.finished</code> → sets payroll status
                    Active and provisions SSO.
                  </p>
                )}
              </>
            )}
          </Card>

          {/* Standard new-hire form — submitted via the preboarding portal.
              SIN + bank account arrive MASKED from the API; HR never sees raw. */}
          <Card className="card-pad">
            <CardHeader title="New hire form" />
            {c.profile ? (
              <div className="mt-3 space-y-1.5 text-sm">
                {[
                  ["Legal name", `${c.profile.legalFirstName} ${c.profile.legalLastName}`],
                  ["Preferred name", c.profile.preferredName || "—"],
                  ["Date of birth", c.profile.dateOfBirth],
                  ["SIN", c.profile.sin],
                  ["Phone", c.profile.phone],
                  [
                    "Address",
                    `${c.profile.addressStreet}, ${c.profile.addressCity} ON ${c.profile.addressPostal}`,
                  ],
                  [
                    "Emergency contact",
                    `${c.profile.emergencyName} (${c.profile.emergencyRelationship}) · ${c.profile.emergencyPhone}`,
                  ],
                  [
                    "Work eligibility",
                    c.profile.workEligibility +
                      (c.profile.workPermitExpiry ? ` · expires ${c.profile.workPermitExpiry}` : ""),
                  ],
                  [
                    "Direct deposit",
                    `Inst ${c.profile.bankInstitution} · Transit ${c.profile.bankTransit} · Acct ${c.profile.bankAccount}`,
                  ],
                  ["Account holder", c.profile.bankAccountHolder ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="shrink-0 text-xs text-ink-faint">{label}</span>
                    <span className="text-right text-xs font-medium text-ink-soft">{value}</span>
                  </div>
                ))}
                <p className="mt-2 flex items-center gap-1 border-t border-line pt-2 text-[11px] text-ink-faint">
                  <ShieldCheck className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                  SIN and account number are masked — raw values never leave the database.
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-ink-muted">
                Not submitted yet — the new hire fills this in step 1 of preboarding, along with
                the TD1 &amp; TD1ON (2026) tax forms.
              </p>
            )}
          </Card>


          {/* Consent log */}
          <Card className="card-pad">
            <CardHeader title="Consent log · Law 25" />
            {c.consent.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No consent recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {c.consent.map((e, i) => (
                  <div key={i} className="rounded-xl bg-canvas px-3 py-2 text-xs">
                    <p className="font-semibold text-ink">
                      {e.policy} <span className="text-brand-600 dark:text-brand-400">{e.version}</span>
                    </p>
                    <p className="text-ink-faint">
                      {e.timestamp.replace("T", " ")} · IP {e.ip}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)} title="Upload existing checklist">
          <p className="text-sm text-ink-muted">
            Paste one task per line. Optionally prefix with an owner, e.g.{" "}
            <code>IT - Provision laptop</code>.
          </p>
          <textarea
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            rows={8}
            className="mt-3 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-brand-300"
            placeholder={"HR - Send welcome package\nFinance - Set up direct deposit\nIT - Provision laptop"}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowUpload(false)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-canvas">
              Cancel
            </button>
            <button onClick={applyUpload} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Import checklist
            </button>
          </div>
        </Modal>
      )}

      {/* Reject document modal — a note is required so the employee knows
          what to fix; it's recorded in the audit trail. */}
      {rejecting && (
        <Modal onClose={() => setRejecting(null)} title={`Reject "${rejecting.name}"`}>
          <p className="text-sm text-ink-muted">
            The document is sent back to the employee: it shows as{" "}
            <span className="font-semibold text-red-600 dark:text-red-300">Rejected</span> in their
            onboarding portal until they upload a corrected copy, and it keeps blocking
            activation.
          </p>
          <label className="field-label mt-4">Note to the employee *</label>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full rounded-xl border border-line bg-card p-3 text-sm outline-none focus:border-brand-300"
            placeholder="e.g. The TD1 is missing a signature on page 2 — please sign and re-upload."
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setRejecting(null)}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              disabled={!rejectNote.trim() || rejectBusy}
              onClick={() => {
                setRejectBusy(true);
                void run(rejectDocument(c.id, rejecting.id, rejectNote.trim())).finally(() => {
                  setRejectBusy(false);
                  setRejecting(null);
                });
              }}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rejectBusy ? "Rejecting…" : "Reject & notify employee"}
            </button>
          </div>
        </Modal>
      )}

      {/* Doc preview modal */}
      {preview && (
        <Modal onClose={() => setPreview(null)} title={preview.name}>
          <div className="rounded-xl border border-line bg-canvas p-4 text-sm">
            <div className="flex items-center gap-2 text-ink">
              <FileText className="h-4 w-4 text-brand-500 dark:text-brand-400" />
              <span className="font-semibold">{preview.type}</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs text-ink-soft">
              <Row k="Filed to" v={preview.folder} />
              <Row k="Signed by" v={preview.signedBy ?? "—"} />
              <Row k="Signed at" v={preview.signedAt ?? "—"} />
              <Row k="IP address" v={preview.ip ?? "—"} />
              <Row k="Status" v={preview.status} />
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-300">
              <Lock className="h-3.5 w-3.5" /> ESIGN / PIPEDA-compliant electronic signature
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => downloadDoc(preview)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </Modal>
      )}

      {/* Audit drawer */}
      {showAudit && (
        <Modal onClose={() => setShowAudit(false)} title="Immutable audit trail">
          <div className="space-y-2">
            {[...c.auditLog].reverse().map((e, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-canvas px-3 py-2 text-xs">
                <History className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                <div>
                  <p className="text-ink-soft">{e.event}</p>
                  <p className="text-ink-faint">{e.at.replace("T", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Small hover/focus tooltip used to clarify ambiguous status labels. */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={text}
        className="text-ink-faint transition hover:text-ink"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        // bg-ink flips light in dark mode, so the text must flip too —
        // text-canvas is its themed inverse (text-white went invisible).
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-[11px] font-medium leading-snug text-canvas opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-faint">{k}</dt>
      <dd className="font-medium text-ink">{v}</dd>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-card p-6 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
