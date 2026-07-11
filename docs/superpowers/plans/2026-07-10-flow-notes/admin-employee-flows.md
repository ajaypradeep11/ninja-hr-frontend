# Flow notes: admin console + employee portal (condensed explorer reports)

Full detail came from source exploration on 2026-07-10; key facts the help guides rely on:

## Admin nav (lib/nav.ts)
Dashboard /admin · Employees · Onboarding · Leave · Documents · Performance · Training ·
Offboarding · [Recruitment] Requisitions, AI Assistant (/admin/recruitment/ats), Career Page ·
[Intelligence] Reports, Tracker, AI Agents, Letter Lab, Calculator · [Workspace] Settings.
Sidebar footer CTA "New Workflow" → /admin/onboarding/preboard.

## Key admin facts
- **No standalone create-employee form.** /admin/employees "Add Employee" is a dropdown:
  "Invite candidate" → /admin/recruitment; "Begin onboarding" → /admin/onboarding.
  Row kebab: View Profile / Edit Details / Manage Leave / Initiate Offboarding. "Export to CSV".
- **Onboarding**: "Initiate Preboarding" → form (Full name, Start date, Personal email address,
  Job title, Department, Province) → "Launch Onboarding" → success shows "Invite link (sent to
  personal email)" (/welcome/{token}) + Copy button. Case detail: checklist w/ owners
  (HR/Finance/IT / Ops/Manager), add task row, Documents · HR Verification ("Verify" per doc),
  "Activate account" button gated on: all forms done + blocking tasks complete + docs verified.
- **Leave (admin)**: approvals route to department managers; HR page has "Approve (override)" /
  "Deny (override)" in row kebab + "Edit record…" modal (Full day(s)/Partial day (hours),
  overtime 8–12h). Provincial Policy card + Statutory Leave Locks.
- **Recruitment**: "Create New Requisition" → details (Job title, Department, Employment type,
  salary min/max) + JD "Generate with AI" + Approvers + Hiring team (Interview panel checkbox) →
  "Save as Draft" / "Submit for Approval". Detail page: approvals; HR "Publish (HR)" panel —
  JD required (Bill 149: salary range required), pre-screen questions, job boards
  Indeed/LinkedIn, Blind Hiring toggle, "Publish" → live at /careers/{slug}.
  ATS (/admin/recruitment/ats): Kanban Applied → AI Screened → Interview → Offer → Hired →
  Rejected; drag-drop or chevrons; AI can't auto-reject. Candidate page stage buttons —
  "Moving to Interview or Rejected automatically sends the matching template." Offer letters:
  Letter Lab (category "Offer"). Scorecards: rate 1–5, recommendation Strong Yes/Yes/No/Strong
  No, "Save" (private) / "Submit to panel" (locks).
- **Performance**: Review Cycles with state machine Draft → Self-Evaluation →
  Manager-Evaluation → Calibrated → Completed ("Advance" button), "Send Reminders",
  goal-change >15% guardrail approvals. Create PIP form: Employee, Duration (days, min 30),
  Measurable outcome, Company support provided, Consequences of failure, optional signed PDF,
  "Issue PIP" → dual sign-off.
- **Offboarding**: template select (SWE/Sales/Executive), task matrix Manager / IT / Ops /
  HR / Payroll, blocking-task gate, "Finalize System Termination" (Super Admin override
  checkbox if blockers) → "Employee Terminated", ROE + final-pay countdown.
- **Documents**: drag-drop "Drop files to upload" — auto-routed to folder by workflow; RBAC
  "Viewing as" select; folder tree 01_Recruitment…06_Offboarding.
- **Training**: "New Course" (Title, Category, Content link, Duration, Pass mark %,
  Description) → per-course "Assign" drawer (Due date + employee list → "Assign to N
  employees").
- **Letter Lab**: "Create Template" (name, category Offer/Probation/Promotion/Termination/
  Custom, body + {{variables}} sidebar) → "Save Template". "Generate for Employee" modal:
  pick employee, optional "AI Customization Prompt" → "Generate letter" → preview →
  "Save to Profile" or "Send for Signature".
- **Calculator = "Custom Calculator Engine"** (NOT severance): IF/THEN rules for
  timesheets/accruals/bonuses; "Add Rule" → "Save rule"; "Run Payroll / Timesheet" → results
  table + "Export to CSV".
- **Settings**: single grid — Company Profile, Provinces of Operation (drives ESA rules),
  read-only Roles & Permissions matrix, Compliance Feed, Branding, Integrations toggles;
  header "Save changes". **No invite-user flow** — users are provisioned via onboarding.

## Employee nav
Dashboard /employee · Onboarding (↔ "My Profile" once case Active/absent) · Leave · Training ·
My Growth (/employee/performance) · Job Board (/employee/jobs) · [Help] AI Assistant.
Adaptive: "My Interviews" (assigned candidates), Recruitment "My Requisitions"
(HR/managers). Managers see "Manager Portal".

## Key employee facts
- **Onboarding wizard** (via /welcome/{token} → set password → /employee/onboarding?case=…):
  4 steps — "New Hire Form" (identity, SIN, address, emergency contact, work eligibility,
  direct deposit), "Tax Forms (TD1)" (download TD1 + TD1ON, upload both signed), "Benefits"
  (download/upload enrollment form), "Company Handbook" (policies, 2 consent checkboxes,
  upload signed acknowledgment) → "Complete Onboarding" → HR verifies docs then activates.
  Uploads: PDF/PNG/JPEG max 8 MB. Progress auto-saves.
- **Leave**: "Request Time Off" modal — Leave type (Vacation/Sick Leave/Personal/Parental/
  Bereavement/Overtime), Duration "Full day(s)"/"Partial day (hours)", dates, "Notes
  (optional)" → "Submit Request" → goes to department manager. Calendar click-drag pre-fills.
  Pending rows: Edit / Cancel request. Managers get "Team requests awaiting your approval"
  with Approve/Deny on same page. Overtime: "Date worked" + "Overtime hours", doesn't deduct
  balances.
- **Documents**: My Profile → "Documents" tab = read-only "Filing Cabinet"; Eye/Download when
  released, "Locked until released by HR" otherwise; "Export My Data" button.
- **Training**: My Learning tab — "Start" → "Mark complete"; "Open" for content link.
  Creator Studio: "Create Course" → Screen Recording / AI Slide Builder / Blank Canvas →
  "Save draft" or "Submit for HR approval".
- **Interviews**: "My Interviews" lists assigned candidates → open → "Your interview guide":
  rate each section 1–5 + notes, recommendation, "Save" (private draft) / "Submit to panel"
  (final, shared).
- **Profile**: editable Preferred name/Pronouns/contact/address/emergency contacts;
  legal name/DOB/employment read-only ("Managed by HR"); banking/SIN changes via
  "Update banking info…" → opens HR assistant.
- **My Growth**: tabs Overview (goals + "Update Progress"), 1-on-1s (shared agenda + action
  items), Feedback ("Request Peer Feedback", "Give kudos"), Career Path.
