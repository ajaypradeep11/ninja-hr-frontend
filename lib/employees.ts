// Frontend HRIS types (mirror backend people domain).
import type { ProvinceCode } from "@/lib/compliance";

export type EmployeeStatus =
  | "Active"
  | "Pre-Hire"
  | "On Statutory Leave"
  | "Offboarding"
  | "Terminated";
export type EmploymentType = "Full-time" | "Part-time" | "Contractor";
export type PayFrequency = "Weekly" | "Bi-weekly" | "Semi-monthly" | "Monthly";
export type WorkEligibility = "Citizen" | "Permanent Resident" | "Work Permit" | "Study Permit";

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  altPhone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface EmployeeDocumentRef {
  id: string;
  name: string;
  type: string;
  folder: string;
  uploaded: string;
  /** True when the vault row stores the actual file (viewable via /api/vault/[id]). */
  hasFile?: boolean;
}

export interface EmployeeDetail {
  id: string;
  name: string;
  title: string;
  department: string;
  province: ProvinceCode;
  email: string;
  hireDate: string;
  birthDate: string;
  birthdayPrivate?: boolean;
  manager?: string;
  status: EmployeeStatus;
  salary: number;
  employeeNumber?: string;
  preferredName?: string;
  pronouns?: string;
  personalEmail?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressProvince?: ProvinceCode;
  addressPostal?: string;
  employmentType?: EmploymentType;
  workLocation?: string;
  payFrequency?: PayFrequency;
  workEligibility?: WorkEligibility;
  workPermitExpiry?: string;
  td1FederalOnFile: boolean;
  td1ProvincialOnFile: boolean;
  sinMasked?: string;
  hasSin: boolean;
  bankInstitution?: string;
  bankTransit?: string;
  bankAccountMasked?: string;
  hasBanking: boolean;
  emergencyContacts: EmergencyContact[];
  documents: EmployeeDocumentRef[];
}

export type UpdateEmployeeInput = Partial<{
  birthdayPrivate: boolean;
  name: string;
  hireDate: string;
  birthDate: string;
  title: string;
  department: string;
  manager: string;
  status: EmployeeStatus;
  salary: number;
  employeeNumber: string;
  preferredName: string;
  pronouns: string;
  personalEmail: string;
  phone: string;
  addressStreet: string;
  addressCity: string;
  addressProvince: string;
  addressPostal: string;
  employmentType: EmploymentType;
  workLocation: string;
  payFrequency: PayFrequency;
  workEligibility: WorkEligibility;
  workPermitExpiry: string;
  td1FederalOnFile: boolean;
  td1ProvincialOnFile: boolean;
  sin: string;
  bankInstitution: string;
  bankTransit: string;
  bankAccount: string;
}>;

export interface EmergencyContactInput {
  name: string;
  relationship: string;
  phone: string;
  altPhone?: string;
  email?: string;
  isPrimary?: boolean;
}

export const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contractor"];
export const PAY_FREQUENCIES: PayFrequency[] = ["Weekly", "Bi-weekly", "Semi-monthly", "Monthly"];
export const WORK_ELIGIBILITY: WorkEligibility[] = [
  "Citizen",
  "Permanent Resident",
  "Work Permit",
  "Study Permit",
];
export const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  "Active",
  "Pre-Hire",
  "On Statutory Leave",
  "Offboarding",
  "Terminated",
];
