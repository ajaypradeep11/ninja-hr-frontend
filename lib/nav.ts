import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  FolderLock,
  Gauge,
  LogOut,
  BarChart3,
  ListChecks,
  Bot,
  Settings,
  GraduationCap,
  ClipboardList,
  FileSignature,
  Calculator,
  Contact,
  Globe,
  MessageSquareHeart,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
  /** Render the heading as a clickable accordion toggle (with an icon + chevron). */
  collapsible?: boolean;
  /** Icon shown next to a collapsible group's heading. */
  icon?: LucideIcon;
}

export const adminNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Employees", href: "/admin/employees", icon: Contact },
      { label: "Onboarding", href: "/admin/onboarding", icon: UserPlus },
      { label: "Leave", href: "/admin/leave", icon: CalendarDays },
      { label: "Documents", href: "/admin/documents", icon: FolderLock },
      { label: "Performance", href: "/admin/performance", icon: Gauge },
      { label: "Training", href: "/admin/training", icon: GraduationCap },
      { label: "Offboarding", href: "/admin/offboarding", icon: LogOut },
    ],
  },
  {
    heading: "Recruitment",
    collapsible: true,
    icon: Users,
    items: [
      { label: "Requisitions", href: "/admin/recruitment", icon: ClipboardList },
      { label: "AI Assistant", href: "/admin/recruitment/ats", icon: Bot },
      { label: "Career Page", href: "/admin/recruitment/careers", icon: Globe },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      // The premium Tool Library governs which Intelligence entries below it
      // stay visible (disabled built-in tools are hidden via Sidebar's
      // hiddenHrefs) — the library entry itself is always shown to HR.
      { label: "Tool Library", href: "/admin/tools", icon: Sparkles },
      { label: "HR Assistant", href: "/admin/assistant", icon: MessageSquareHeart },
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Tracker", href: "/admin/tracker", icon: ListChecks },
      { label: "AI Agents", href: "/admin/agents", icon: Bot },
      { label: "Letter Lab", href: "/admin/letter-lab", icon: FileSignature },
      { label: "Calculator", href: "/admin/calculator", icon: Calculator },
    ],
  },
  {
    heading: "Workspace",
    items: [{ label: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

export const employeeNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/employee", icon: LayoutDashboard },
      { label: "Onboarding", href: "/employee/onboarding", icon: UserPlus },
      { label: "Leave", href: "/employee/leave", icon: CalendarDays },
      { label: "Training", href: "/employee/training", icon: GraduationCap },
      { label: "My Growth", href: "/employee/performance", icon: Gauge },
      // Documents live inside My Profile (Documents tab) — no standalone nav entry.
      // Internal job board — open to every employee, not just hiring roles.
      { label: "Job Board", href: "/employee/jobs", icon: Briefcase },
    ],
  },
  {
    heading: "Help",
    items: [
      { label: "HR Assistant", href: "/employee/assistant", icon: MessageSquareHeart },
    ],
  },
];

/**
 * Shown in the employee console ONLY for users with real recruitment
 * involvement (hiring manager on a requisition, or HR admin) — standard
 * employees never see this group. The Job Board lives in the base nav.
 */
export const managerRecruitmentNav: NavGroup = {
  heading: "Recruitment",
  items: [{ label: "My Requisitions", href: "/employee/recruitment", icon: Users }],
};

/** Shown to any hiring-team member (incl. plain employees on an interview panel). */
export const interviewsNavItem: NavItem = {
  label: "My Interviews",
  href: "/employee/interviews",
  icon: ClipboardList,
};

/**
 * Post-onboarding state: once an employee's onboarding is complete (or they
 * never had a case), the "Onboarding" tab is replaced by "My Profile".
 */
export const myProfileNavItem: NavItem = {
  label: "My Profile",
  href: "/employee/profile",
  icon: Contact,
};

/**
 * Shown in the employee console ONLY when an HR admin has granted this user
 * at least one Tool Library tool (managers/secondary users) — standard
 * employees with no grants never see it.
 */
export const employeeToolsNavItem: NavItem = {
  label: "AI Tools",
  href: "/employee/tools",
  icon: Sparkles,
};
