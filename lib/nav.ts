import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  FolderLock,
  Gauge,
  LogOut,
  BarChart3,
  HeartHandshake,
  ListChecks,
  Bot,
  Settings,
  GraduationCap,
  FileText,
  MessageSquareHeart,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

export const adminNav: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Recruitment", href: "/admin/recruitment", icon: Users },
      { label: "Onboarding", href: "/admin/onboarding", icon: UserPlus },
      { label: "Leave", href: "/admin/leave", icon: CalendarDays },
      { label: "Documents", href: "/admin/documents", icon: FolderLock },
      { label: "Performance", href: "/admin/performance", icon: Gauge },
      { label: "Offboarding", href: "/admin/offboarding", icon: LogOut },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Benefits", href: "/admin/benefits", icon: HeartHandshake },
      { label: "Tracker", href: "/admin/tracker", icon: ListChecks },
      { label: "AI Agents", href: "/admin/agents", icon: Bot },
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
      { label: "Documents", href: "/employee/documents", icon: FileText },
    ],
  },
  {
    heading: "Help",
    items: [
      { label: "AI Assistant", href: "/employee/assistant", icon: MessageSquareHeart },
    ],
  },
];
