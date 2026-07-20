import {
  ListingPurpose,
  parseListingQuery,
  PropertyType,
  Region,
} from "@reos/shared";

describe("parseListingQuery", () => {
  it('parses "Budva 2+1 200k"', () => {
    const p = parseListingQuery("Budva 2+1 200k");
    expect(p.region).toBe(Region.BUDVA);
    expect(p.rooms).toBe("2+1");
    expect(p.budgetMax).toBe(200_000);
  });

  it('parses type, region and rent purpose: "villa tivat rent 1.2m"', () => {
    const p = parseListingQuery("villa tivat rent 1.2m");
    expect(p.type).toBe(PropertyType.VILLA);
    expect(p.region).toBe(Region.TIVAT);
    expect(p.purpose).toBe(ListingPurpose.RENT);
    expect(p.budgetMax).toBe(1_200_000);
  });

  it('parses a budget range "kotor 100k-250k"', () => {
    const p = parseListingQuery("kotor 100k-250k");
    expect(p.region).toBe(Region.KOTOR);
    expect(p.budgetMin).toBe(100_000);
    expect(p.budgetMax).toBe(250_000);
  });

  it('recognizes multi-word region "herceg novi"', () => {
    expect(parseListingQuery("herceg novi apartment").region).toBe(
      Region.HERCEG_NOVI,
    );
  });

  it('treats "min 150k" as a floor', () => {
    const p = parseListingQuery("podgorica min 150k");
    expect(p.budgetMin).toBe(150_000);
    expect(p.budgetMax).toBeUndefined();
  });

  it("detects studio and absolute amounts", () => {
    const p = parseListingQuery("studio 95000 bar");
    expect(p.rooms).toBe("Studio");
    expect(p.region).toBe(Region.BAR);
    expect(p.budgetMax).toBe(95_000);
  });

  it("localizes type keywords (daire → apartment, satılık → sale)", () => {
    const p = parseListingQuery("daire satılık");
    expect(p.type).toBe(PropertyType.APARTMENT);
    expect(p.purpose).toBe(ListingPurpose.SALE);
  });
});
