-- CreateTable
CREATE TABLE "ColumnMapping" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "sourceColumns" TEXT NOT NULL,
    "mergeStrategy" TEXT NOT NULL DEFAULT 'first',
    "separator" TEXT NOT NULL DEFAULT ' ',
    "template" TEXT NOT NULL DEFAULT '',
    "prefix" TEXT NOT NULL DEFAULT '',
    "suffix" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnMapping_supplierId_targetField_key" ON "ColumnMapping"("supplierId", "targetField");

-- AddForeignKey
ALTER TABLE "ColumnMapping" ADD CONSTRAINT "ColumnMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
