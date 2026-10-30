"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useEnumLabel } from "@/lib/i18n/locale-context";

const VARIANT_MAP: Record<string, BadgeProps["variant"]> = {
  NEW: "secondary",
  TO_CALL: "default",
  CALLING: "default",
  FOLLOW_UP: "warning",
  POTENTIAL: "success",
  AGREED: "success",
  IN_PORTFOLIO: "success",
  PASSIVE: "secondary",
  BLACKLIST: "destructive",
  NEGOTIATION: "warning",
  ACCEPTED: "success",
  ONBOARDING_PENDING: "warning",
  ACTIVE_LISTING: "success",
  SOLD: "secondary",
  RENTED: "secondary",
  HOT: "destructive",
  WARM: "warning",
  COLD: "secondary",
  DEAL_CLOSED: "success",
  LOST: "destructive",
  DELIVERED: "success",
  CLICKED: "success",
  SENT: "default",
  QUEUED: "secondary",
  FAILED: "destructive",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
  COMPLETED: "success",
  DONE: "success",
  IN_PROGRESS: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  EXPIRED: "secondary",
  SIGNED: "success",
  ACTIVE: "success",
  URGENT: "destructive",
  HIGH: "warning",
};

export function StatusBadge({ value }: { value: string }) {
  const e = useEnumLabel();
  const variant = VARIANT_MAP[value] ?? "secondary";
  return <Badge variant={variant}>{e("status", value)}</Badge>;
}
