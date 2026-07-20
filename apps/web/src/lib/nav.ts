import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  Contact,
  FileBarChart2,
  FileText,
  Headset,
  Home,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Network,
  PhoneCall,
  Receipt,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Permission } from "@reos/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  group: "Operations" | "Portfolio" | "Growth" | "Insights" | "Admin";
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "Operations",
  },
  {
    label: "Leads",
    href: "/leads",
    icon: Target,
    permission: Permission.LEAD_VIEW,
    group: "Operations",
  },
  {
    label: "Call Center",
    href: "/call-center",
    icon: PhoneCall,
    permission: Permission.CALL_RUN_QUEUE,
    group: "Operations",
  },
  {
    label: "Call Assist",
    href: "/call-assist",
    icon: Headset,
    permission: Permission.COMMS_SEND,
    group: "Operations",
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    permission: Permission.APPOINTMENT_VIEW,
    group: "Operations",
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: CalendarCheck,
    permission: Permission.TASK_VIEW,
    group: "Operations",
  },

  {
    label: "Properties",
    href: "/properties",
    icon: Building2,
    permission: Permission.PROPERTY_VIEW,
    group: "Portfolio",
  },
  {
    label: "Onboarding",
    href: "/onboarding",
    icon: ShieldCheck,
    permission: Permission.ONBOARDING_REVIEW,
    group: "Portfolio",
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    permission: Permission.DOCUMENT_VIEW,
    group: "Portfolio",
  },
  {
    label: "Map",
    href: "/map",
    icon: MapPin,
    permission: Permission.PROPERTY_VIEW,
    group: "Portfolio",
  },

  {
    label: "Owners",
    href: "/owners",
    icon: Home,
    permission: Permission.OWNER_VIEW,
    group: "Portfolio",
  },
  {
    label: "Rentals",
    href: "/rentals",
    icon: KeyRound,
    permission: Permission.RENTAL_VIEW,
    group: "Portfolio",
  },

  {
    label: "Customers",
    href: "/customers",
    icon: Contact,
    permission: Permission.CUSTOMER_VIEW,
    group: "Growth",
  },
  {
    label: "Matching",
    href: "/matching",
    icon: Sparkles,
    permission: Permission.MATCH_VIEW,
    group: "Growth",
  },
  {
    label: "Communication",
    href: "/communication",
    icon: MessageSquare,
    permission: Permission.COMMS_SEND,
    group: "Growth",
  },
  {
    label: "Social",
    href: "/social",
    icon: Share2,
    permission: Permission.SOCIAL_MANAGE,
    group: "Growth",
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: KanbanSquare,
    permission: Permission.DEAL_VIEW,
    group: "Growth",
  },

  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permission: Permission.ANALYTICS_VIEW,
    group: "Insights",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart2,
    permission: Permission.ANALYTICS_VIEW,
    group: "Insights",
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Receipt,
    permission: Permission.COMMISSION_VIEW,
    group: "Insights",
  },

  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: Permission.USER_MANAGE,
    group: "Admin",
  },
  {
    label: "Branches",
    href: "/settings/branches",
    icon: Network,
    permission: Permission.BRANCH_MANAGE,
    group: "Admin",
  },
  {
    label: "Users & Roles",
    href: "/settings/users",
    icon: Users,
    permission: Permission.USER_MANAGE,
    group: "Admin",
  },
  {
    label: "Audit Trail",
    href: "/settings/audit",
    icon: ShieldCheck,
    permission: Permission.AUDIT_VIEW,
    group: "Admin",
  },
];
