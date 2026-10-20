-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "akrylikReceiptUrl" TEXT;

-- CreateTable
CREATE TABLE "AkrylikPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "omRef" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AkrylikPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AkrylikPackage_code_key" ON "AkrylikPackage"("code");

-- CreateIndex
CREATE INDEX "AkrylikPackage_orderId_idx" ON "AkrylikPackage"("orderId");

-- CreateIndex
CREATE INDEX "AkrylikPackage_deliveryId_idx" ON "AkrylikPackage"("deliveryId");

-- AddForeignKey
ALTER TABLE "AkrylikPackage" ADD CONSTRAINT "AkrylikPackage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AkrylikPackage" ADD CONSTRAINT "AkrylikPackage_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

