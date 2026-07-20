import { ListingPurpose, PropertyType, Region } from "@reos/shared";
import {
  evaluateMatch,
  MATCH_THRESHOLD,
  type MatchableCustomer,
  type MatchableProperty,
} from "./match-scoring";

const property: MatchableProperty = {
  region: Region.BUDVA,
  type: PropertyType.APARTMENT,
  purpose: ListingPurpose.SALE,
  price: 200_000,
  rooms: "2+1",
};

const customer: MatchableCustomer = {
  preferredRegions: [Region.BUDVA],
  propertyType: PropertyType.APARTMENT,
  budgetMin: 150_000,
  budgetMax: 250_000,
  roomRequirement: "2+1",
};

describe("evaluateMatch", () => {
  it("returns a perfect score when every dimension aligns", () => {
    const { score, reasons } = evaluateMatch(property, customer);
    expect(score).toBe(100);
    expect(reasons.length).toBeGreaterThanOrEqual(4);
  });

  it("gives partial budget credit when slightly over budget (≤10%)", () => {
    const result = evaluateMatch({ ...property, price: 260_000 }, customer);
    expect(result.reasons).toContain("Slightly above budget (≤10%)");
    expect(result.score).toBeLessThan(100);
  });

  it("drops below threshold when region and budget both miss", () => {
    const result = evaluateMatch(
      { ...property, region: Region.PODGORICA, price: 600_000 },
      customer,
    );
    expect(result.score).toBeLessThan(MATCH_THRESHOLD);
  });

  it("treats empty customer preferences as wildcards", () => {
    const open: MatchableCustomer = {
      preferredRegions: [],
      propertyType: null,
      budgetMin: 0,
      budgetMax: 1_000_000,
      roomRequirement: null,
    };
    expect(evaluateMatch(property, open).score).toBe(100);
  });

  it("never exceeds 100", () => {
    const { score } = evaluateMatch(property, customer);
    expect(score).toBeLessThanOrEqual(100);
  });
});
