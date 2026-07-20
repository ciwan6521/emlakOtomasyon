-- LeadKind TENANT_SEEKER
ALTER TYPE "LeadKind" ADD VALUE IF NOT EXISTS 'TENANT_SEEKER';

-- Document types
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'LEASE';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'INVENTORY';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'HANDOVER';

-- Notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RENT_DUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RENT_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LEASE_EXPIRING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MAINTENANCE';

-- Rental enums
CREATE TYPE "PricePeriod" AS ENUM ('TOTAL', 'MONTHLY', 'NIGHTLY', 'WEEKLY');
CREATE TYPE "RentalTermType" AS ENUM ('LONG_TERM', 'SHORT_TERM', 'SEASONAL');
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'APPLICATION', 'APPROVED', 'ACTIVE', 'NOTICE_GIVEN', 'EXPIRED', 'TERMINATED');
CREATE TYPE "RentalPipelineStage" AS ENUM ('APPLICATION', 'SCREENING', 'LEASE_SIGNED', 'MOVE_IN', 'ACTIVE', 'NOTICE', 'VACATED');
CREATE TYPE "RentPaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED');
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'PARTIALLY_RETURNED', 'RETURNED', 'FORFEITED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "HandoverType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'KEY_HANDOVER');
CREATE TYPE "AvailabilityKind" AS ENUM ('BOOKED', 'BLOCKED', 'OWNER_USE', 'LEASE');
CREATE TYPE "AppointmentKind" AS ENUM ('VIEWING', 'CHECK_IN', 'CHECK_OUT', 'KEY_HANDOVER', 'INSPECTION');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- Property rental fields
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "pricePeriod" "PricePeriod" NOT NULL DEFAULT 'TOTAL';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rentalTermType" "RentalTermType";
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "availableFrom" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "minLeaseMonths" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "minStayNights" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "nightlyRate" DECIMAL(14,2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(14,2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "managementFeePct" DOUBLE PRECISION;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "strChannels" JSONB;

UPDATE "properties" SET "pricePeriod" = 'MONTHLY' WHERE "purpose" = 'RENT' AND "pricePeriod" = 'TOTAL';

-- Customer rental fields
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferredPurpose" "ListingPurpose";
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "moveInDate" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "leaseMonths" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "petsAllowed" BOOLEAN;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "occupants" INTEGER;

UPDATE "customers" SET "preferredPurpose" = 'RENT' WHERE "kind" = 'TENANT' AND "preferredPurpose" IS NULL;

-- Appointments kind
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "kind" "AppointmentKind" NOT NULL DEFAULT 'VIEWING';

-- Leases
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "pipelineStage" "RentalPipelineStage" NOT NULL DEFAULT 'APPLICATION',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" DECIMAL(14,2) NOT NULL,
    "depositAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "managementFeePct" DOUBLE PRECISION,
    "rentDueDay" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "signedAt" TIMESTAMP(3),
    "moveInAt" TIMESTAMP(3),
    "moveOutAt" TIMESTAMP(3),
    "renewedFromId" TEXT,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rent_payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "RentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "method" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rent_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "owner_payouts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "ownerName" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRent" DECIMAL(14,2) NOT NULL,
    "managementFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "owner_payouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "leaseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "reportedBy" TEXT,
    "assignedToId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "handover_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "HandoverType" NOT NULL,
    "checklist" JSONB,
    "keysGiven" INTEGER,
    "notes" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "handover_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "kind" "AvailabilityKind" NOT NULL DEFAULT 'BOOKED',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leases_companyId_status_idx" ON "leases"("companyId", "status");
CREATE INDEX "leases_companyId_propertyId_idx" ON "leases"("companyId", "propertyId");
CREATE INDEX "leases_companyId_customerId_idx" ON "leases"("companyId", "customerId");
CREATE INDEX "leases_companyId_endDate_idx" ON "leases"("companyId", "endDate");
CREATE INDEX "rent_payments_companyId_leaseId_dueDate_idx" ON "rent_payments"("companyId", "leaseId", "dueDate");
CREATE INDEX "rent_payments_companyId_status_dueDate_idx" ON "rent_payments"("companyId", "status", "dueDate");
CREATE INDEX "owner_payouts_companyId_propertyId_periodStart_idx" ON "owner_payouts"("companyId", "propertyId", "periodStart");
CREATE INDEX "maintenance_requests_companyId_propertyId_status_idx" ON "maintenance_requests"("companyId", "propertyId", "status");
CREATE INDEX "availability_blocks_companyId_propertyId_startDate_endDate_idx" ON "availability_blocks"("companyId", "propertyId", "startDate", "endDate");

ALTER TABLE "leases" ADD CONSTRAINT "leases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rent_payments" ADD CONSTRAINT "rent_payments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_payouts" ADD CONSTRAINT "owner_payouts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "owner_payouts" ADD CONSTRAINT "owner_payouts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handover_records" ADD CONSTRAINT "handover_records_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Task types for rental operations
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'MAINTENANCE';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'KEY_HANDOVER';
