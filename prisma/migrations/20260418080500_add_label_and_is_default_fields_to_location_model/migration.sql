-- CreateEnum
CREATE TYPE "LocationLabel" AS ENUM ('HOME', 'WORK', 'OTHER');

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" "LocationLabel" NOT NULL DEFAULT 'HOME';
