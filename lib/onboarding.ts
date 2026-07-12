import type { ProvinceCode } from "./compliance";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CaseStatus =
  | "Invited" // profile created, invite link sent
  | "Forms In Progress" // employee has started the wizard
  | "Pending Verification" // employee finished; HR must verify
  | "Ready to Activate" // all gates green
  | "Active"; // account activated

export type TaskOwner = "HR" | "Finance" | "IT / Ops" | "Manager";
export type TaskStatus = "Pending" | "In-Progress" | "Completed";
export type DataAccess = "general" | "banking" | "medical";

export interface ChecklistTask {
  id: string;
  label: string;
  owner: TaskOwner;
  status: TaskStatus;
  blocking: boolean;
  dataAccess: DataAccess;
}

export type DocStatus = "Pending" | "Needs Verification" | "Verified";

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  folder: string;
  status: DocStatus;
  signedAt?: string;
  signedBy?: string;
  ip?: string;
  /** Set when the new hire uploaded a file (HR downloads it to verify). */
  mimeType?: string;
  size?: number;
  hasFile: boolean;
}

/** Whitelisted preboarding uploads — mirrors the backend's UPLOAD_KINDS map. */
export type UploadKind = "td1-federal" | "td1-ontario" | "benefits-enrollment" | "manual-acknowledgment";

/** The fixed stored-name prefix per kind (re-uploads replace; vault matches on it). */
export const UPLOAD_KIND_NAMES: Record<UploadKind, string> = {
  "td1-federal": "TD1 2026 — Federal (signed)",
  "td1-ontario": "TD1ON 2026 — Ontario (signed)",
  "benefits-enrollment": "Benefits Enrollment Form (completed)",
  "manual-acknowledgment": "Employee Manual Acknowledgment (signed)",
};

/** True when the case already has an upload of this kind. */
export function hasUpload(documents: CaseDocument[], kind: UploadKind): boolean {
  return documents.some((d) => d.name.startsWith(UPLOAD_KIND_NAMES[kind]) && d.hasFile);
}

export interface ConsentEntry {
  policy: string;
  version: string;
  timestamp: string;
  ip: string;
}

export interface FormFlags {
  personal: boolean;
  td1: boolean;
  directDeposit: boolean;
  benefits: boolean;
  handbook: boolean;
}

export type WorkEligibilityLabel = "Citizen" | "Permanent Resident" | "Work Permit" | "Study Permit";

/**
 * Standard new-hire form (Ontario). On reads the API masks SIN (••• ••• 123)
 * and bank account (••••1234) — the raw values never come back to the browser
 * after submission.
 */
export interface NewHireProfile {
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  dateOfBirth: string;
  /** Keep my birthday private — off team calendars/dashboards/announcements. */
  birthdayPrivate?: boolean;
  sin: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressPostal: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  workEligibility: WorkEligibilityLabel;
  workPermitExpiry?: string;
  bankInstitution: string;
  bankTransit: string;
  bankAccount: string;
  /** Must match the legal name — payroll deposits bounce otherwise. */
  bankAccountHolder: string;
  submittedAt?: string;
}

export type NewHireProfileInput = Omit<NewHireProfile, "submittedAt">;

export interface OnboardingCase {
  id: string;
  token: string;
  name: string;
  title: string;
  department: string;
  province: ProvinceCode;
  startDate: string;
  personalEmail: string;
  status: CaseStatus;
  createdAt: string;
  forms: FormFlags;
  /** Present once the new hire submits the standard form (SIN/bank masked). */
  profile?: NewHireProfile;
  /** Per-department task ownership, e.g. { "HR": "Sarah Mitchell" }. */
  taskAssignees: Partial<Record<TaskOwner, string>>;
  checklist: ChecklistTask[];
  documents: CaseDocument[];
  consent: ConsentEntry[];
  policiesAttached: string[];
  auditLog: { at: string; event: string }[];
}

/* ------------------------------------------------------------------ */
/* Provincial geofencing — mandatory policies & training              */
/* ------------------------------------------------------------------ */

export const PROVINCE_POLICIES: Record<string, string[]> = {
  ON: [
    "AODA Awareness Training",
    "Workplace Violence & Harassment Policy",
    "Health & Safety Awareness (Ontario)",
  ],
  BC: ["Bullying & Harassment (WorkSafeBC)", "OHS Orientation (BC)"],
  QC: ["French Language Rights (Charter)", "Law 25 Privacy Notice"],
  AB: ["OHS Orientation (Alberta)"],
  SK: ["OHS Orientation (Saskatchewan)"],
  MB: ["Workplace Safety & Health (Manitoba)"],
  NS: ["OHS Orientation (Nova Scotia)"],
  NB: ["OHS Orientation (New Brunswick)"],
};

