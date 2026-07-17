/**
 * Help Center content — rendered at /help by components/marketing/help-browser.tsx.
 *
 * Every step quotes the real UI (nav labels, button names, field labels) — when a
 * screen changes, update its guide here. Adding a guide = append to a category;
 * the sidebar, search and anchors derive from this data.
 */

export type HelpStep = {
  /** Main instruction. Text wrapped in **double asterisks** renders bold (UI labels). */
  text: string;
  /** Optional smaller print under the step. */
  detail?: string;
};

export type HelpGuide = {
  slug: string;
  title: string;
  audience: "admin" | "employee" | "everyone";
  summary: string;
  steps: HelpStep[];
  tips?: string[];
};

export type HelpCategory = {
  id: string;
  title: string;
  guides: HelpGuide[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    guides: [
      {
        slug: "what-is-ninjahr",
        title: "What is NinjaHR?",
        audience: "everyone",
        summary:
          "NinjaHR runs the whole employee journey for Canadian teams — hiring, onboarding, time off, documents, training, performance and offboarding — with an AI agent doing the chasing.",
        steps: [
          {
            text: "**HR admins** work in the Admin Console — the sidebar covers Employees, Onboarding, Leave, Documents, Performance, Training, Offboarding, Recruitment, and the Intelligence tools (Reports, Letter Lab, Calculator).",
          },
          {
            text: "**Employees** use the Employee Portal — Dashboard, Onboarding (or My Profile), Leave, Training, My Growth and the Job Board.",
            detail:
              "The portal adapts: managers also see team approvals and My Requisitions; interview panel members see My Interviews.",
          },
          {
            text: "**Candidates** apply on the public careers site and follow their application through a personal tracking link — no account needed.",
          },
          {
            text: "Press **⌘K** anywhere in the app (or click **Live AI Agent** in the top bar) to ask the HR copilot a question like “How many vacation days do I have left?”",
          },
        ],
        tips: [
          "HR admins can switch to the employee view any time with “View as Employee” in the top bar.",
        ],
      },
      {
        slug: "signing-in",
        title: "Signing in",
        audience: "everyone",
        summary: "Sign in with your work email, or with Google if it matches your work email.",
        steps: [
          { text: "Go to the sign-in page and enter your **Work email** and **Password**." },
          {
            text: "Click **Sign in** — or use **Continue with Google** with your work account.",
          },
          {
            text: "You'll land in the right place automatically: HR admins in the Admin Console, everyone else in the Employee Portal.",
          },
        ],
        tips: [
          "Seeing “Your account isn't linked to an employee profile yet”? Your HR team still needs to finish setting you up — contact them.",
          "Employees don't self-register: HR sends you an invite (see “Accepting your invite”). The “Create your workspace” link on the sign-in page is only for a company's very first setup.",
        ],
      },
      {
        slug: "accepting-your-invite",
        title: "Accepting your invite (new hires)",
        audience: "everyone",
        summary:
          "New hires get a personal welcome link by email before day one. It activates your account and starts your onboarding paperwork.",
        steps: [
          {
            text: "Open the invite link from your personal email — you'll see **“Welcome to NinjaHR”** with your name.",
          },
          {
            text: "Set a **Password** (at least 10 characters), confirm it, and click **Set password & continue** — or click **Continue with Google** using the same email the invite was sent to.",
          },
          {
            text: "You're signed in and taken straight to your onboarding checklist — see “Complete your onboarding”.",
          },
        ],
        tips: [
          "Link says “invalid or has expired”? Ask HR to re-send your invite — they can copy a fresh link from your onboarding case.",
        ],
      },
    ],
  },
  {
    id: "for-hr-admins",
    title: "For HR admins",
    guides: [
      {
        slug: "add-an-employee",
        title: "How to add an employee",
        audience: "admin",
        summary:
          "New people enter NinjaHR through a workflow — onboarding for a signed hire, recruitment for someone you still need to hire — so their profile, paperwork and access are created together.",
        steps: [
          { text: "Go to **Employees** in the sidebar." },
          {
            text: "Click the **Add Employee** button (top right) — it opens a menu with two paths.",
          },
          {
            text: "Already hired? Choose **Begin onboarding** (“Start a new hire's paperwork”) and follow “How to onboard a new hire” below.",
          },
          {
            text: "Still hiring for the role? Choose **Invite candidate** (“Open a requisition and start hiring”) and follow “How to post a job and hire”.",
          },
          {
            text: "Once onboarding is activated (or a candidate is marked **Hired**), the person appears in the **Employees** directory with a full HR record.",
          },
        ],
        tips: [
          "From any directory row, the ⋯ menu gives you View Profile, Edit Details, Manage Leave and Initiate Offboarding.",
          "Need the list elsewhere? Export to CSV sits next to the filters.",
        ],
      },
      {
        slug: "onboard-a-new-hire",
        title: "How to onboard a new hire",
        audience: "admin",
        summary:
          "One preboarding form creates the profile, a department checklist and a secure invite — then you verify documents and activate the account.",
        steps: [
          {
            text: "Go to **Onboarding** and click **Initiate Preboarding** (also reachable from the sidebar's **New Workflow** button).",
          },
          {
            text: "Fill in **Full name**, **Start date**, **Personal email address**, **Job title**, **Department** and **Province**, then click **Launch Onboarding**.",
            detail:
              "The agent creates the profile, generates a department checklist, and emails a secure invite with the standard forms (New Hire Form incl. direct deposit, TD1 & TD1ON).",
          },
          {
            text: "Copy the **Invite link** from the success screen if you want to send it yourself, then **Track in pipeline** to open the case.",
          },
          {
            text: "Watch the case move through **Invited → Forms In Progress → Pending Verification** as the hire completes their wizard. Use the checklist to assign owners (HR, Finance, IT / Ops, Manager) and add your own tasks.",
          },
          {
            text: "When documents arrive, click **Verify** on each one in **Documents · HR Verification**.",
          },
          {
            text: "Once all forms are done, blocking tasks completed and documents verified, click **Activate account** — payroll goes Active and SSO is provisioned.",
          },
        ],
        tips: [
          "Blocking tasks gate activation on purpose — delegate them early with the assignee picker on each department group.",
          "Everything is logged to an immutable audit trail on the case.",
        ],
      },
      {
        slug: "manage-time-off",
        title: "How to approve and manage time off",
        audience: "admin",
        summary:
          "Requests route to each employee's department manager; the Leave page gives HR the company-wide view with override powers.",
        steps: [
          { text: "Go to **Leave** — the tiles show what's awaiting manager approval and what's upcoming." },
          {
            text: "Find a request in **Absence Records** (search by employee or department, filter by status or type).",
          },
          {
            text: "On a Pending row, open the ⋯ menu and pick **Approve (override)** or **Deny (override)** to decide on the manager's behalf.",
          },
          {
            text: "Use **Edit record…** to fix any request — change the type, status, dates, or switch between **Full day(s)** and **Partial day (hours)**.",
          },
          {
            text: "Set provincial rules in **Provincial Policy** (paid sick days, years of service) and click **Save policy** — vacation accrual updates automatically.",
          },
        ],
        tips: [
          "Overtime is a leave type of its own, logged in hours — it never deducts from vacation or sick balances.",
          "Maternity/parental leaves are protected by Statutory Leave Locks — terminating during one needs a multi-factor override.",
        ],
      },
      {
        slug: "post-a-job",
        title: "How to post a job and hire",
        audience: "admin",
        summary:
          "A requisition goes draft → approved → published. Publishing puts it live on your careers site and, optionally, Indeed and LinkedIn.",
        steps: [
          {
            text: "Go to **Requisitions** under Recruitment and click **Create New Requisition**.",
          },
          {
            text: "Fill in **Job title**, **Department**, **Employment type** and the **Target salary** range — Ontario's Bill 149 requires a posted range.",
          },
          {
            text: "Optionally paste key requirements and click **Generate with AI** to draft the job description — an inclusive-language checker flags problem wording.",
          },
          {
            text: "Pick **Approvers** and the **Hiring team** (tick “Interview panel” for members who will score candidates), then click **Submit for Approval** — or **Save as Draft**.",
          },
          {
            text: "Once approvers sign off, open the requisition's **Publish (HR)** panel: finalize the job description, add **Pre-screening questions**, choose job boards, and click **Publish**.",
          },
          {
            text: "The role is now live at your public careers page — check it from **Career Page → View public site**.",
          },
        ],
        tips: [
          "Publishing is blocked without a salary range: “Cannot publish: Bill 149 requires a posted salary range.”",
          "Turn on Blind Hiring in the publish panel to anonymize candidates for the panel.",
        ],
      },
      {
        slug: "review-candidates",
        title: "How to review candidates and make a hire",
        audience: "admin",
        summary:
          "The AI Assistant board ranks applicants; humans move them through Applied → AI Screened → Interview → Offer → Hired.",
        steps: [
          {
            text: "Go to **AI Assistant** under Recruitment and pick the requisition — candidates appear as cards with a % match score.",
          },
          {
            text: "Drag a card to the next stage (or use the arrows on the card). The AI ranks and screens, but only a human can move someone to **Rejected**.",
          },
          {
            text: "Open a candidate to see their profile: AI match strengths and gaps, **Interview Panel** scorecards, **AI Assistant & Comms** for templated emails, and the **Activity** log.",
          },
          {
            text: "Moving a candidate to **Interview** or **Rejected** automatically sends the matching email template.",
          },
          {
            text: "To hire: move them to **Offer**, generate the offer letter in **Letter Lab** (category “Offer”), then move them to **Hired**.",
          },
          {
            text: "Follow up with **Begin onboarding** so the new hire's paperwork starts (see “How to onboard a new hire”).",
          },
        ],
        tips: [
          "Panel members score candidates from their own portal — you'll see the aggregated debrief under the Interview Panel tab once you've submitted your own scorecard.",
          "HR-only: the Activity tab includes “Purge personal data…” for Ontario privacy compliance.",
        ],
      },
      {
        slug: "run-performance-reviews",
        title: "How to run performance reviews and PIPs",
        audience: "admin",
        summary:
          "Review cycles advance through a fixed state machine, goal changes above 15% need approval, and PIPs collect dual sign-off.",
        steps: [
          { text: "Go to **Performance** — the tiles show review completion, active goals and PIPs." },
          {
            text: "In **Review Cycles**, click **Advance** on a review to move it along Draft → Self-Evaluation → Manager-Evaluation → Calibrated → Completed.",
          },
          {
            text: "Click **Send Reminders** to nudge everyone the cycle is waiting on.",
          },
          {
            text: "Watch the **Pending Approvals** queue: any goal changed by more than 15% out-of-band needs your **Approve change** or **Reject**.",
          },
          {
            text: "To issue a PIP, fill the **Create PIP** form — **Employee**, **Duration (days)** (30+ recommended), **Measurable outcome**, **Company support provided**, **Consequences of failure** — and click **Issue PIP**.",
            detail: "It routes for dual sign-off: manager and employee both sign, or you record a witnessed refusal.",
          },
        ],
        tips: [
          "Employees only ever see feedback once it's formally released — calibration notes stay internal.",
        ],
      },
      {
        slug: "manage-documents",
        title: "How to manage documents",
        audience: "admin",
        summary:
          "Files route themselves into each employee's vault by workflow context; access is role-based per folder.",
        steps: [
          { text: "Go to **Documents** — the Employee Vault folder tree runs 01_Recruitment through 06_Offboarding." },
          {
            text: "Drag files onto **Drop files to upload** — PDF, JPEG, PNG or DOCX are auto-routed to the right folder by their workflow context.",
          },
          {
            text: "Click any document row to open its details: type, associated workflow, upload date and access level.",
          },
          {
            text: "Use the **Viewing as** selector (Employee / Manager / HR Admin / Super Admin) to preview exactly what each role can see.",
          },
        ],
        tips: [
          "Employees see a read-only Filing Cabinet in their profile; sensitive folders like 05_Leaves_and_Medical stay masked outside HR.",
          "Retention and audit follow Law 25 — every access is on the immutable trail.",
        ],
      },
      {
        slug: "manage-training",
        title: "How to create and assign training",
        audience: "admin",
        summary: "Create a course once, assign it to any group with a due date, track completion.",
        steps: [
          { text: "Go to **Training** and click **New Course**." },
          {
            text: "Fill in **Title**, **Category**, an optional **Content link**, **Duration (min)** and an optional **Pass mark %**, then click **Create course**.",
          },
          { text: "On the course card, click **Assign**." },
          {
            text: "Pick an optional **Due date**, select employees from the list, and click **Assign to N employees**.",
          },
          {
            text: "Completion shows on each course card — and in the **Tracker** for the company-wide view.",
          },
        ],
        tips: [
          "Employees can also build courses in their Creator Studio — they arrive as “Pending HR Approval” for you to publish or reject.",
        ],
      },
      {
        slug: "offboard-an-employee",
        title: "How to offboard an employee",
        audience: "admin",
        summary:
          "A role-based separation checklist for Manager, IT and Payroll, with a blocking-task gate before the system termination fires.",
        steps: [
          {
            text: "Go to **Offboarding** — or start from the directory: open the employee's ⋯ menu in **Employees** and pick **Initiate Offboarding**.",
          },
          {
            text: "Pick the right **Template** for the role (e.g. Software Engineer Offboarding, Executive Departure).",
          },
          {
            text: "Work the three task lanes — **Manager**, **IT / Ops**, **HR / Payroll** — clicking each task through Pending → In-Progress → Completed, and delegate lanes with the assignee picker.",
          },
          {
            text: "Clear every blocking task — the finalize panel lists anything still outstanding.",
          },
          {
            text: "Click **Finalize System Termination**. Access is revoked across integrations, and the ROE schedule and final-pay countdown start.",
          },
        ],
        tips: [
          "A Super Admin can force termination past blockers, but the override and its reason are logged.",
          "Termination letters live in Letter Lab (category “Termination”).",
        ],
      },
      {
        slug: "letter-lab",
        title: "How to generate letters (Letter Lab)",
        audience: "admin",
        summary:
          "Build a template once with live HRIS variables, then generate a personalized letter for any employee in seconds.",
        steps: [
          { text: "Go to **Letter Lab** under Intelligence and click **Create Template**." },
          {
            text: "Name it, pick a **Category** (Offer, Probation, Promotion, Termination, Custom) and write the **Document body**, dropping in **Database Variables** like {{employee_name}} from the sidebar. Click **Save Template**.",
          },
          { text: "From the library, click **Generate for Employee** on the template." },
          {
            text: "Search and select the employee, optionally add an **AI Customization Prompt** (“Add a friendly opening paragraph…”), and click **Generate letter**.",
          },
          {
            text: "Review the letterhead preview, then **Save to Profile** (files it under their Documents) or **Send for Signature**.",
          },
        ],
        tips: [
          "Variables fill from the employee's live HRIS record at generation time — no copy-paste drift.",
        ],
      },
      {
        slug: "calculator-engine",
        title: "How to use the Calculator Engine",
        audience: "admin",
        summary:
          "Define IF/THEN rules for timesheets, accruals and bonuses, then run them against live employee data.",
        steps: [
          { text: "Go to **Calculator** under Intelligence and pick a category tab (Timesheet, etc.)." },
          {
            text: "Click **Add Rule** and compose it: IF a field (e.g. weekly hours) meets an operator + threshold, THEN apply an action by a value. Click **Save rule**.",
          },
          { text: "Toggle rules on and off with each rule's **Active** checkbox." },
          {
            text: "Click **Run Payroll / Timesheet** — the run table shows each employee's regular/OT split, base pay, OT pay, bonus and vacation accrual.",
          },
          { text: "Click **Export to CSV** to hand the results to payroll." },
        ],
        tips: ["Hourly rate is derived as annual salary ÷ 2080 — noted under the run table."],
      },
      {
        slug: "settings-workspace",
        title: "Settings: company, provinces, roles & integrations",
        audience: "admin",
        summary:
          "One page configures the workspace: company profile, provinces of operation, the permission matrix and integrations.",
        steps: [
          { text: "Go to **Settings** in the sidebar." },
          {
            text: "Update **Company Profile** (legal entity name, headcount, data residency) and **Branding** (product display name).",
          },
          {
            text: "Toggle **Provinces of Operation** — this decides which ESA rules, training and policies the engine enforces.",
          },
          {
            text: "Review **Roles & Permissions** — the module-by-role matrix is read-only, so you always know exactly who can see what.",
          },
          {
            text: "Flip on **Integrations** you use (Google Workspace, Microsoft 365, Slack, SharePoint, Xodo Sign, QuickBooks Online) and click **Save changes** in the header.",
          },
        ],
        tips: [
          "There's no “invite user” button here by design — people are provisioned through onboarding and recruitment so no account exists without an HR record.",
        ],
      },
    ],
  },
  {
    id: "for-employees",
    title: "For employees",
    guides: [
      {
        slug: "complete-your-onboarding",
        title: "How to complete your onboarding",
        audience: "employee",
        summary:
          "Four steps, about 8 minutes, saved automatically — then HR verifies your documents and activates your account.",
        steps: [
          {
            text: "Open your invite link and set your password (see “Accepting your invite”) — you land on **Welcome aboard** with a 4-step tracker.",
          },
          {
            text: "Step 1 — **New Hire Form**: legal name, date of birth, SIN, address, emergency contact, work eligibility and direct deposit. Sensitive fields are masked after you submit.",
            detail: "The name on your bank account must match your legal name to avoid payroll delays.",
          },
          {
            text: "Step 2 — **Tax Forms (TD1)**: download the TD1 (federal) and TD1ON (provincial) PDFs, fill and sign them, and upload both.",
          },
          {
            text: "Step 3 — **Benefits**: review your coverage, download the enrollment form, and upload it completed & signed.",
          },
          {
            text: "Step 4 — **Company Handbook**: read the policies, tick the acknowledgment and privacy-consent boxes, upload your signed acknowledgment, and click **Complete Onboarding**.",
          },
          {
            text: "Done — HR verifies your documents and activates your account before day one. Your uploads appear in **Your Digital Vault** with live status.",
          },
        ],
        tips: [
          "Uploads take PDF, PNG or JPEG up to 8 MB.",
          "Progress saves automatically — you can close the tab and pick up where you left off.",
        ],
      },
      {
        slug: "request-time-off",
        title: "How to request time off",
        audience: "employee",
        summary:
          "Request full or partial days from your calendar — it goes to your department manager for approval.",
        steps: [
          { text: "Go to **Leave** and click **Request Time Off** — or click (and drag across) dates on the calendar to start a pre-filled request." },
          {
            text: "Pick the **Leave type**: Vacation, Sick Leave, Personal, Parental, Bereavement or Overtime.",
          },
          {
            text: "Choose **Full day(s)** with start and end dates, or **Partial day (hours)** for part of a day.",
          },
          { text: "Add **Notes (optional)** for your manager and click **Submit Request**." },
          {
            text: "Track it under **My Requests** — pending days show in your balance cards as “pending” until your manager approves.",
          },
        ],
        tips: [
          "Made a mistake? Pending requests can still be edited or cancelled from the ⋯ menu on the request row.",
          "Logging overtime? It's submitted for approval and recorded separately — it never deducts from your balances.",
          "Managers: your team's requests appear on this same page under “Team requests awaiting your approval”.",
        ],
      },
      {
        slug: "your-documents",
        title: "Your documents (Filing Cabinet)",
        audience: "employee",
        summary: "Your personal records, read-only, available any time — with a one-click export.",
        steps: [
          { text: "Go to **My Profile** and open the **Documents** tab." },
          { text: "Browse your folders and click the eye icon to preview or the download icon to save a copy." },
          {
            text: "Documents marked **“Locked until released by HR”** become available once HR releases them.",
          },
          { text: "Click **Export My Data** any time to download everything you're entitled to as a file." },
        ],
        tips: [
          "Spot an error in a record? Contact HR — updates go through them so your file stays authoritative.",
        ],
      },
      {
        slug: "complete-training",
        title: "How to complete training",
        audience: "employee",
        summary: "Start assigned courses, mark them complete, and build your own guides for the team.",
        steps: [
          { text: "Go to **Training** — the **My Learning** tab shows what's assigned, outstanding and completed." },
          { text: "Click **Start** on a course, then **Open** if it links to content." },
          { text: "When you're done, click **Mark complete** — your progress updates instantly." },
          {
            text: "Want to teach something? Switch to **Creator Studio**, click **Create Course**, and pick Screen Recording, AI Slide Builder or Blank Canvas.",
          },
          {
            text: "Click **Submit for HR approval** — once approved, your course is available to the whole team.",
          },
        ],
        tips: ["Watch the due dates — overdue courses get flagged to HR's tracker."],
      },
      {
        slug: "interviews-as-panel-member",
        title: "Interviewing as a panel member",
        audience: "employee",
        summary:
          "Assigned candidates appear under My Interviews — score each interview section and submit your recommendation to the panel.",
        steps: [
          { text: "Go to **My Interviews** — it appears in your sidebar whenever you're on a hiring panel." },
          { text: "Open a candidate to see their profile and **Your interview guide**." },
          {
            text: "During the interview, rate each section **1–5** and jot notes/evidence per section.",
          },
          {
            text: "Pick an **Overall recommendation** — Strong Yes, Yes, No or Strong No — and add overall notes.",
          },
          {
            text: "Click **Save** to keep a private draft, or **Submit to panel** when you're sure — submitted guides lock and become visible to the whole panel.",
          },
        ],
        tips: [
          "Submissions are final on purpose — it keeps the hiring record trustworthy.",
          "You can't see the panel debrief until you've submitted your own scorecard — no anchoring.",
        ],
      },
      {
        slug: "profile-and-growth",
        title: "Your profile, goals & growth",
        audience: "employee",
        summary:
          "Keep your details current in My Profile, and own your development in My Growth — goals, 1-on-1s, feedback and your career path.",
        steps: [
          {
            text: "Go to **My Profile** to update your preferred name, pronouns, contact details, address and emergency contacts — click **Save changes**.",
            detail:
              "Legal name, date of birth and employment details are managed by HR; banking/SIN changes go through “Update banking info…”, which opens the HR assistant.",
          },
          { text: "Go to **My Growth** for your development home — four tabs: Overview, 1-on-1s, Feedback, Career Path." },
          {
            text: "On **Overview**, click **Update Progress** on a goal, slide the percentage, add a note and **Log update**.",
          },
          {
            text: "On **1-on-1s**, add talking points to the shared agenda and tick off action items between syncs with your manager.",
          },
          {
            text: "On **Feedback**, click **Request Peer Feedback** to ask a colleague about a specific piece of work — or **Give kudos** to celebrate someone.",
          },
        ],
        tips: [
          "Review scores appear in your history only once HR formally releases them.",
          "The Career Path tab lists the competencies and evidence for your next level — pair it with training from the Job Board's sister tab.",
        ],
      },
    ],
  },
];
