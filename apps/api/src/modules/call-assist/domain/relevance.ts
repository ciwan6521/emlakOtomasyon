import {
  ListingPurpose,
  ParsedListingQuery,
  PropertyType,
  Region,
} from "@reos/shared";

export interface RankableProperty {
  region: Region;
  type: PropertyType;
  purpose: ListingPurpose;
  price: number;
  rooms: string;
}

export interface Filters {
  region?: Region;
  rooms?: string;
  type?: PropertyType;
  purpose?: ListingPurpose;
  budgetMin?: number;
  budgetMax?: number;
}

const WEIGHTS = { region: 30, budget: 35, rooms: 20, type: 15 };

export function rankProperty(
  property: RankableProperty,
  f: Filters,
): { relevance: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!f.region || f.region === property.region) {
    score += WEIGHTS.region;
    if (f.region) reasons.push(`Region: ${property.region}`);
  }

  const { budgetMin, budgetMax } = f;
  const minOk = budgetMin == null || property.price >= budgetMin;
  const maxOk = budgetMax == null || property.price <= budgetMax;
  if (minOk && maxOk) {
    score += WEIGHTS.budget;
    if (budgetMin != null || budgetMax != null) reasons.push("Within budget");
  } else if (budgetMax != null && property.price <= budgetMax * 1.1 && minOk) {
    score += Math.round(WEIGHTS.budget * 0.5);
    reasons.push("Slightly above budget (≤10%)");
  }

  if (!f.rooms || f.rooms === property.rooms) {
    score += WEIGHTS.rooms;
    if (f.rooms) reasons.push(`Rooms: ${property.rooms}`);
  }

  if (!f.type || f.type === property.type) {
    score += WEIGHTS.type;
    if (f.type) reasons.push(`Type: ${property.type}`);
  }

  return { relevance: Math.min(100, score), reasons };
}

export function toFilters(
  parsed: ParsedListingQuery,
  override: Partial<Filters>,
): Filters {
  return {
    region: override.region ?? parsed.region,
    rooms: override.rooms ?? parsed.rooms,
    type: override.type ?? parsed.type,
    purpose: override.purpose ?? parsed.purpose,
    budgetMin: override.budgetMin ?? parsed.budgetMin,
    budgetMax: override.budgetMax ?? parsed.budgetMax,
  };
}
