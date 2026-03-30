-- Add barcode column to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "barcode" TEXT NOT NULL DEFAULT '';

-- Copy itemName to barcode for any existing data
UPDATE "OrderItem" SET "barcode" = "itemName" WHERE "barcode" = '';

-- Drop old index and create new one on barcode
DROP INDEX "OrderItem_itemName_orderId_idx";
CREATE INDEX "OrderItem_barcode_orderId_idx" ON "OrderItem"("barcode", "orderId");
