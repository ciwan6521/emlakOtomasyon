-- Replace the Region enum: Montenegrin towns become Podgorica neighbourhoods.
--
-- Postgres cannot remove values from an enum in place, so a new type is built,
-- every column is converted through a text mapping, and the old type is
-- dropped. Existing rows keep working: anything already tagged PODGORICA
-- becomes CENTAR, every coastal town collapses to OTHER.

CREATE TYPE "Region_new" AS ENUM (
  'CENTAR', 'NOVA_VAROS', 'STARA_VAROS', 'PREKO_MORACE', 'CITY_KVART',
  'BLOK_V', 'BLOK_VI', 'BLOK_IX', 'STARI_AERODROM', 'ZABJELO',
  'CVIJETIN_BRIJEG', 'SADINE', 'KONIK', 'VRELA_RIBNICKA', 'DRAC',
  'MOMISICI', 'KRUSEVAC', 'GORICA', 'LJUBOVIC', 'DAHNA',
  'TOLOSI', 'ZAGORIC', 'MASLINE', 'POBREZJE', 'ZLATICA',
  'MALO_BRDO', 'KAKARICKA_GORA', 'TUSKI_PUT', 'MURTOVINA', 'CEPURCI',
  'DONJA_GORICA', 'GORNJA_GORICA', 'DONJI_KOKOTI', 'GORNJI_KOKOTI', 'LJESKOPOLJE',
  'DAJBABE', 'FARMACI', 'MAREZA', 'ROGAMI', 'DOLJANI',
  'BERI', 'BOTUN', 'CIJEVNA', 'KUCE_RAKICA', 'TUZI',
  'GOLUBOVCI', 'ZETA', 'OTHER'
);

CREATE OR REPLACE FUNCTION "region_to_district"(old text) RETURNS "Region_new" AS $$
  SELECT CASE
    WHEN old = 'PODGORICA' THEN 'CENTAR'::"Region_new"
    WHEN old IS NULL THEN NULL
    ELSE 'OTHER'::"Region_new"
  END;
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE "branches"
  ALTER COLUMN "region" TYPE "Region_new"
  USING "region_to_district"("region"::text);

ALTER TABLE "leads"
  ALTER COLUMN "region" TYPE "Region_new"
  USING "region_to_district"("region"::text);

ALTER TABLE "properties"
  ALTER COLUMN "region" TYPE "Region_new"
  USING "region_to_district"("region"::text);

-- A USING clause may not contain a subquery, so the array conversion lives in
-- its own function.
CREATE OR REPLACE FUNCTION "regions_to_districts"(old "Region"[]) RETURNS "Region_new"[] AS $$
  SELECT COALESCE(array_agg(DISTINCT "region_to_district"(r::text)), '{}'::"Region_new"[])
  FROM unnest(old) AS r;
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE "customers"
  ALTER COLUMN "preferredRegions" TYPE "Region_new"[]
  USING "regions_to_districts"("preferredRegions");

DROP FUNCTION "regions_to_districts"("Region"[]);
DROP FUNCTION "region_to_district"(text);
DROP TYPE "Region";
ALTER TYPE "Region_new" RENAME TO "Region";
