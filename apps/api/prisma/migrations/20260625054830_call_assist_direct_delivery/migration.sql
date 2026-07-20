-- AlterTable
ALTER TABLE "message_deliveries" ADD COLUMN     "body" TEXT,
ADD COLUMN     "context" TEXT,
ALTER COLUMN "campaignId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "message_deliveries_companyId_context_createdAt_idx" ON "message_deliveries"("companyId", "context", "createdAt");
