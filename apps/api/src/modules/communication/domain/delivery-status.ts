import { DeliveryStatus } from "@reos/shared";

const DELIVERY_RANK: Record<DeliveryStatus, number> = {
  [DeliveryStatus.QUEUED]: 0,
  [DeliveryStatus.FAILED]: 0,
  [DeliveryStatus.SENT]: 1,
  [DeliveryStatus.DELIVERED]: 2,
  [DeliveryStatus.CLICKED]: 3,
};

/**
 * Providers retry callbacks and deliver them out of order, so a reported status
 * is only applied when it moves the delivery forward. FAILED sits outside that
 * progression: a provider accepts a message (SENT) and only later reports that
 * it bounced, but it can never fail after we have proof it reached someone.
 */
export function advancesDelivery(
  current: DeliveryStatus,
  next: DeliveryStatus,
): boolean {
  if (next === DeliveryStatus.FAILED)
    return current === DeliveryStatus.QUEUED || current === DeliveryStatus.SENT;
  if (current === DeliveryStatus.FAILED) return false;
  return DELIVERY_RANK[next] > DELIVERY_RANK[current];
}
