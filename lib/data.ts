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
  /** Routing key: pending requests go to this department's manager. */
  department: string;
  type: "Vacation" | "Sick Leave" | "Personal" | "Parental" | "Bereavement" | "Overtime";
  start: string;
  end: string;
  status: "Pending" | "Approved" | "Denied";
  province: ProvinceCode;
  days: number;
  /** Partial-day request: hours taken on `start` (1–7). Undefined = full day(s). */
  hours?: number;
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
  count: number;
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
  due: string;
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
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export const employees: Employee[] = [
  {
    id: "e1",
    name: "Jordan Henderson",
    title: "Senior Software Engineer",
    department: "Engineering",
    province: "ON",
    email: "jordan.h@company.ca",
    hireDate: "2026-04-15",
    birthDate: "1991-10-02",
    manager: "Sarah Mitchell",
    status: "Pre-Hire",
    salary: 138000,
  },
  {
    id: "e2",
    name: "Sarah Chen",
    title: "Product Designer",
    department: "Design",
    province: "BC",
    email: "sarah.c@company.ca",
    hireDate: "2026-05-20",
    birthDate: "1994-06-22",
    manager: "Sarah Mitchell",
    status: "Pre-Hire",
    salary: 112000,
  },
  {
    id: "e3",
    name: "Michael Scott",
    title: "Regional Sales Manager",
    department: "Sales",
    province: "ON",
    email: "michael.s@company.ca",
    hireDate: "2021-03-24",
    birthDate: "1980-03-15",
    manager: "David Wallace",
    status: "Active",
    salary: 124000,
  },
  {
    id: "e4",
    name: "Angela Martin",
    title: "Senior Accountant",
    department: "Finance",
    province: "ON",
    email: "angela.m@company.ca",
    hireDate: "2019-04-27",
    birthDate: "1985-11-11",
    manager: "Oscar Nunez",
    status: "Active",
    salary: 98000,
  },
  {
    id: "e5",
    name: "Jim Scott",
    title: "Account Executive",
    department: "Sales",
    province: "BC",
    email: "jim.s@company.ca",
    hireDate: "2023-09-01",
    birthDate: "1990-05-06",
    manager: "Michael Scott",
    status: "Active",
    salary: 86000,
  },
  {
    id: "e6",
    name: "Kelly Baker",
    title: "Marketing Specialist",
    department: "Marketing",
    province: "QC",
    email: "kelly.b@company.ca",
    hireDate: "2024-01-15",
    birthDate: "1996-09-19",
    manager: "Sarah Mitchell",
    status: "Active",
    salary: 72000,
  },
  {
    id: "e7",
    name: "Pam Beesly",
    title: "Office Coordinator",
    department: "Operations",
    province: "ON",
    email: "pam.b@company.ca",
    hireDate: "2022-06-10",
    birthDate: "1993-03-25",
    manager: "Angela Martin",
    status: "On Statutory Leave",
    salary: 64000,
  },
  {
    id: "e8",
    name: "Stanley Hudson",
    title: "Senior Sales Rep",
    department: "Sales",
    province: "ON",
    email: "stanley.h@company.ca",
    hireDate: "2014-02-03",
    birthDate: "1958-02-19",
    manager: "Michael Scott",
    status: "Offboarding",
    salary: 91000,
  },
  {
    id: "e9",
    name: "Dwight Schrute",
    title: "Assistant Regional Manager",
    department: "Sales",
    province: "SK",
    email: "dwight.s@company.ca",
    hireDate: "2011-08-16",
    birthDate: "1978-01-20",
    manager: "Michael Scott",
    status: "Active",
    salary: 104000,
  },
  {
    id: "e10",
    name: "Holly Flax",
    title: "HR Business Partner",
    department: "People",
    province: "BC",
    email: "holly.f@company.ca",
    hireDate: "2020-11-02",
    birthDate: "1982-07-30",
    manager: "Sarah Mitchell",
    status: "Active",
    salary: 95000,
  },
];

