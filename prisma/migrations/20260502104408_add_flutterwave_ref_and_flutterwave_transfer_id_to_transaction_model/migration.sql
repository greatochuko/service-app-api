/*
  Warnings:

  - A unique constraint covering the columns `[flutterwaveRef]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[flutterwaveTransferId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "flutterwaveRef" TEXT,
ADD COLUMN     "flutterwaveTransferId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_flutterwaveRef_key" ON "Transaction"("flutterwaveRef");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_flutterwaveTransferId_key" ON "Transaction"("flutterwaveTransferId");
