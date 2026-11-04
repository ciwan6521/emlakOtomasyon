#!/usr/bin/env node
/**
 * Imports C:\\Users\\Na\\Desktop\\ilandetay Instagram listings into REOS.
 * Does not post to Instagram or Facebook — only stores the original permalink.
 *
 *   $env:API_URL="https://pointstepup.com/api/v1"
 *   $env:IMPORT_EMAIL="admin@..."
 *   $env:IMPORT_PASSWORD="..."
 *   $env:SOURCE_DIR="C:\\Users\\Na\\Desktop\\ilandetay"
 *   node scripts/import-instagram-listings.js
 */
const fs = require("fs");
const path = require("path");

const API_URL = (process.env.API_URL || "http://127.0.0.1:4010/api/v1").replace(
  /\/$/,
  "",
);
const SOURCE_DIR = process.env.SOURCE_DIR || "C:\\Users\\Na\\Desktop\\ilandetay";
const ILAN_DIR = path.join(SOURCE_DIR, "ilanlar");
const PROGRESS = path.join(SOURCE_DIR, "_import_progress.json");

const REGION_MAP = {
  zabjelo: "ZABJELO",
  "stari aerodrom": "STARI_AERODROM",
  "city kvart": "CITY_KVART",
  "siti kvart": "CITY_KVART",
  "central point": "CENTRAL_POINT",
  "preko morace": "PREKO_MORACE",
  centar: "CENTAR",
  zagoric: "ZAGORIC",
  pobrezje: "POBREZJE",
  "master kvart": "MASTER_KVART",
  dalmatinska: "DALMATINSKA",
  ljubovic: "LJUBOVIC",
  gorica: "GORICA",
  "blok 9": "BLOK_IX",
  momisici: "MOMISICI",
  tolosi: "TOLOSI",
  "new city": "NEW_CITY",
  "tuski put": "TUSKI_PUT",
  "stara varos": "STARA_VAROS",
  masline: "MASLINE",
  "donja gorica": "DONJA_GORICA",
  "atlas capital": "ATLAS_CAPITAL",
  "vezirov most": "VEZIROV_MOST",
  "blok 6": "BLOK_VI",
  zelenika: "ZELENIKA",
  "malo brdo": "MALO_BRDO",
  baston: "BASTON",
  zlatica: "ZLATICA",
  "rimski trg": "RIMSKI_TRG",
  "green level": "GREEN_LEVEL",
  "toloska suma": "TOLOSKA_SUMA",
  "krivi most": "KRIVI_MOST",
  "blok 5": "BLOK_V",
  murtovina: "MURTOVINA",
  grbe: "GRBE",
  "lumen home": "LUMEN_HOME",
  "city kej": "CITY_KEJ",
  "premium kvart": "PREMIUM_KVART",
  linea: "LINEA",
  "ulica crnogorskih serdara": "OTHER",
  "iza delte": "IZA_DELTE",
  "partizanski put": "OTHER",
  "marka radovica 4": "OTHER",
  gintas: "GINTAS",
  tuzi: "TUZI",
  "ispod gorice": "ISPOD_GORICE",
  konik: "KONIK",
  "u blizini kalitala": "OTHER",
  krusevac: "KRUSEVAC",
  podgorica: "OTHER",
  drac: "DRAC",
  "vranjske njive": "VRANJSKE_NJIVE",
  "dadi plaza": "DADI_PLAZA",
  "karabusko polje": "KARABUSKO_POLJE",
  "cortex selo": "CORTEX_SELO",
  "ul. 4. jula": "POBREZJE",
  "cezar apartmani": "CEZAR_APARTMANI",
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

function norm(input) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value, max) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function mapRegion(raw) {
  return REGION_MAP[norm(raw)] || "OTHER";
}

function mapRooms(raw) {
  if (raw === "" || raw == null) return "—";
  const n = Number(raw);
  if (n === 0) return "0+1";
  if (Number.isFinite(n)) return `${n}+1`;
  return String(raw);
}

function mapType(raw) {
  if (raw === "house") return "HOUSE";
  if (raw === "villa") return "VILLA";
  if (raw === "land") return "LAND";
  if (raw === "office") return "OFFICE";
  return "APARTMENT";
}

function mapPurpose(raw) {
  return raw === "sale" || raw === "sale_or_rent" ? "SALE" : "RENT";
}

function mapStatus(availability) {
  const t = norm(availability);
  if (/(izdat|izdata|kiralan|prodato|\bsold\b)/.test(t)) return "RENTED";
  return "ACTIVE_LISTING";
}

function mapBuild(raw) {
  if (raw === "new_building") return "NEW";
  if (raw === "second_hand") return "OLD";
  return undefined;
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS, "utf8"));
  } catch {
    return { done: {}, usedRefs: {} };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
}

