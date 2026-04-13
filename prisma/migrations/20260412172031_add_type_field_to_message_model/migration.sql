-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('CHAT', 'SYSTEM');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'CHAT';
