-- CreateEnum
CREATE TYPE "FinancingType" AS ENUM ('CASH', 'MORTGAGE');

-- CreateEnum
CREATE TYPE "Residency" AS ENUM ('CITIZEN', 'FOREIGN');

-- CreateEnum
CREATE TYPE "BuildType" AS ENUM ('NEW', 'OLD');

-- CreateEnum
CREATE TYPE "OwnerRating" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'DIFFICULT', 'PROBLEM', 'BLACKLIST');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "financing" "FinancingType",
ADD COLUMN     "residency" "Residency";

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "buildType" "BuildType",
ADD COLUMN     "favoriteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasElevator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasGarden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasParking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPool" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSeaView" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFurnished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyDues" DECIMAL(10,2),
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "owner_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "whatsapp" TEXT,
    "telegram" TEXT,
    "address" TEXT,
    "rating" "OwnerRating" NOT NULL DEFAULT 'AVERAGE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owner_profiles_companyId_idx" ON "owner_profiles"("companyId");

-- CreateIndex
CREATE INDEX "owner_profiles_companyId_rating_idx" ON "owner_profiles"("companyId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "owner_profiles_companyId_phone_key" ON "owner_profiles"("companyId", "phone");

-- AddForeignKey
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
