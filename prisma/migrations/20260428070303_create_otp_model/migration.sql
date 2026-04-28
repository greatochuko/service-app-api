/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "jobId" TEXT;

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Otp_identifier_isUsed_idx" ON "Otp"("identifier", "isUsed");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_jobId_key" ON "Transaction"("jobId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
