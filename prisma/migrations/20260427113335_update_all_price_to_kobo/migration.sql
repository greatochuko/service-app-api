/*
  Warnings:

  - You are about to drop the column `price` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Quote` table. All the data in the column will be lost.
  - Added the required column `priceKobo` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "price",
ADD COLUMN     "priceKobo" INTEGER;

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "price",
ADD COLUMN     "priceKobo" INTEGER NOT NULL;