export const currentUser = {
  name: "Sarah Mitchell",
  firstName: "Sarah",
  role: "HR Admin",
  title: "Director of People Operations",
};

export const onboardingPipeline: OnboardingHire[] = [
  { id: "o1", name: "Jordan Henderson", title: "Senior Software Engineer · Starts in 4 days", startsInDays: 4, progress: 86 },
  { id: "o2", name: "Sarah Chen", title: "Product Designer · Starts in 12 days", startsInDays: 12, progress: 41 },
  { id: "o3", name: "Marcus Webb", title: "Data Analyst · Starts in 21 days", startsInDays: 21, progress: 18 },
];

export const upcomingEvents: UpcomingEvent[] = [
  { id: "u1", date: "2026-06-24", title: "Probation Review", subtitle: "Michael Scott · 2:00 PM", kind: "probation" },
  { id: "u2", date: "2026-06-27", title: "Work Anniversary", subtitle: "Angela Martin · 7 years", kind: "anniversary" },
  { id: "u3", date: "2026-07-02", title: "LTD Policy Review", subtitle: "Compliance check", kind: "policy" },
  { id: "u4", date: "2026-07-06", title: "Birthday", subtitle: "Kelly Baker", kind: "birthday" },
];

export const salaryBenchmarks: SalaryBenchmark[] = [
  { role: "Fullstack Engineer", low: 143000, high: 161000, current: 138000 },
  { role: "HR Director", low: 110000, high: 135000, current: 128000 },
  { role: "Sales Account Exec", low: 78000, high: 120000, current: 86000 },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "l1", employee: "Jim Scott", department: "Sales", type: "Vacation", start: "2026-06-18", end: "2026-06-22", status: "Pending", province: "BC", days: 3 },
  { id: "l2", employee: "Kelly Baker", department: "Marketing", type: "Sick Leave", start: "2026-06-20", end: "2026-06-21", status: "Pending", province: "QC", days: 2 },
  { id: "l3", employee: "Dwight Schrute", department: "Sales", type: "Personal", start: "2026-07-01", end: "2026-07-01", status: "Pending", province: "SK", days: 1 },
  { id: "l4", employee: "Angela Martin", department: "Finance", type: "Vacation", start: "2026-07-14", end: "2026-07-25", status: "Approved", province: "ON", days: 9 },
  { id: "l5", employee: "Pam Beesly", department: "Design", type: "Parental", start: "2026-05-01", end: "2026-12-01", status: "Approved", province: "ON", days: 154 },
];

// NOTE: static leave balances were removed — balances are now DERIVED from the
// actor's approved requests via lib/leave-balances.ts (computeLeaveBalances),
// so cards, the Leave page and the assistant always agree with the history.

export const offboardingTasks: OffboardingTask[] = [
  { id: "f1", label: "Exit interview", owner: "Manager", status: "Completed", blocking: false },
  { id: "f2", label: "Knowledge transfer & client handoff", owner: "Manager", status: "In-Progress", blocking: false },
  { id: "f3", label: "Recover laptop / hardware", owner: "IT / Ops", status: "Pending", blocking: true },
  { id: "f4", label: "Revoke software licenses & access", owner: "IT / Ops", status: "In-Progress", blocking: false },
  { id: "f5", label: "Final pay calculation", owner: "HR / Payroll", status: "In-Progress", blocking: false },
  { id: "f6", label: "Generate Record of Employment (ROE)", owner: "HR / Payroll", status: "Pending", blocking: false },
  { id: "f7", label: "Sign separation release form", owner: "HR / Payroll", status: "Pending", blocking: true },
];

export const offboardingEmployee = {
  name: "Stanley Hudson",
  title: "Senior Sales Rep",
  lastDay: "2026-06-30",
  template: "Sales Team Offboarding",
};

