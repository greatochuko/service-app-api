/*
  Warnings:

  - Made the column `paystackSubaccountCode` on table `Wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "paystackSubaccountCode" SET NOT NULL;
