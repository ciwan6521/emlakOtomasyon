-- Add Viber as a first-class messaging channel
ALTER TYPE "CommChannel" ADD VALUE IF NOT EXISTS 'VIBER';

-- Per-user UI language preference (NULL falls back to the company default)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" "Locale";

-- Viber subscriber id per customer
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "viberId" TEXT;

-- Correlate provider status webhooks back to a delivery row
ALTER TABLE "message_deliveries" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;

CREATE INDEX IF NOT EXISTS "message_deliveries_providerMessageId_idx"
  ON "message_deliveries" ("providerMessageId");
