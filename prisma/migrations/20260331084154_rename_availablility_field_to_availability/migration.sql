/*
  Warnings:

  - You are about to drop the column `availablility` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "availablility",
ADD COLUMN     "availability" JSONB;
