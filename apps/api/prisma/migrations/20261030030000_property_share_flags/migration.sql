-- Per-listing opt-in for social autoposting. Existing listings keep today's
-- behaviour (both channels on).
ALTER TABLE "properties"
  ADD COLUMN "shareOnInstagram" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "shareOnFacebook"  BOOLEAN NOT NULL DEFAULT true;
