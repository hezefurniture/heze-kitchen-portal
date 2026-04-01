export interface ParsedRow {
  itemName: string;
  barcode: string;
  quantity: number;
  orderNumber: string;
}

export interface ColumnMappingConfig {
  targetField: string;
  sourceColumns: string[];
  mergeStrategy: "first" | "concat" | "template";
  separator: string;
  template: string;
  prefix: string;
  suffix: string;
}

function applyMapping(
  row: Record<string, string>,
  mapping: ColumnMappingConfig
): string {
  const values = mapping.sourceColumns.map((col) => (row[col] || "").trim());
  let result = "";

  if (mapping.mergeStrategy === "first") {
    result = values.find((v) => v !== "") || "";
  } else if (mapping.mergeStrategy === "concat") {
    result = values.filter((v) => v !== "").join(mapping.separator || " ");
  } else if (mapping.mergeStrategy === "template") {
    result = mapping.template;
    for (let i = 0; i < mapping.sourceColumns.length; i++) {
      result = result.replaceAll(`{${mapping.sourceColumns[i]}}`, values[i]);
    }
  }

  if (mapping.prefix) result = mapping.prefix + result;
  if (mapping.suffix) result = result + mapping.suffix;

  return result;
}

// Fallback auto-detect when no mapping is configured for a field
const FALLBACK_NAMES: Record<string, string[]> = {
  itemName: ["Item Name", "item name", "ItemName", "item_name", "Name", "name", "Product", "product", "Description", "description"],
  barcode: ["Barcode", "barcode", "BARCODE", "bar_code", "Bar Code", "EAN", "ean", "UPC", "upc", "SKU", "sku"],
  quantity: ["Quantity", "quantity", "Qty", "qty", "QTY", "Amount", "amount", "Count", "count"],
  orderNumber: ["Order Number", "order number", "OrderNumber", "order_number", "Order", "order", "Order No", "order_no", "OrderNo"],
};

function autoDetectValue(row: Record<string, string>, targetField: string): string {
  const names = FALLBACK_NAMES[targetField] || [];
  for (const name of names) {
    if (row[name] !== undefined && row[name].trim() !== "") {
      return row[name].trim();
    }
  }
  return "";
}

export function applyMappingsToRows(
  rawRows: Record<string, string>[],
  mappings: ColumnMappingConfig[]
): ParsedRow[] {
  const mappingMap = new Map<string, ColumnMappingConfig>();
  for (const m of mappings) {
    if (m.sourceColumns.length > 0) {
      mappingMap.set(m.targetField, m);
    }
  }

  const rows: ParsedRow[] = [];
  for (const raw of rawRows) {
    const itemName = mappingMap.has("itemName")
      ? applyMapping(raw, mappingMap.get("itemName")!)
      : autoDetectValue(raw, "itemName");
    const barcode = mappingMap.has("barcode")
      ? applyMapping(raw, mappingMap.get("barcode")!)
      : autoDetectValue(raw, "barcode");
    const quantityStr = mappingMap.has("quantity")
      ? applyMapping(raw, mappingMap.get("quantity")!)
      : autoDetectValue(raw, "quantity");
    const orderNumber = mappingMap.has("orderNumber")
      ? applyMapping(raw, mappingMap.get("orderNumber")!)
      : autoDetectValue(raw, "orderNumber");

    if (!itemName || !barcode || !orderNumber) continue;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) continue;
    rows.push({ itemName, barcode, quantity, orderNumber });
  }

  return rows;
}

export async function parseFileToRawRows(
  file: File
): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const Papa = (await import("papaparse")).default;
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });
    return result.data as Record<string, string>[];
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    });
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
