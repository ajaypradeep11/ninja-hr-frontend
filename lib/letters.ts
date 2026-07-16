// Letter Lab types + template variable definitions.

export interface LetterTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  updatedAt: string;
}

export interface LetterTemplateInput {
  name: string;
  category: string;
  body: string;
}

export interface DraftLetterResult { text: string; live: boolean; blockedCategory?: string }
export type MassCohort =
  | { type: "all" }
  | { type: "department"; value: string }
  | { type: "province"; value: string }
  | { type: "manual"; employeeIds: string[] };
export interface MassLetterInput {
  templateId: string; cohort: MassCohort; mode: "save" | "signature";
  personalizeWithAi?: boolean; instructions?: string;
}
export interface MassLetterResult { runId: string; affected: number }

export const LETTER_CATEGORIES = [
  "Offer",
  "Probation",
  "Promotion",
  "Termination",
  "Custom",
] as const;

/** Database variables available in the builder sidebar. */
export const LETTER_VARIABLES: { token: string; label: string; hint: string }[] = [
  { token: "{{employee_name}}", label: "Employee Name", hint: "Legal name from HRIS" },
  { token: "{{title}}", label: "Job Title", hint: "Current position" },
  { token: "{{department}}", label: "Department", hint: "Home department" },
  { token: "{{start_date}}", label: "Start Date", hint: "Hire date on record" },
  { token: "{{salary}}", label: "Salary", hint: "Annual salary (CAD)" },
  { token: "{{manager_name}}", label: "Manager Name", hint: "Direct manager" },
  { token: "{{employee_number}}", label: "Employee #", hint: "e.g. EMP-0005" },
  { token: "{{today}}", label: "Today's Date", hint: "Date of issue" },
  { token: "{{company}}", label: "Company", hint: "Company legal name" },
];

/** Fill {{variables}} from an employee record. Unknown tokens are left as-is. */
export function renderLetter(
  body: string,
  emp: {
    name: string;
    title: string;
    department: string;
    hireDate?: string;
    salary?: number;
    manager?: string;
    employeeNumber?: string;
  },
  company = "NinjaHR",
): string {
  const today = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const salary =
    emp.salary != null
      ? emp.salary.toLocaleString("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        })
      : "{{salary}}";
  const map: Record<string, string> = {
    "{{employee_name}}": emp.name,
    "{{title}}": emp.title,
    "{{department}}": emp.department,
    "{{start_date}}": emp.hireDate
      ? new Date(emp.hireDate).toLocaleDateString("en-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "{{start_date}}",
    "{{salary}}": salary,
    "{{manager_name}}": emp.manager ?? "your manager",
    "{{employee_number}}": emp.employeeNumber ?? "—",
    "{{today}}": today,
    "{{company}}": company,
  };
  return body.replace(/\{\{[a-z_]+\}\}/g, (t) => map[t] ?? t);
}
