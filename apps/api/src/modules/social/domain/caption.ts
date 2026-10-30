import { regionLabel } from "@reos/shared";

/**
 * Minimal shape needed to write a listing caption. Matches the Prisma
 * `Property` row (Decimal fields are accepted as anything `Number()` handles).
 */
export interface CaptionSource {
  title: string;
  reference: string;
  type: string;
  purpose: string;
  region: string;
  neighborhood?: string | null;
  rooms: string;
  sizeM2: number;
  floor?: number | null;
  price: unknown;
  pricePeriod?: string | null;
  currency: string;
  description?: string | null;
  isFurnished?: boolean;
  hasParking?: boolean;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasSeaView?: boolean;
  hasPool?: boolean;
  hasGarden?: boolean;
}

const TYPE_WORD: Record<string, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  VILLA: "Villa",
  LAND: "Land",
  COMMERCIAL: "Commercial space",
  OFFICE: "Office",
};

const PERIOD_SUFFIX: Record<string, string> = {
  MONTHLY: "/month",
  NIGHTLY: "/night",
  WEEKLY: "/week",
};

const DESCRIPTION_MAX = 600;

/** Lower-case ASCII, no spaces: "Stari Aerodrom" → "stariaerodrom". */
function hashtag(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
}

export function buildListingCaption(
  p: CaptionSource,
  opts: { priceUpdate?: boolean } = {},
): string {
  const region = regionLabel(p.region) || p.region;
  const place = p.neighborhood ? `${p.neighborhood}, ${region}` : region;
  const purpose = p.purpose === "RENT" ? "FOR RENT" : "FOR SALE";
  const typeWord = TYPE_WORD[p.type] ?? p.type;
  const price = `${Number(p.price).toLocaleString("en-US")} ${p.currency}${
    PERIOD_SUFFIX[p.pricePeriod ?? ""] ?? ""
  }`;

  const features: string[] = [];
  if (p.isFurnished) features.push("furnished");
  if (p.hasParking) features.push("parking");
  if (p.hasElevator) features.push("elevator");
  if (p.hasBalcony) features.push("balcony");
  if (p.hasSeaView) features.push("sea view");
  if (p.hasPool) features.push("pool");
  if (p.hasGarden) features.push("garden");

  const specs = [
    p.rooms,
    `${p.sizeM2} m²`,
    p.floor != null ? `floor ${p.floor}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [];
  if (opts.priceUpdate) lines.push("💥 NEW PRICE", "");
  lines.push(`${purpose} · ${typeWord} · ${place}`, p.title, "");
  lines.push(`📐 ${specs}`);
  lines.push(`💶 ${price}`);
  if (features.length) lines.push(`✨ ${features.join(", ")}`);
  if (p.description?.trim()) {
    const text = p.description.trim();
    lines.push(
      "",
      text.length > DESCRIPTION_MAX
        ? `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`
        : text,
    );
  }
  lines.push("", `Ref: ${p.reference}`, "📩 DM for details & viewings", "");

  const tags = [
    "podgorica",
    "montenegro",
    "crnagora",
    hashtag(region),
    "nekretnine",
    "realestate",
    p.purpose === "RENT" ? "forrent" : "forsale",
    p.purpose === "RENT" ? "izdavanje" : "prodaja",
    hashtag(typeWord),
  ].filter((t, i, arr) => t && arr.indexOf(t) === i);
  lines.push(tags.map((t) => `#${t}`).join(" "));

  return lines.join("\n");
}
