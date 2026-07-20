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

const REGION_KEYWORDS: Array<[Region, string[]]> = [
  [Region.BUDVA, ["budva"]],
  [Region.KOTOR, ["kotor"]],
  [Region.TIVAT, ["tivat"]],
  [Region.BAR, ["bar"]],
  [Region.HERCEG_NOVI, ["herceg novi", "herceg-novi", "hercegnovi", "herceg"]],
  [Region.PODGORICA, ["podgorica", "podgorice"]],
  [Region.ULCINJ, ["ulcinj", "ulqin"]],
  [Region.CETINJE, ["cetinje"]],
];

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
  let text = ` ${raw.toLowerCase()} `;
  const result: ParsedListingQuery = { raw };

  // Region
  for (const [region, keywords] of REGION_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) {
      result.region = region;
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