export function mandatoryPolicies(province: ProvinceCode): string[] {
  return PROVINCE_POLICIES[province] ?? [];
}

/* ------------------------------------------------------------------ */
/* Checklist generation                                                */
/* ------------------------------------------------------------------ */

let tid = 0;
const mkTask = (
  label: string,
  owner: TaskOwner,
  blocking = false,
  dataAccess: DataAccess = "general",
): ChecklistTask => ({
  id: `t${++tid}_${Math.abs(hash(label + owner))}`,
  label,
  owner,
  status: "Pending",
  blocking,
  dataAccess,
});

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return h;
}

const DEPT_TASKS: Record<string, ChecklistTask[]> = {
  Engineering: [
    mkTask("Provision dev environment & GitHub access", "IT / Ops", true),
    mkTask("Assign engineering onboarding buddy", "Manager"),
  ],
  Sales: [
    mkTask("Grant CRM access & assign territory", "IT / Ops"),
    mkTask("Schedule product & pitch training", "Manager"),
  ],
  Design: [mkTask("Provision Figma & design tooling", "IT / Ops")],
  Finance: [mkTask("Grant ERP / ledger access", "IT / Ops", true, "banking")],
};

/**
 * "AI-generate" a department- and province-aware onboarding checklist.
 * Deterministic so the prototype renders predictably.
 */
export function generateChecklist(department: string, province: ProvinceCode): ChecklistTask[] {
  const base: ChecklistTask[] = [
    mkTask("Send benefits enrollment package", "HR"),
    mkTask("Collect signed handbook & policy acknowledgments", "HR"),
    mkTask("Set up payroll profile", "Finance", true, "banking"),
    mkTask("Verify direct deposit & void cheque", "Finance", true, "banking"),
    mkTask("Confirm TD1 federal + provincial", "Finance", false, "general"),
    mkTask("Create corporate email address", "IT / Ops"),
    mkTask("Provision laptop & hardware", "IT / Ops", true),
    mkTask("Grant SSO + core app access", "IT / Ops"),
    mkTask("Prepare first-week plan", "Manager"),
  ];
  // Province-mandatory training becomes HR tasks (auto-assigned, blocking).
  const training = mandatoryPolicies(province).map((p) =>
    mkTask(`Assign: ${p}`, "HR", true, "general"),
  );
  const deptExtra = DEPT_TASKS[department] ?? [];
  return [...base, ...training, ...deptExtra];
}

/* ------------------------------------------------------------------ */
/* Derived state & gating                                              */
/* ------------------------------------------------------------------ */

export function formProgress(forms: FormFlags): number {
  const vals = Object.values(forms);
  return Math.round((vals.filter(Boolean).length / vals.length) * 100);
}

export function checklistProgress(checklist: ChecklistTask[]): number {
  if (!checklist.length) return 0;
  const done = checklist.filter((t) => t.status === "Completed").length;
  return Math.round((done / checklist.length) * 100);
}

export function caseProgress(c: OnboardingCase): number {
  // Item-weighted, matching the backend pipeline() formula: every form,
  // checklist task and document counts once. (The old average-of-averages
  // let 5 forms outweigh a dozen tasks and ignored documents entirely.)
  const formVals = Object.values(c.forms);
  const done =
    formVals.filter(Boolean).length +
    c.checklist.filter((t) => t.status === "Completed").length +
    c.documents.filter((d) => d.status === "Verified").length;
  const total = formVals.length + c.checklist.length + c.documents.length;
  return total ? Math.round((done / total) * 100) : 0;
}

export interface Gate {
  ok: boolean;
  label: string;
  detail?: string;
}

/** The activation gates — every one must pass before an account goes Active. */
export function activationGates(c: OnboardingCase): Gate[] {
  const blockingTasks = c.checklist.filter((t) => t.blocking);
  const blockingDone = blockingTasks.filter((t) => t.status === "Completed");
  // "Pending" is the rejected/awaiting-re-upload state — it keeps the gate
  // closed just like a document HR hasn't reviewed yet (mirrors the backend).
  const unverified = c.documents.filter((d) => d.status !== "Verified");
  const formsDone = formProgress(c.forms) === 100;

  return [
    {
      ok: formsDone,
      label: "Employee completed all onboarding forms",
      detail: formsDone ? undefined : "Waiting on the new hire to finish the wizard.",
    },
    {
      ok: blockingTasks.length > 0 && blockingDone.length === blockingTasks.length,
      label: `Blocking checklist tasks complete (${blockingDone.length}/${blockingTasks.length})`,
      detail:
        blockingDone.length === blockingTasks.length
          ? undefined
          : blockingTasks
              .filter((t) => t.status !== "Completed")
              .map((t) => `[${t.owner}] ${t.label}`)
              .join(" · "),
    },
    {
      ok: unverified.length === 0,
      label: "All documents verified by HR (human-in-the-loop)",
      detail: unverified.length ? unverified.map((d) => d.name).join(", ") : undefined,
    },
    // Policy attachment is no longer an activation condition — policy
    // acknowledgment is handled by the employee's handbook consent step.
  ];
}

