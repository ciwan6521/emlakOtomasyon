import {
  ListingPurpose,
  parseListingQuery,
  PropertyType,
  Region,
} from "@reos/shared";

describe("parseListingQuery", () => {
  it('parses "City Kvart 2+1 200k"', () => {
    const p = parseListingQuery("City Kvart 2+1 200k");
    expect(p.region).toBe(Region.CITY_KVART);
    expect(p.rooms).toBe("2+1");
    expect(p.budgetMax).toBe(200_000);
  });

  it('parses type, region and rent purpose: "villa tolosi rent 1.2m"', () => {
    const p = parseListingQuery("villa tolosi rent 1.2m");
    expect(p.type).toBe(PropertyType.VILLA);
    expect(p.region).toBe(Region.TOLOSI);
    expect(p.purpose).toBe(ListingPurpose.RENT);
    expect(p.budgetMax).toBe(1_200_000);
  });

  it('parses a budget range "zabjelo 100k-250k"', () => {
    const p = parseListingQuery("zabjelo 100k-250k");
    expect(p.region).toBe(Region.ZABJELO);
    expect(p.budgetMin).toBe(100_000);
    expect(p.budgetMax).toBe(250_000);
  });

  it('recognizes multi-word region "stari aerodrom"', () => {
    expect(parseListingQuery("stari aerodrom apartment").region).toBe(
      Region.STARI_AERODROM,
    );
  });

  it("matches names typed with diacritics", () => {
    expect(parseListingQuery("Preko Morače stan").region).toBe(
      Region.PREKO_MORACE,
    );
    expect(parseListingQuery("Momišići 3+1").region).toBe(Region.MOMISICI);
  });

  it('does not let "gorica" swallow "donja gorica"', () => {
    expect(parseListingQuery("donja gorica kuca").region).toBe(
      Region.DONJA_GORICA,
    );
    expect(parseListingQuery("gorica stan").region).toBe(Region.GORICA);
  });

  it("accepts the numeric spelling of the blocks", () => {
    expect(parseListingQuery("blok 5 2+1").region).toBe(Region.BLOK_V);
    expect(parseListingQuery("blok 9 garsonjera").region).toBe(Region.BLOK_IX);
  });

  it('treats "min 150k" as a floor', () => {
    const p = parseListingQuery("centar min 150k");
    expect(p.budgetMin).toBe(150_000);
    expect(p.budgetMax).toBeUndefined();
  });

  it("detects studio and absolute amounts", () => {
    const p = parseListingQuery("studio 95000 konik");
    expect(p.rooms).toBe("Studio");
    expect(p.region).toBe(Region.KONIK);
    expect(p.budgetMax).toBe(95_000);
  });

  it("localizes type keywords (daire → apartment, satılık → sale)", () => {
    const p = parseListingQuery("daire satılık");
    expect(p.type).toBe(PropertyType.APARTMENT);
    expect(p.purpose).toBe(ListingPurpose.SALE);
  });
});
