/*
  Warnings:

  - You are about to drop the column `flutterwaveRef` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `flutterwaveTransferId` on the `Transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Transaction_flutterwaveRef_key";

-- DropIndex
DROP INDEX "Transaction_flutterwaveTransferId_key";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "flutterwaveRef",
DROP COLUMN "flutterwaveTransferId";
