import { buildListingCaption, CaptionSource } from "./caption";

const base: CaptionSource = {
  title: "Bright 2+1 near the river",
  reference: "CIT-ABC123",
  type: "APARTMENT",
  purpose: "SALE",
  region: "CITY_KVART",
  rooms: "2+1",
  sizeM2: 68,
  floor: 3,
  price: 145000,
  pricePeriod: "TOTAL",
  currency: "EUR",
  isFurnished: true,
  hasParking: true,
};

describe("buildListingCaption", () => {
  it("uses the district label, not the enum value", () => {
    const caption = buildListingCaption(base);
    expect(caption).toContain("City Kvart");
    expect(caption).not.toContain("CITY_KVART");
  });

  it("includes purpose, specs, price, features and reference", () => {
    const caption = buildListingCaption(base);
    expect(caption).toContain("FOR SALE");
    expect(caption).toContain("2+1 · 68 m² · floor 3");
    expect(caption).toContain("145,000 EUR");
    expect(caption).toContain("furnished, parking");
    expect(caption).toContain("Ref: CIT-ABC123");
  });

  it("adds ASCII hashtags for Podgorica and the district", () => {
    const caption = buildListingCaption({
      ...base,
      region: "STARI_AERODROM",
    });
    expect(caption).toContain("#podgorica");
    expect(caption).toContain("#stariaerodrom");
    expect(caption).toContain("#forsale");
  });

  it("strips diacritics from district hashtags", () => {
    const caption = buildListingCaption({ ...base, region: "NOVA_VAROS" });
    expect(caption).toContain("#novavaros");
  });

  it("marks rentals with the price period", () => {
    const caption = buildListingCaption({
      ...base,
      purpose: "RENT",
      pricePeriod: "MONTHLY",
      price: 650,
    });
    expect(caption).toContain("FOR RENT");
    expect(caption).toContain("650 EUR/month");
    expect(caption).toContain("#forrent");
  });

  it("prefixes price-update reposts", () => {
    expect(buildListingCaption(base, { priceUpdate: true })).toMatch(
      /^💥 NEW PRICE/,
    );
  });

  it("truncates long descriptions", () => {
    const caption = buildListingCaption({
      ...base,
      description: "x".repeat(2000),
    });
    expect(caption.length).toBeLessThan(2200);
    expect(caption).toContain("…");
  });
});
