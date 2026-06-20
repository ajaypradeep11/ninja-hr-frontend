/**
 * Bidirectional mapping between the app's human-readable string literals
 * (e.g. "IT / Ops", "Needs Verification") and the Postgres enum values
 * (e.g. "IT_OPS", "NEEDS_VERIFICATION").
 */
import type {
  CaseStatus,
  TaskOwner,
  TaskStatus,
  DataAccess,
  DocStatus,
} from "./onboarding";
import type {
  EmployeeStatus,
  LeaveRequest,
  Requisition,
  Candidate,
  PerformanceReview,
  Pip,
  OffboardingTask,
  BenefitsCarrier,
  AgentRun,
  VaultDocument,
} from "./data";

function invert<K extends string, V extends string>(m: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>;
}

/* Employee status */
export const empStatusToDb = {
  Active: "ACTIVE",
  "Pre-Hire": "PRE_HIRE",
  "On Statutory Leave": "ON_STATUTORY_LEAVE",
  Offboarding: "OFFBOARDING",
  Terminated: "TERMINATED",
} satisfies Record<EmployeeStatus, string>;
export const empStatusFromDb = invert(empStatusToDb);

/* Case status */
export const caseStatusToDb = {
  Invited: "INVITED",
  "Forms In Progress": "FORMS_IN_PROGRESS",
  "Pending Verification": "PENDING_VERIFICATION",
  "Ready to Activate": "READY_TO_ACTIVATE",
  Active: "ACTIVE",
} satisfies Record<CaseStatus, string>;
export const caseStatusFromDb = invert(caseStatusToDb);

/* Task owner */
export const ownerToDb = {
  HR: "HR",
  Finance: "FINANCE",
  "IT / Ops": "IT_OPS",
  Manager: "MANAGER",
} satisfies Record<TaskOwner, string>;
export const ownerFromDb = invert(ownerToDb);

/* Task status */
export const taskStatusToDb = {
  Pending: "PENDING",
  "In-Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
} satisfies Record<TaskStatus, string>;
export const taskStatusFromDb = invert(taskStatusToDb);

/* Data access */
export const accessToDb = {
  general: "GENERAL",
  banking: "BANKING",
  medical: "MEDICAL",
} satisfies Record<DataAccess, string>;
export const accessFromDb = invert(accessToDb);

/* Document status */
export const docStatusToDb = {
  Pending: "PENDING",
  "Needs Verification": "NEEDS_VERIFICATION",
  Verified: "VERIFIED",
} satisfies Record<DocStatus, string>;
export const docStatusFromDb = invert(docStatusToDb);

/* Leave type */
export const leaveTypeToDb = {
  Vacation: "VACATION",
  "Sick Leave": "SICK",
  Personal: "PERSONAL",
  Parental: "PARENTAL",
  Bereavement: "BEREAVEMENT",
} satisfies Record<LeaveRequest["type"], string>;
export const leaveTypeFromDb = invert(leaveTypeToDb);

/* Leave status */
export const leaveStatusToDb = {
  Pending: "PENDING",
  Approved: "APPROVED",
  Denied: "DENIED",
} satisfies Record<LeaveRequest["status"], string>;
export const leaveStatusFromDb = invert(leaveStatusToDb);

/* Employment type */
export const employmentTypeToDb = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Contractor: "CONTRACTOR",
} satisfies Record<Requisition["type"], string>;
export const employmentTypeFromDb = invert(employmentTypeToDb);

/* Requisition status */
export const reqStatusToDb = {
  Draft: "DRAFT",
  "Pending Approval": "PENDING_APPROVAL",
  Approved: "APPROVED",
  Published: "PUBLISHED",
} satisfies Record<Requisition["status"], string>;
export const reqStatusFromDb = invert(reqStatusToDb);

/* Candidate stage */
export const candidateStageToDb = {
  Applied: "APPLIED",
  "AI Screened": "AI_SCREENED",
  Interview: "INTERVIEW",
  Offer: "OFFER",
  Hired: "HIRED",
  Rejected: "REJECTED",
} satisfies Record<Candidate["stage"], string>;
export const candidateStageFromDb = invert(candidateStageToDb);

/* Review state */
export const reviewStateToDb = {
  Draft: "DRAFT",
  "Self-Evaluation": "SELF_EVALUATION",
  "Manager-Evaluation": "MANAGER_EVALUATION",
  Calibrated: "CALIBRATED",
  Completed: "COMPLETED",
} satisfies Record<PerformanceReview["state"], string>;
export const reviewStateFromDb = invert(reviewStateToDb);

/* PIP state */
export const pipStateToDb = {
  Draft: "DRAFT",
  Active: "ACTIVE",
  Completed: "COMPLETED",
} satisfies Record<Pip["state"], string>;
export const pipStateFromDb = invert(pipStateToDb);

/* Offboarding owner */
export const offboardingOwnerToDb = {
  Manager: "MANAGER",
  "IT / Ops": "IT_OPS",
  "HR / Payroll": "HR_PAYROLL",
} satisfies Record<OffboardingTask["owner"], string>;
export const offboardingOwnerFromDb = invert(offboardingOwnerToDb);

/* Carrier status */
export const carrierStatusToDb = {
  Connected: "CONNECTED",
  "File-based": "FILE_BASED",
  "Not connected": "NOT_CONNECTED",
} satisfies Record<BenefitsCarrier["status"], string>;
export const carrierStatusFromDb = invert(carrierStatusToDb);

/* Carrier method */
export const carrierMethodToDb = {
  API: "API",
  "CSV / SFTP": "CSV_SFTP",
} satisfies Record<BenefitsCarrier["method"], string>;
export const carrierMethodFromDb = invert(carrierMethodToDb);

/* Agent status */
export const agentStatusToDb = {
  Running: "RUNNING",
  "Awaiting Approval": "AWAITING_APPROVAL",
  Completed: "COMPLETED",
} satisfies Record<AgentRun["status"], string>;
export const agentStatusFromDb = invert(agentStatusToDb);

/* Document access level */
export const docAccessToDb = {
  Employee: "EMPLOYEE",
  Manager: "MANAGER",
  "HR Admin": "HR_ADMIN",
  "Super Admin": "SUPER_ADMIN",
} satisfies Record<VaultDocument["access"], string>;
export const docAccessFromDb = invert(docAccessToDb);
