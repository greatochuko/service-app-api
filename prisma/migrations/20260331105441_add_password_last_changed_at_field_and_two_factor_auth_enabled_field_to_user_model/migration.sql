-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordLastChangedAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorAuthEnabled" BOOLEAN NOT NULL DEFAULT false;
