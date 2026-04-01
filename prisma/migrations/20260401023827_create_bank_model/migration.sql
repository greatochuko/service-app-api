-- CreateTable
CREATE TABLE "banks" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "longcode" TEXT,
    "gateway" TEXT,
    "pay_with_bank" BOOLEAN NOT NULL DEFAULT false,
    "supports_transfer" BOOLEAN NOT NULL DEFAULT true,
    "available_for_direct_debit" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "type" TEXT NOT NULL DEFAULT 'nuban',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_slug_key" ON "banks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "banks_code_key" ON "banks"("code");