async function api(token, method, urlPath, body, extraHeaders) {
  const headers = {
    ...(extraHeaders || {}),
    Authorization: `Bearer ${token}`,
  };
  const opts = { method, headers };
  if (body !== undefined && !(body instanceof Buffer)) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (body instanceof Buffer) {
    opts.body = body;
  }
  const res = await fetch(`${API_URL}${urlPath}`, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { title: text };
  }
  if (!res.ok) {
    const err = new Error(
      data?.detail || data?.title || `${res.status} ${urlPath}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function uniqueReference(listing, folder, used) {
  const base = String(listing.listing_code || "").trim() || folder;
  let ref = clip(base, 40);
  let i = 2;
  while (used[ref]) {
    const suffix = `-${i}`;
    ref = clip(base, 40 - suffix.length) + suffix;
    i += 1;
  }
  return ref;
}

async function alreadyImported(token, reference) {
  const page = await api(
    token,
    "GET",
    `/properties?search=${encodeURIComponent(reference)}&pageSize=20`,
  );
  const rows = page?.data ?? [];
  return rows.some((p) => p.reference === reference);
}

async function uploadPhotos(token, propertyId, folder, photos) {
  let position = 0;
  for (const name of photos) {
    const filePath = path.join(ILAN_DIR, folder, name);
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(name).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".mp4"
            ? "video/mp4"
            : "image/jpeg";
    const presign = await api(token, "POST", `/properties/${propertyId}/media/presign`, {
      filename: name,
      contentType,
    });
    const put = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: buf,
    });
    if (!put.ok) {
      throw new Error(`Photo upload failed ${name} (${put.status})`);
    }
    await api(token, "POST", `/properties/${propertyId}/media`, {
      type: contentType.startsWith("video") ? "VIDEO" : "PHOTO",
      url: presign.publicUrl,
      isCover: position === 0,
      position,
    });
    position += 1;
  }
  return position;
}

async function main() {
  const email = required("IMPORT_EMAIL");
  const password = required("IMPORT_PASSWORD");
  const folders = fs
    .readdirSync(ILAN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
  const login = await loginRes.json();
  const token = login.accessToken;
  if (!token) throw new Error("Login did not return accessToken");

  const progress = loadProgress();
  const used = {};
  for (const row of Object.values(progress.done || {})) {
    if (row?.reference) used[row.reference] = true;
  }
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < folders.length; i += 1) {
    const folder = folders[i];
    const jsonPath = path.join(ILAN_DIR, folder, "ilan.json");
    if (!fs.existsSync(jsonPath)) continue;
    if (progress.done[folder]) {
      skipped += 1;
      continue;
    }
    const listing = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const reference = uniqueReference(listing, folder, used);
    process.stdout.write(`[${i + 1}/${folders.length}] ${reference} `);
    try {
      if (await alreadyImported(token, reference)) {
        progress.done[folder] = { id: "existing", reference };
        skipped += 1;
        console.log("skip (exists)");
        saveProgress(progress);
        continue;
      }
      const features = new Set(listing.features || []);
      const createdListing = await api(token, "POST", "/properties", {
        reference,
        title: clip(listing.title || `Listing ${reference}`, 180),
        type: mapType(listing.property_type),
        purpose: mapPurpose(listing.purpose),
        region: mapRegion(listing.region),
        status: mapStatus(listing.availability),
        existingInstagramUrl: listing.source?.instagram_url || undefined,
        address: clip(
          listing.address || listing.region || "Podgorica",
          300,
        ),
        neighborhood: clip(listing.region, 120) || undefined,
        price: Number(listing.price) || 0,
        pricePeriod: mapPurpose(listing.purpose) === "RENT" ? "MONTHLY" : "TOTAL",
        rooms: mapRooms(listing.rooms),
        sizeM2: Number(listing.size_m2) || 0,
        floor: Number.parseInt(listing.floor, 10) || undefined,
        buildType: mapBuild(listing.building_status),
        monthlyDues: Number(listing.dues) || undefined,
        description: clip(listing.description, 5000) || undefined,
        ownerName: clip(listing.owner?.name, 160) || "—",
        ownerPhone: clip(listing.owner?.phone, 40) || "—",
        hasElevator: features.has("elevator"),
        hasParking: features.has("parking"),
        hasBalcony: features.has("balcony"),
        isFurnished: features.has("furnished"),
        hasSeaView: features.has("sea_view"),
        hasPool: features.has("pool"),
        hasGarden: features.has("garden"),
        shareOnInstagram: false,
        shareOnFacebook: false,
      });
      const photos = Array.isArray(listing.photos) ? listing.photos : [];
      const uploaded = await uploadPhotos(
        token,
        createdListing.id,
        folder,
        photos,
      );
      used[reference] = true;
      progress.done[folder] = { id: createdListing.id, reference, photos: uploaded };
      created += 1;
      console.log(`ok ${createdListing.status} photos=${uploaded}`);
      saveProgress(progress);
    } catch (err) {
      failed += 1;
      console.log(`FAIL ${err.message}`);
      fs.appendFileSync(
        path.join(SOURCE_DIR, "_import_errors.log"),
        `${folder} ${reference} ${err.message}\n`,
      );
    }
  }

  console.log(
    `done created=${created} skipped=${skipped} failed=${failed} total=${folders.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
