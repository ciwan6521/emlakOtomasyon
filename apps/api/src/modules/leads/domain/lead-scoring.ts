import { LeadSource, Region } from "@reos/shared";
import { createHash } from "node:crypto";

const SOURCE_WEIGHT: Record<LeadSource, number> = {
  [LeadSource.REFERRAL]: 35,
  [LeadSource.WALK_IN]: 30,
  [LeadSource.PORTAL]: 25,
  [LeadSource.INSTAGRAM]: 20,
  [LeadSource.FACEBOOK]: 18,
  [LeadSource.TELEGRAM]: 15,
  [LeadSource.BOT]: 12,
  [LeadSource.MANUAL]: 10,
};

const PRIME_REGIONS = new Set<Region>([
  Region.BUDVA,
  Region.KOTOR,
  Region.TIVAT,
]);

export interface ScorableLead {
  source: LeadSource;
  region?: Region | null;
  email?: string | null;
  phone: string;
  notes?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

export function scoreLead(lead: ScorableLead): number {
  let score = SOURCE_WEIGHT[lead.source] ?? 10;

  if (lead.region && PRIME_REGIONS.has(lead.region)) score += 20;
  if (lead.email) score += 10;
  if (lead.phone && lead.phone.replace(/\D/g, "").length >= 8) score += 10;
  if (lead.notes && lead.notes.length > 20) score += 5;

  // Intent signals from raw integration payload (budget mentioned, urgent, etc.)
  const raw = JSON.stringify(lead.rawPayload ?? {}).toLowerCase();
  if (/(budget|cash|urgent|asap|invest)/.test(raw)) score += 15;

  return Math.max(0, Math.min(100, score));
}

export function computeDedupHash(parts: {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}): string {
  const normalizedPhone = (parts.phone ?? "").replace(/\D/g, "").slice(-9);
  const normalizedEmail = (parts.email ?? "").trim().toLowerCase();
  const normalizedAddress = (parts.address ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return createHash("sha1")
    .update(`${normalizedPhone}|${normalizedEmail}|${normalizedAddress}`)
    .digest("hex");
}
