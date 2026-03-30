import Papa from "papaparse";

export interface CsvRow {
  itemName: string;
  barcode: string;
  quantity: number;
  orderNumber: string;
}

export interface ParsedOrder {
  orderNumber: string;
  items: { itemName: string; barcode: string; quantity: number }[];
}

export function parseCsvText(text: string): CsvRow[] {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const rows: CsvRow[] = [];
  for (const row of result.data as Record<string, string>[]) {
    const itemName = (
      row["Item Name"] || row["item name"] || row["ItemName"] || row["item_name"] || ""
    ).trim();
    const barcode = (
      row["Barcode"] || row["barcode"] || row["BARCODE"] || row["bar_code"] || ""
    ).trim();
    const quantityStr = (
      row["Quantity"] || row["quantity"] || row["Qty"] || row["qty"] || "0"
    ).trim();
    const orderNumber = (
      row["Order Number"] || row["order number"] || row["OrderNumber"] || row["order_number"] || ""
    ).trim();

    if (!itemName || !orderNumber || !barcode) continue;

    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) continue;

    rows.push({ itemName, barcode, quantity, orderNumber });
  }

  return rows;
}

export function groupByOrder(rows: CsvRow[]): ParsedOrder[] {
  const orderMap = new Map<string, { itemName: string; barcode: string; quantity: number }[]>();

  for (const row of rows) {
    const existing = orderMap.get(row.orderNumber) || [];
    const existingItem = existing.find((i) => i.barcode === row.barcode);
    if (existingItem) {
      existingItem.quantity += row.quantity;
    } else {
      existing.push({ itemName: row.itemName, barcode: row.barcode, quantity: row.quantity });
    }
    orderMap.set(row.orderNumber, existing);
  }

  return Array.from(orderMap.entries()).map(([orderNumber, items]) => ({
    orderNumber,
    items,
  }));
}
