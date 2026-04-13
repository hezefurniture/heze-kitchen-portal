-- AlterTable
ALTER TABLE "Order" ADD COLUMN "movedToStockAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "movedToStockBy" TEXT;
