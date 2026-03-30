/*
  Warnings:

  - You are about to drop the column `location` on the `Service` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Service_location_idx";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "location";