export const candidates: Candidate[] = [
  { id: "c1", name: "Priya Sharma", role: "Senior Software Engineer", stage: "Interview", matchScore: 92, appliedDate: "2026-05-02", interviewDate: "2026-05-10", strengths: ["6 years of TypeScript", "Led a team of 4", "AWS certified"], gaps: ["No fintech domain"] },
  { id: "c2", name: "Liam O'Brien", role: "Senior Software Engineer", stage: "AI Screened", matchScore: 85, appliedDate: "2026-05-05", strengths: ["5 years of Python", "Strong system design"], gaps: ["No AWS Cloud experience"] },
  { id: "c3", name: "Fatima Noor", role: "Product Designer", stage: "Offer", matchScore: 89, appliedDate: "2026-04-20", interviewDate: "2026-04-29", strengths: ["Design systems lead", "B2B SaaS portfolio"], gaps: ["Limited motion design"] },
  { id: "c4", name: "Chen Wei", role: "Senior Software Engineer", stage: "Applied", matchScore: 71, appliedDate: "2026-05-12", strengths: ["Full-stack generalist"], gaps: ["Junior seniority", "No team lead experience"] },
  { id: "c5", name: "Aisha Mohammed", role: "Data Analyst", stage: "AI Screened", matchScore: 78, appliedDate: "2026-05-08", strengths: ["SQL & dbt", "Looker dashboards"], gaps: ["No Python ML"] },
  { id: "c6", name: "Tom Becker", role: "Product Designer", stage: "Applied", matchScore: 64, appliedDate: "2026-05-14", strengths: ["Strong visual design"], gaps: ["No product thinking examples"] },
  { id: "c7", name: "Grace Kim", role: "Senior Software Engineer", stage: "Hired", matchScore: 95, appliedDate: "2026-03-30", interviewDate: "2026-04-08", strengths: ["Staff-level experience", "Open-source maintainer"], gaps: [] },
];

export const requisitions: Requisition[] = [
  { id: "r1", title: "Senior Software Engineer", department: "Engineering", province: "ON", type: "Full-time", salaryMin: 130000, salaryMax: 165000, status: "Published", applicants: 48, openedDate: "2026-05-01" },
  { id: "r2", title: "Product Designer", department: "Design", province: "BC", type: "Full-time", salaryMin: 100000, salaryMax: 130000, status: "Published", applicants: 31, openedDate: "2026-04-18" },
  { id: "r3", title: "Data Analyst", department: "Data", province: "ON", type: "Full-time", salaryMin: 85000, salaryMax: 110000, status: "Pending Approval", applicants: 0, openedDate: "2026-06-10" },
  { id: "r4", title: "Customer Success Lead", department: "CX", province: "AB", type: "Full-time", salaryMin: 90000, salaryMax: 115000, status: "Draft", applicants: 0, openedDate: "2026-06-15" },
];

export const docFolders: DocFolder[] = [
  { id: "d1", name: "01_Recruitment", count: 6 },
  { id: "d2", name: "02_Onboarding_and_Tax", count: 9 },
  { id: "d3", name: "03_Compliance_and_Training", count: 5 },
  { id: "d4", name: "04_Performance_and_PIPs", count: 4, restricted: true },
  { id: "d5", name: "05_Leaves_and_Medical", count: 3, restricted: true, managerBlocked: true },
  { id: "d6", name: "06_Offboarding", count: 2 },
];

