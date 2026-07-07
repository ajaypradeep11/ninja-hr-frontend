// Frontend mirror of the backend recruitment domain types.
import type { ProvinceCode } from "@/lib/compliance";

export type EmploymentType = "Full-time" | "Part-time" | "Contractor";
export type RequisitionStatus = "Draft" | "Pending Approval" | "Approved" | "Published";
export type ApprovalDecision = "Pending" | "Approved" | "Rejected";
export type CandidateSource = "Careers Site" | "Indeed" | "LinkedIn";

export interface ApprovalEntry {
  id: string;
  approverId: string;
  approverName: string;
  approverTitle: string;
  decision: ApprovalDecision;
  comment?: string;
  decidedAt?: string;
}

export interface HiringTeamEntry {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  isPanelMember: boolean;
}

export interface PreScreenQuestionEntry {
  id: string;
  order: number;
  question: string;
  required: boolean;
}

/** One section of an interview guide (company template or per-req copy). */
export interface GuideSection {
  name: string;
  weight?: number;
  /** Guiding questions/prompts (newline-separated) shown to interviewers. */
  guidance?: string;
}

export interface ScorecardCriterionEntry {
  id: string;
  name: string;
  weight?: number;
  /** Guiding questions/prompts (newline-separated) shown to interviewers. */
  guidance?: string;
  order: number;
}

export interface RequisitionSummary {
  id: string;
  title: string;
  department: string;
  province: ProvinceCode;
  type: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  status: RequisitionStatus;
  applicants: number;
  openedDate: string;
  createdById?: string;
  createdByName?: string;
  slug?: string;
  archived: boolean;
  /** Admin-controlled Blind Hiring — non-HR viewers get scrubbed identities. */
  blindHiring: boolean;
  /** Candidates currently in the Interview stage (dashboard stat). */
  interviewsScheduled: number;
  /** Relationship of the requesting actor to this requisition (list views). */
  viewerIsHiringManager?: boolean;
  viewerOnHiringTeam?: boolean;
  viewerIsPanelMember?: boolean;
}

export interface RequisitionDetail extends RequisitionSummary {
  jd?: string;
  publishedAt?: string;
  rejectionFeedback?: string;
  costOfHire?: number;
  indeedEnabled: boolean;
  linkedinEnabled: boolean;
  indeedUrl?: string;
  linkedinUrl?: string;
  approvals: ApprovalEntry[];
  hiringTeam: HiringTeamEntry[];
  preScreenQuestions: PreScreenQuestionEntry[];
  scorecardCriteria: ScorecardCriterionEntry[];
}

export interface RequisitionCandidate {
  id: string;
  requisitionId?: string;
  name: string;
  role: string;
  stage: "Applied" | "AI Screened" | "Interview" | "Offer" | "Hired" | "Rejected";
  matchScore: number;
  appliedDate: string;
  interviewDate?: string;
  strengths: string[];
  gaps: string[];
  source: CandidateSource;
  withdrawn: boolean;
  anonymized: boolean;
}

export interface CreateRequisitionInput {
  title: string;
  department: string;
  province: ProvinceCode;
  type: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  jd?: string;
  approverIds: string[];
  hiringTeam: { employeeId: string; isPanelMember: boolean }[];
}

export interface PublishingInput {
  jd?: string;
  preScreenQuestions?: { question: string; required: boolean }[];
  indeedEnabled?: boolean;
  linkedinEnabled?: boolean;
  /** Admin-controlled Blind Hiring — scrubs candidate identity for non-HR viewers. */
  blindHiring?: boolean;
}

export const REQ_STATUS_FLOW: RequisitionStatus[] = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Published",
];

/* ----------------------------- Public careers ---------------------------- */

export interface JobPosting {
  slug: string;
  title: string;
  department: string;
  province: ProvinceCode;
  type: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  publishedAt?: string;
}

export interface JobPostingDetail extends JobPosting {
  jd: string;
  preScreenQuestions: PreScreenQuestionEntry[];
}

export interface ApplyFormInput {
  name: string;
  email: string;
  resumeText?: string;
  resumeFileBase64?: string;
  resumeFileName?: string;
  resumeMimeType?: string;
  consent: boolean;
  source?: CandidateSource;
  answers: { questionId: string; answer: string }[];
}

