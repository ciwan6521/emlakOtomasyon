-- LeadStatus workflow migration (Turkish call-center flow)
CREATE TYPE "LeadStatus_new" AS ENUM (
  'NEW', 'TO_CALL', 'CALLING', 'FOLLOW_UP', 'POTENTIAL', 'AGREED', 'IN_PORTFOLIO', 'PASSIVE', 'BLACKLIST'
);

ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus_new" USING (
  CASE "status"::text
    WHEN 'CONTACTED' THEN 'TO_CALL'
    WHEN 'QUALIFIED' THEN 'CALLING'
    WHEN 'INTERESTED' THEN 'POTENTIAL'
    WHEN 'NOT_INTERESTED' THEN 'PASSIVE'
    WHEN 'CONVERTED' THEN 'IN_PORTFOLIO'
    ELSE "status"::text
  END::"LeadStatus_new"
);
DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CallResult additions
ALTER TYPE "CallResult" ADD VALUE IF NOT EXISTS 'SELLING_OWN';
ALTER TYPE "CallResult" ADD VALUE IF NOT EXISTS 'WITH_COMPETITOR';
ALTER TYPE "CallResult" ADD VALUE IF NOT EXISTS 'AGREED';

-- LeadSource BOT
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'BOT';

-- OnboardingStatus tabs
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'MISSING_INFO';
ALTER TYPE "OnboardingStatus" ADD VALUE IF NOT EXISTS 'READY_TO_PUBLISH';

-- NotificationType expansion
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_LEAD';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_CUSTOMER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CALLBACK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_PORTFOLIO';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRICE_UPDATED';

-- Company settings
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "settings" JSONB;

-- Lead enrichment
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "listingUrl" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "listingPhotoUrl" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "listingPrice" DECIMAL(14,2);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "listingRooms" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastCallAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastCallResult" "CallResult";
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lastNote" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ownerRating" "OwnerRating";

-- Customer enrichment
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastContactAt" TIMESTAMP(3);

-- Property enrichment
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "properties_companyId_publicSlug_key" ON "properties"("companyId", "publicSlug");

-- Owner conversations
CREATE TABLE IF NOT EXISTS "owner_conversations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'CALL',
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "owner_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "owner_conversations_companyId_ownerPhone_createdAt_idx"
  ON "owner_conversations"("companyId", "ownerPhone", "createdAt");

ALTER TABLE "owner_conversations" DROP CONSTRAINT IF EXISTS "owner_conversations_companyId_fkey";
ALTER TABLE "owner_conversations" ADD CONSTRAINT "owner_conversations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Price history
CREATE TABLE IF NOT EXISTS "price_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "oldPrice" DECIMAL(14,2) NOT NULL,
    "newPrice" DECIMAL(14,2) NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "price_history_companyId_propertyId_createdAt_idx"
  ON "price_history"("companyId", "propertyId", "createdAt");

ALTER TABLE "price_history" DROP CONSTRAINT IF EXISTS "price_history_companyId_fkey";
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
