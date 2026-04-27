/*
  Warnings:

  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "JobPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- DropIndex
DROP INDEX "User_phoneNumber_key";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "paymentStatus" "JobPaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "phoneNumber" DROP NOT NULL;
