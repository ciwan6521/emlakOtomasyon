import { ListingPurpose, PropertyType, Region } from "@reos/shared";

export interface MatchableProperty {
  region: Region;
  type: PropertyType;
  purpose: ListingPurpose;
  price: number;
  rooms: string;
}

export interface MatchableCustomer {
  preferredRegions: Region[];
  propertyType: PropertyType | null;
  budgetMin: number;
  budgetMax: number;
  roomRequirement: string | null;
  preferredPurpose?: ListingPurpose | null;
  kind?: "BUYER" | "TENANT" | null;
}

export interface MatchOutcome {
  score: number;
  reasons: string[];
}

const WEIGHTS = { region: 25, budget: 30, type: 15, rooms: 15, purpose: 15 };

export const MATCH_THRESHOLD = 55;

export function evaluateMatch(
  property: MatchableProperty,
  customer: MatchableCustomer,
): MatchOutcome {
  let score = 0;
  const reasons: string[] = [];

  const customerPurpose =
    customer.preferredPurpose ??
    (customer.kind === "TENANT"
      ? ListingPurpose.RENT
      : customer.kind === "BUYER"
        ? ListingPurpose.SALE
        : null);

  if (customerPurpose && property.purpose !== customerPurpose) {
    return {
      score: 0,
      reasons: [
        `Purpose mismatch: needs ${customerPurpose}, listing is ${property.purpose}`,
      ],
    };
  }

  if (
    customer.preferredRegions.length === 0 ||
    customer.preferredRegions.includes(property.region)
  ) {
    score += WEIGHTS.region;
    reasons.push(`Region match: ${property.region}`);
  }

  if (
    property.price >= customer.budgetMin &&
    property.price <= customer.budgetMax
  ) {
    score += WEIGHTS.budget;
    reasons.push("Within budget");
  } else if (
    customer.budgetMax > 0 &&
    property.price <= customer.budgetMax * 1.1
  ) {
    score += Math.round(WEIGHTS.budget * 0.5);
    reasons.push("Slightly above budget (≤10%)");
  }

  if (!customer.propertyType || customer.propertyType === property.type) {
    score += WEIGHTS.type;
    if (customer.propertyType) reasons.push(`Type match: ${property.type}`);
  }

  if (
    !customer.roomRequirement ||
    customer.roomRequirement === property.rooms
  ) {
    score += WEIGHTS.rooms;
    if (customer.roomRequirement)
      reasons.push(`Rooms match: ${property.rooms}`);
  }

  // A customer with no stated purpose matches either kind of listing, the same
  // wildcard rule the other dimensions use. Without this the dimension weights
  // could never reach 100.
  if (!customerPurpose || property.purpose === customerPurpose) {
    score += WEIGHTS.purpose;
    if (customerPurpose)
      reasons.push(
        customerPurpose === ListingPurpose.RENT
          ? "Rental listing"
          : "Sale listing",
      );
  }

  return { score: Math.min(100, score), reasons };
}
