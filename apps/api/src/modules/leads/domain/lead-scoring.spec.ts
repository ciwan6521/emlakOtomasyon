import { LeadSource, Region } from "@reos/shared";
import { computeDedupHash, scoreLead } from "./lead-scoring";

describe("scoreLead", () => {
  it("weights referrals higher than manual entries", () => {
    const base = { phone: "+38269123456" };
    const referral = scoreLead({ ...base, source: LeadSource.REFERRAL });
    const manual = scoreLead({ ...base, source: LeadSource.MANUAL });
    expect(referral).toBeGreaterThan(manual);
  });

  it("boosts prime coastal regions", () => {
    const inland = scoreLead({
      source: LeadSource.PORTAL,
      phone: "+38269123456",
      region: Region.PODGORICA,
    });
    const coast = scoreLead({
      source: LeadSource.PORTAL,
      phone: "+38269123456",
      region: Region.BUDVA,
    });
    expect(coast).toBe(inland + 20);
  });

  it("rewards contactability (email + valid phone)", () => {
    const minimal = scoreLead({ source: LeadSource.MANUAL, phone: "123" });
    const rich = scoreLead({
      source: LeadSource.MANUAL,
      phone: "+38269123456",
      email: "a@b.com",
    });
    expect(rich).toBeGreaterThan(minimal);
  });

  it("detects high-intent signals in the raw payload", () => {
    const plain = scoreLead({
      source: LeadSource.MANUAL,
      phone: "+38269123456",
    });
    const intent = scoreLead({
      source: LeadSource.MANUAL,
      phone: "+38269123456",
      rawPayload: { message: "cash buyer, urgent" },
    });
    expect(intent).toBe(plain + 15);
  });

  it("clamps the score to the 0–100 range", () => {
    const max = scoreLead({
      source: LeadSource.REFERRAL,
      region: Region.BUDVA,
      phone: "+38269123456",
      email: "a@b.com",
      notes: "this is a sufficiently long note about the lead",
      rawPayload: { budget: "500000", urgent: true },
    });
    expect(max).toBeLessThanOrEqual(100);
    expect(max).toBeGreaterThanOrEqual(0);
  });
});

describe("computeDedupHash", () => {
  it("is stable across phone formatting differences", () => {
    const a = computeDedupHash({ phone: "+382 69 123 456" });
    const b = computeDedupHash({ phone: "382-69-123-456" });
    expect(a).toBe(b);
  });

  it("is case-insensitive for email and address", () => {
    const a = computeDedupHash({
      email: "John@Example.com",
      address: "  Main  Street ",
    });
    const b = computeDedupHash({
      email: "john@example.com",
      address: "main street",
    });
    expect(a).toBe(b);
  });

  it("produces different hashes for different people", () => {
    const a = computeDedupHash({ phone: "069123456" });
    const b = computeDedupHash({ phone: "069999999" });
    expect(a).not.toBe(b);
  });
});
