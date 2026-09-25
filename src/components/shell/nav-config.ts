import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  History,
  LayoutGrid,
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
      { label: "Overview", href: "/manager/overview", icon: LayoutGrid },
      { label: "Weekly plan", href: "/manager/plans", icon: CalendarDays },
      { label: "Check-ins", href: "/manager/check-ins", icon: ClipboardList },
    ],
  },
  {
    label: "Field analysis",
    items: [
      { label: "Reps & pairs", href: "/manager/pairs", icon: Users },
      { label: "Leads", href: "/manager/leads", icon: MapPinned },
      { label: "Reports", href: "/manager/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "Activity log", href: "/manager/activity", icon: History }],
  },
];
