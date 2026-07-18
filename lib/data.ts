import type { ProvinceCode } from "./compliance";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type EmployeeStatus =
  | "Active"
  | "Pre-Hire"
  | "On Statutory Leave"
  | "Offboarding"
  | "Terminated";

export interface Employee {
  id: string;
  name: string;
  title: string;
  department: string;
  province: ProvinceCode;
  email: string;
  hireDate: string; // ISO
  /** ISO — blank when the employee keeps their birthday private (non-HR views). */
  birthDate: string;
  birthdayPrivate?: boolean;
  manager?: string;
  status: EmployeeStatus;
  salary: number;
  avatar?: string; // optional image url
  employeeNumber?: string;
}

export interface OnboardingHire {
  id: string;
  name: string;
  title: string;
  startsInDays: number;
  progress: number; // 0-100
}

export interface UpcomingEvent {
  id: string;
  date: string; // ISO
  title: string;
  subtitle: string;
  kind: "probation" | "anniversary" | "policy" | "birthday";
}

export interface SalaryBenchmark {
  role: string;
  low: number;
  high: number;
  current: number;
}

export interface LeaveRequest {
  id: string;
  employee: string;
  /** Display/search only — approval routing is by reporting line (managerId), not department. */
  department: string;
  type: "Vacation" | "Sick Leave" | "Personal" | "Parental" | "Bereavement" | "Overtime";
  start: string;
  end: string;
  status: "Pending" | "Approved" | "Denied";
  province: ProvinceCode;
  days: number;
  /** Partial-day request: hours taken on `start` (1–7). Undefined = full day(s). */
  hours?: number;
  /** Free-text note the employee submitted with the request. Undefined when none. */
  note?: string;
}

export interface LeaveBalance {
  type: string;
  available: number;
  used: number;
  unit: "days";
  tone: "brand" | "sky" | "amber";
}

// Company-created training course (catalog). Per-employee state lives on the
// TrainingAssignment (see lib/training.ts).
export interface TrainingCourse {
  id: string;
  title: string;
  category: string;
  description?: string;
  contentUrl?: string;
  durationMins?: number;
  passMark?: number;
  active: boolean;
  // Peer-created courses flow Draft → Pending HR Approval → Published/Rejected;
  // HR catalog entries are born Published.
  status?: "Draft" | "Pending HR Approval" | "Published" | "Rejected";
  createdById?: string;
  creatorName?: string;
  assignedCount?: number;
  completedCount?: number;
  // True when an uploaded material file is attached (opens via
  // /api/training/[id]/material); materialFileName is its original name.
  hasMaterial?: boolean;
  materialFileName?: string;
}

/** What an employee may set on their own peer-created course. */
export interface PeerCourseInput {
  title: string;
  category: string;
  description?: string;
  contentUrl?: string;
  durationMins?: number;
}

export interface OffboardingTask {
  id: string;
  label: string;
  owner: "Manager" | "IT / Ops" | "HR / Payroll";
  status: "Pending" | "In-Progress" | "Completed";
  blocking: boolean;
  /** Internal employee delegated to own this department's tasks. */
  assignee?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  stage: "Applied" | "AI Screened" | "Interview" | "Offer" | "Hired" | "Rejected";
  matchScore: number;
  appliedDate: string;
  interviewDate?: string;
  strengths: string[];
  gaps: string[];
}

export interface Requisition {
  id: string;
  title: string;
  department: string;
  province: ProvinceCode;
  type: "Full-time" | "Part-time" | "Contractor";
  salaryMin: number;
  salaryMax: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Published";
  applicants: number;
  openedDate: string;
  archived?: boolean;
}

export interface DocFolder {
  id: string;
  name: string;
  restricted?: boolean;
  managerBlocked?: boolean;
}

export interface VaultDocument {
  id: string;
  name: string;
  folder: string;
  type: string;
  uploaded: string;
  access: "Employee" | "Manager" | "HR Admin" | "Super Admin";
  /** True when the vault row stores the actual file (viewable via /api/vault/[id]). */
  hasFile?: boolean;
  size?: number | null;
}

export interface PerformanceReview {
  id: string;
  employee: string;
  cycle: string;
  state:
    | "Draft"
    | "Self-Evaluation"
    | "Manager-Evaluation"
    | "Calibrated"
    | "Completed";
  score?: number;
  /** Employee self-assessment. Undefined until written (or hidden by visibility gating). */
  selfEvaluation?: string;
  /** Manager's written assessment. Undefined until written (or hidden by visibility gating). */
  managerEvaluation?: string;
  /** ISO datetime when the employee submitted their self-assessment. */
  selfSubmittedAt?: string;
  /** ISO datetime when the assigned manager submitted their evaluation. */
  managerSubmittedAt?: string;
  /** ISO datetime when the employee acknowledged the completed review. */
  acknowledgedAt?: string;
  due: string;
}

/** Actor-scoped review surface: own reviews + direct reports' reviews. */
export interface MyReviews {
  mine: PerformanceReview[];
  reports: PerformanceReview[];
}

export interface Pip {
  id: string;
  employee: string;
  manager: string;
  durationDays: number;
  state: "Draft" | "Active" | "Completed";
  signedByManager: boolean;
  signedByEmployee: boolean;
  startDate: string;
}

export interface AgentRun {
  id: string;
  intent: string;
  status: "Running" | "Awaiting Approval" | "Completed";
  progress: number;
  affected: number;
  summary: string;
  time: string;
  items: AgentRunItem[];
}

export interface AgentRunItem {
  id: string; employeeId: string; status: "Pending" | "Issued" | "Failed";
  payload: { employeeName: string; documentName: string; body: string; mode: "save" | "signature"; aiPersonalized: boolean; error?: string; vaultDocumentId?: string };
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */
// All demo/stub records (fake employees, events, reviews, candidates, etc.)
// were removed — every page now renders live backend data or an honest empty
// state. Only structural product config lives below.

/** Document vault folder taxonomy — structure/RBAC config, not data.
 *  Folder contents come from the backend vault (getVaultDocuments). */
export const docFolders: DocFolder[] = [
  { id: "d1", name: "01_Recruitment" },
  { id: "d2", name: "02_Onboarding_and_Tax" },
  { id: "d3", name: "03_Compliance_and_Training" },
  { id: "d4", name: "04_Performance_and_PIPs", restricted: true },
  { id: "d5", name: "05_Leaves_and_Medical", restricted: true, managerBlocked: true },
  { id: "d6", name: "06_Offboarding" },
];

/** Standard Canadian onboarding forms sent to every new hire. */
export const onboardingForms = ["TD1 Federal", "TD1 Provincial", "New Hire Form", "Direct Deposit"];
