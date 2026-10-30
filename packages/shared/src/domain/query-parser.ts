import { ListingPurpose, PropertyType, Region } from "./enums";

export interface ParsedListingQuery {
  region?: Region;
  rooms?: string;
  type?: PropertyType;
  purpose?: ListingPurpose;
  budgetMin?: number;
  budgetMax?: number;
  raw: string;
}

/**
 * Spoken and typed variants, diacritics stripped. Longer or more specific
 * phrases come first so "donja gorica" is not swallowed by "gorica".
 */
const REGION_KEYWORDS: Array<[Region, string[]]> = [
  [Region.DONJA_GORICA, ["donja gorica", "donjagorica"]],
  [Region.GORNJA_GORICA, ["gornja gorica", "gornjagorica"]],
  [Region.KAKARICKA_GORA, ["kakaricka gora", "kakaricka"]],
  [Region.DONJI_KOKOTI, ["donji kokoti"]],
  [Region.GORNJI_KOKOTI, ["gornji kokoti"]],
  [Region.STARI_AERODROM, ["stari aerodrom", "aerodrom"]],
  [Region.CVIJETIN_BRIJEG, ["cvijetin brijeg", "cvijetin"]],
  [Region.VRELA_RIBNICKA, ["vrela ribnicka", "vrela"]],
  [Region.PREKO_MORACE, ["preko morace", "preko"]],
  [Region.NOVA_VAROS, ["nova varos", "novavaros"]],
  [Region.STARA_VAROS, ["stara varos", "staravaros"]],
  [Region.CITY_KVART, ["city kvart", "siti kvart", "citykvart", "city"]],
  [Region.BLOK_IX, ["blok ix", "blok 9", "blok9"]],
  [Region.BLOK_VI, ["blok vi", "blok 6", "blok6"]],
  [Region.BLOK_V, ["blok v", "blok 5", "blok5"]],
  [Region.MALO_BRDO, ["malo brdo", "malobrdo"]],
  [Region.TUSKI_PUT, ["tuski put", "tuski"]],
  [Region.KUCE_RAKICA, ["kuce rakica", "rakica"]],
  [Region.CENTAR, ["centar", "center", "centre", "merkez"]],
  [Region.ZABJELO, ["zabjelo"]],
  [Region.SADINE, ["sadine"]],
  [Region.KONIK, ["konik"]],
  [Region.DRAC, ["drac"]],
  [Region.MOMISICI, ["momisici"]],
  [Region.KRUSEVAC, ["krusevac"]],
  [Region.LJUBOVIC, ["ljubovic"]],
  [Region.DAHNA, ["dahna"]],
  [Region.TOLOSI, ["tolosi"]],
  [Region.ZAGORIC, ["zagoric"]],
  [Region.MASLINE, ["masline"]],
  [Region.POBREZJE, ["pobrezje"]],
  [Region.ZLATICA, ["zlatica"]],
  [Region.MURTOVINA, ["murtovina"]],
  [Region.CEPURCI, ["cepurci"]],
  [Region.LJESKOPOLJE, ["ljeskopolje"]],
  [Region.DAJBABE, ["dajbabe"]],
  [Region.FARMACI, ["farmaci"]],
  [Region.MAREZA, ["mareza"]],
  [Region.ROGAMI, ["rogami"]],
  [Region.DOLJANI, ["doljani"]],
  [Region.BERI, ["beri"]],
  [Region.BOTUN, ["botun"]],
  [Region.CIJEVNA, ["cijevna"]],
  [Region.TUZI, ["tuzi"]],
  [Region.GOLUBOVCI, ["golubovci"]],
  [Region.ZETA, ["zeta"]],
  // Bare "gorica" last so the compound names above win.
  [Region.GORICA, ["gorica"]],
];

/** Lower-cases and strips the diacritics used in Montenegrin place names. */
function normalise(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

const TYPE_KEYWORDS: Array<[PropertyType, string[]]> = [
  [PropertyType.APARTMENT, ["apartment", "apart", "daire", "stan", "flat"]],
  [PropertyType.VILLA, ["villa", "vila"]],
  [PropertyType.HOUSE, ["house", "ev", "kuca", "kuća"]],
  [PropertyType.LAND, ["land", "arsa", "plac", "plot", "zemlja"]],
  [PropertyType.OFFICE, ["office", "ofis", "kancelarija"]],
  [PropertyType.COMMERCIAL, ["commercial", "shop", "ticari", "lokal"]],
];

const RENT_KEYWORDS = [
  "rent",
  "rental",
  "kira",
  "kiralik",
  "kiralık",
  "iznajm",
  "najam",
];
const SALE_KEYWORDS = [
  "sale",
  "sell",
  "buy",
  "satilik",
  "satılık",
  "prodaja",
  "prodaj",
];

export function parseListingQuery(input: string): ParsedListingQuery {
  const raw = input ?? "";
  let text = ` ${normalise(raw)} `;
  const result: ParsedListingQuery = { raw };

  // Region — match on word boundaries so "beri" does not fire inside "berislavci"
  // and "city" does not fire inside "capacity".
  for (const [region, keywords] of REGION_KEYWORDS) {
    const hit = keywords.find((k) =>
      new RegExp(`(^|[^a-z0-9])${k.replace(/\s+/g, "\\s*")}(?=$|[^a-z0-9])`).test(
        text,
      ),
    );
    if (hit) {
      result.region = region;
      text = text.replace(
        new RegExp(hit.replace(/\s+/g, "\\s*")),
        " ",
      );
      break;
    }
  }

  // Rooms — "2+1", "studio"
  const roomsMatch = text.match(/(\d)\s*\+\s*(\d)/);
  if (roomsMatch) {
    result.rooms = `${roomsMatch[1]}+${roomsMatch[2]}`;
    text = text.replace(roomsMatch[0], " ");
  } else if (/\bstudio\b/.test(text)) {
    result.rooms = "Studio";
  }

  // Purpose
  if (RENT_KEYWORDS.some((k) => text.includes(k)))
    result.purpose = ListingPurpose.RENT;
  else if (SALE_KEYWORDS.some((k) => text.includes(k)))
    result.purpose = ListingPurpose.SALE;

  // Type
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) {
      result.type = type;
      break;
    }
  }

  // Budget — money tokens like 200k, 1.2m, 200000, ranges "100k-200k"
  const money = parseMoneyTokens(text);
  if (money.length >= 2) {
    result.budgetMin = Math.min(money[0], money[1]);
    result.budgetMax = Math.max(money[0], money[1]);
  } else if (money.length === 1) {
    const value = money[0];
    if (/\b(min|from|over|above|>)\s*\d/.test(text)) result.budgetMin = value;
    else result.budgetMax = value; // single figure = budget ceiling
  }

  return result;
}

function parseMoneyTokens(text: string): number[] {
  const values: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(k|m)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const num = parseFloat(m[1].replace(",", "."));
    const suffix = (m[2] ?? "").toLowerCase();
    let value: number | null = null;
    if (suffix === "k") value = num * 1_000;
    else if (suffix === "m") value = num * 1_000_000;
    else if (num >= 1_000) value = num; // bare large number = absolute amount
    if (value != null) values.push(Math.round(value));
  }
  return values;
}
