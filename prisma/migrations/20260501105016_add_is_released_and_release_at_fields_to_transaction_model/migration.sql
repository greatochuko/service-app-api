/*
  Warnings:

  - Added the required column `releaseAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "releaseAt" TIMESTAMP(3) NOT NULL;