export function canActivate(c: OnboardingCase): boolean {
  return activationGates(c).every((g) => g.ok);
}

/** Derive the next status after a mutation (shared by the client store and server). */
export function nextStatus(c: OnboardingCase): CaseStatus {
  if (c.status === "Active" || c.status === "Invited") return c.status;
  const formsDone = Object.values(c.forms).every(Boolean);
  if (!formsDone) return "Forms In Progress";
  return canActivate(c) ? "Ready to Activate" : "Pending Verification";
}

/* ------------------------------------------------------------------ */
/* Documents generated when the employee submits the wizard            */
/* ------------------------------------------------------------------ */

export function generateSubmittedDocuments(c: OnboardingCase): CaseDocument[] {
  const today = c.startDate;
  const sign = (name: string, type: string, needsVerify = false): CaseDocument => ({
    id: `doc_${Math.abs(hash(name + c.id))}`,
    name,
    type,
    folder: "02_Onboarding_and_Tax",
    status: needsVerify ? "Needs Verification" : "Verified",
    signedAt: today,
    signedBy: c.name,
    ip: "203.0.113.42",
    hasFile: false,
  });
  return [
    sign("TD1 Federal 2026 (signed).pdf", "TD1 Form"),
    sign(`TD1 ${c.province} Provincial (signed).pdf`, "TD1 Form"),
    sign("New Hire Form (signed).pdf", "New Hire Form"),
    sign("Direct Deposit – Void Cheque.jpg", "Direct Deposit", true),
    sign("Benefits Election (signed).pdf", "Benefits"),
  ];
}

export const PRIVACY_POLICY_VERSION = "v2.4";

/* ------------------------------------------------------------------ */
/* Seed cases (so the pipeline is never empty)                         */
/* ------------------------------------------------------------------ */

export function seedCases(): OnboardingCase[] {
  const jordan: OnboardingCase = {
    id: "case_jordan",
    token: "inv_jordan_4821",
    name: "Jordan Henderson",
    title: "Senior Software Engineer",
    department: "Engineering",
    province: "ON",
    startDate: "2026-06-23",
    personalEmail: "jordan.h@personal.com",
    status: "Pending Verification",
    createdAt: "2026-06-05",
    forms: { personal: true, td1: true, directDeposit: true, benefits: true, handbook: true },
    checklist: [],
    documents: [],
    consent: [
      { policy: "Privacy Policy", version: PRIVACY_POLICY_VERSION, timestamp: "2026-06-08T14:22:00", ip: "203.0.113.42" },
    ],
    policiesAttached: ["AODA Awareness Training", "Workplace Violence & Harassment Policy"],
    taskAssignees: {},
    auditLog: [
      { at: "2026-06-05", event: "Profile created; invite emailed to personal address" },
      { at: "2026-06-08", event: "Employee submitted onboarding forms" },
    ],
  };
  jordan.checklist = generateChecklist("Engineering", "ON").map((t, i) => ({
    ...t,
    status: i < 6 ? "Completed" : i < 8 ? "In-Progress" : "Pending",
  }));
  jordan.documents = generateSubmittedDocuments(jordan);

  const sarah: OnboardingCase = {
    id: "case_sarah",
    token: "inv_sarah_2207",
    name: "Sarah Chen",
    title: "Product Designer",
    department: "Design",
    province: "BC",
    startDate: "2026-07-01",
    personalEmail: "sarah.c@personal.com",
    status: "Forms In Progress",
    createdAt: "2026-06-12",
    forms: { personal: true, td1: true, directDeposit: false, benefits: false, handbook: false },
    checklist: generateChecklist("Design", "BC").map((t, i) => ({
      ...t,
      status: i < 2 ? "Completed" : "Pending",
    })),
    documents: [],
    consent: [],
    policiesAttached: ["Bullying & Harassment (WorkSafeBC)"],
    taskAssignees: {},
    auditLog: [{ at: "2026-06-12", event: "Profile created; invite emailed to personal address" }],
  };

  return [jordan, sarah];
}
