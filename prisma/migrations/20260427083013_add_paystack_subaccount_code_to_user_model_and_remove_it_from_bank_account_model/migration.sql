/*
  Warnings:

  - You are about to drop the column `paystackSubaccountCode` on the `BankAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "paystackSubaccountCode";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paystackSubaccountCode" TEXT;