export const vaultDocuments: VaultDocument[] = [
  { id: "v1", name: "Offer Letter – Signed.pdf", folder: "02_Onboarding_and_Tax", type: "Offer Letter", uploaded: "2026-04-10", access: "Employee" },
  { id: "v2", name: "TD1 Federal 2026.pdf", folder: "02_Onboarding_and_Tax", type: "TD1 Form", uploaded: "2026-04-12", access: "HR Admin" },
  { id: "v3", name: "Direct Deposit – Void Cheque.jpg", folder: "02_Onboarding_and_Tax", type: "Direct Deposit", uploaded: "2026-04-12", access: "HR Admin" },
  { id: "v4", name: "Resume – J. Henderson.pdf", folder: "01_Recruitment", type: "Resume", uploaded: "2026-03-22", access: "HR Admin" },
  { id: "v5", name: "AODA Certificate.pdf", folder: "03_Compliance_and_Training", type: "Certificate", uploaded: "2026-05-01", access: "Employee" },
  { id: "v6", name: "Accommodation Request.pdf", folder: "05_Leaves_and_Medical", type: "Medical", uploaded: "2026-05-18", access: "HR Admin" },
  { id: "v7", name: "2025 Annual Appraisal.pdf", folder: "04_Performance_and_PIPs", type: "Appraisal", uploaded: "2025-12-15", access: "Manager" },
];

export const performanceReviews: PerformanceReview[] = [
  { id: "p1", employee: "Jim Scott", cycle: "90-Day Probationary", state: "Manager-Evaluation", due: "2026-06-25" },
  { id: "p2", employee: "Angela Martin", cycle: "Annual 2026", state: "Self-Evaluation", due: "2026-07-10" },
  { id: "p3", employee: "Dwight Schrute", cycle: "Annual 2026", state: "Calibrated", score: 4.2, due: "2026-07-10" },
  { id: "p4", employee: "Kelly Baker", cycle: "Annual 2026", state: "Completed", score: 3.8, due: "2026-06-01" },
  { id: "p5", employee: "Holly Flax", cycle: "Annual 2026", state: "Draft", due: "2026-07-10" },
];

export const pips: Pip[] = [
  { id: "pip1", employee: "Tom Becker", manager: "Sarah Mitchell", durationDays: 60, state: "Active", signedByManager: true, signedByEmployee: true, startDate: "2026-05-20" },
  { id: "pip2", employee: "Chen Wei", manager: "Michael Scott", durationDays: 45, state: "Draft", signedByManager: false, signedByEmployee: false, startDate: "2026-06-20" },
];

export const agentRuns: AgentRun[] = [
  { id: "a1", intent: "Audit Ontario job postings for Bill 149 salary requirements", status: "Running", progress: 45, affected: 3, summary: "Scanning 12 active ON requisitions for salary range + AI disclosure compliance.", time: "2 min ago" },
  { id: "a2", intent: "Purge rejected candidate files past 24-month Law 25 window", status: "Awaiting Approval", progress: 100, affected: 3, summary: "Identified 3 rejected candidate profiles exceeding the 24-month retention window.", time: "8 min ago" },
  { id: "a3", intent: "Draft BC vacation accrual policy update to new statutory floor", status: "Awaiting Approval", progress: 100, affected: 2, summary: "Detected BC ESA update. Drafted accrual policy change for 2 affected employees.", time: "1 hr ago" },
  { id: "a4", intent: "Generate offboarding checklist for Stanley Hudson + alert manager", status: "Completed", progress: 100, affected: 1, summary: "Created Sales Team Offboarding checklist, assigned 7 tasks, notified Michael Scott.", time: "Yesterday" },
];

export const complianceScore = {
  overall: 88,
  breakdown: [
    { label: "Bill 149 job postings", value: 92, tone: "ok" as const },
    { label: "ROE deadlines (5-day ESA)", value: 100, tone: "ok" as const },
    { label: "Mandatory training (AODA/WHMIS)", value: 74, tone: "warn" as const },
    { label: "Law 25 retention hygiene", value: 81, tone: "warn" as const },
  ],
};

export const headcountByDept = [
  { dept: "Engineering", count: 14 },
  { dept: "Sales", count: 11 },
  { dept: "Design", count: 6 },
  { dept: "Finance", count: 5 },
  { dept: "Marketing", count: 4 },
  { dept: "People", count: 3 },
  { dept: "Operations", count: 2 },
];

export const onboardingForms = ["TD1 Federal", "TD1 Provincial", "New Hire Form", "Direct Deposit"];
