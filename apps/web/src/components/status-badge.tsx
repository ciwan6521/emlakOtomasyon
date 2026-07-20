import { Badge, type BadgeProps } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS, LeadStatus } from "@reos/shared";

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
};

function label(value: string): string {
  if (value in LEAD_STATUS_LABELS)
    return LEAD_STATUS_LABELS[value as LeadStatus];
  return value.replace(/_/g, " ").toLowerCase();
}

export function StatusBadge({ value }: { value: string }) {
  const variant = VARIANT_MAP[value] ?? "secondary";
  return <Badge variant={variant}>{label(value)}</Badge>;
}
