import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  MapPinned,
  Users,
} from "lucide-react";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavSectionConfig {
  label: string;
  items: NavItemConfig[];
}

export const MANAGER_NAV: NavSectionConfig[] = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/manager/overview", icon: LayoutGrid, disabled: true },
      { label: "Weekly plan", href: "/manager/plans", icon: CalendarDays },
      { label: "Check-ins", href: "/manager/check-ins", icon: ClipboardList },
    ],
  },
  {
    label: "Field analysis",
    items: [
      { label: "Reps & pairs", href: "/manager/pairs", icon: Users },
      { label: "Leads & routes", href: "/manager/leads", icon: MapPinned, disabled: true },
      { label: "Reports", href: "/manager/reports", icon: BarChart3, disabled: true },
    ],
  },
  {
    label: "System settings",
    items: [
      { label: "Apply for leave", href: "/manager/leave", icon: CalendarOff, disabled: true },
      { label: "My tasks", href: "/manager/tasks", icon: ListChecks, disabled: true },
    ],
  },
];
