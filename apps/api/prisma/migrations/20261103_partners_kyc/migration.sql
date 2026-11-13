-- CreateEnum
CREATE TYPE "MerchantDocumentType" AS ENUM ('CNPJ_CARD', 'SOCIAL_CONTRACT', 'ID_CARD');

-- CreateTable
CREATE TABLE "MerchantDocument" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "MerchantDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantDocument_merchantId_status_idx" ON "MerchantDocument"("merchantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantDocument_merchantId_type_key" ON "MerchantDocument"("merchantId", "type");

-- AddForeignKey
ALTER TABLE "MerchantDocument" ADD CONSTRAINT "MerchantDocument_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

