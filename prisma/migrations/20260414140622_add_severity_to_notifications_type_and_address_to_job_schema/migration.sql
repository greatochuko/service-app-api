/*
  Warnings:

  - The values [PAYOUT,MESSAGE,ALERT] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('PAYMENT', 'JOB', 'SYSTEM');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO';