/* ---------------------------- Candidate portal --------------------------- */

export type PortalStatus =
  | "Application received"
  | "Under review"
  | "Interview stage"
  | "Offer extended"
  | "Hired"
  | "Process complete"
  | "Withdrawn";

export interface PortalView {
  candidateName: string;
  jobTitle: string;
  status: PortalStatus;
  appliedDate: string;
  withdrawn: boolean;
  communications: { subject: string; body: string; sentAt: string }[];
}

export const PORTAL_TIMELINE: PortalStatus[] = [
  "Application received",
  "Under review",
  "Interview stage",
  "Offer extended",
  "Hired",
];

/* ------------------------- Candidate management -------------------------- */

export interface CommunicationEntry {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  sentByName?: string;
  templateName?: string;
  visibleToCandidate: boolean;
  /** Two-way mailbox: Inbound = a reply from the candidate. */
  direction: "Outbound" | "Inbound";
  fromAddress?: string;
}

export type Recommendation = "Strong Yes" | "Yes" | "No" | "Strong No";

export interface ScorecardEntry {
  id: string;
  panelistId: string;
  panelistName: string;
  recommendation: Recommendation;
  overallNotes?: string;
  status: "Draft" | "Submitted";
  submittedAt: string;
  ratings: { criterionId: string; criterionName: string; rating: number; notes?: string }[];
}

export interface EvaluationSummary {
  submittedCount: number;
  draftCount: number;
  averageOverall: number | null;
  perCriterion: { criterionId: string; name: string; average: number; count: number }[];
  recommendationMix: { recommendation: Recommendation; count: number }[];
}

export interface ParsedResumeView {
  fileName?: string;
  /** Lets the UI decide whether the file can render inline (PDFs can). */
  mimeType?: string;
  parseStatus: "PENDING" | "PARSED" | "FAILED" | "SKIPPED";
  phone?: string;
  skills: string[];
  workHistory: { company: string; title: string; dates?: string }[];
  hasFile: boolean;
}


export interface CandidateNoteEntry {
  id: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface CandidateDetail extends RequisitionCandidate {
  email?: string;
  resumeText?: string;
  consentAt?: string;
  consentVersion?: string;
  answers: { question: string; answer: string }[];
  communications: CommunicationEntry[];
  scorecards: ScorecardEntry[];
  notes: CandidateNoteEntry[];
  resume?: ParsedResumeView;
  requisitionTitle?: string;
  scorecardCriteria: ScorecardCriterionEntry[];
  viewerIsPanelMember: boolean;
  /** Debrief gating: panelists unlock others' feedback only after submitting. */
  viewerHasSubmitted: boolean;
  /** True when this payload was scrubbed by admin-controlled Blind Hiring. */
  blind: boolean;
  evaluationSummary: EvaluationSummary;
  auditTrail: { event: string; detail?: string; at: string }[];
}

export type TemplateTrigger = "Application Received" | "Interview Scheduled" | "Rejected" | "Manual";

export interface CommunicationTemplateEntry {
  id: string;
  name: string;
  subject: string;
  body: string;
  trigger: TemplateTrigger;
  isDefault: boolean;
}

export const TEMPLATE_VARIABLES = ["candidate_name", "job_title", "company", "interview_date"] as const;

/* ------------------------------- Analytics ------------------------------- */

export interface RecruitmentAnalytics {
  funnel: { stage: RequisitionCandidate["stage"]; count: number }[];
  sources: { source: CandidateSource; count: number }[];
  applicantToInterview: { applicants: number; interviewed: number; ratioPct: number };
  timeToFill: { requisition: string; department: string; days: number }[];
  avgTimeToFillDays: number | null;
  costPerHire: { requisition: string; cost: number; hires: number; costPerHire: number }[];
  avgCostPerHire: number | null;
  byDepartment: { department: string; applicants: number; hired: number }[];
  withdrawnCount: number;
  evaluation: {
    avgInterviewScore: number | null;
    scorecardsSubmitted: number;
    candidatesScored: number;
    interviewedCandidates: number;
    recommendationMix: { recommendation: Recommendation; count: number }[];
  };
}
