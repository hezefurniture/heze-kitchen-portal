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
  mappings: ColumnMappingConfig[],
  options?: { allowEmptyBarcode?: boolean }
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

    if (!itemName || !orderNumber) continue;
    if (!barcode && !options?.allowEmptyBarcode) continue;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) continue;
    rows.push({ itemName, barcode: barcode || "", quantity, orderNumber });
  }

  return rows;
}

export async function parseFileToRawRows(
  file: File
): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    const PapaMod = await import("papaparse");
    const Papa = PapaMod.default || PapaMod;
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });
    return result.data as Record<string, string>[];
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSXMod = await import("xlsx");
    const XLSX = (XLSXMod as any).default || XLSXMod;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // First try default parsing (header in row 1)
    const defaultRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }) as Record<string, string>[];
    if (defaultRows.length > 0) {
      const firstKeys = Object.keys(defaultRows[0]);
      const hasRealHeaders = firstKeys.some((k) => !k.startsWith("__EMPTY"));
      if (hasRealHeaders) return defaultRows;
    }

    // Headers not in row 1 — scan raw rows to find the header row
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as any[][];
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      const row = allRows[i];
      if (!Array.isArray(row)) continue;
      const nonEmpty = row.filter((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
      // A header row should have at least 3 non-empty cells and not look like data
      if (nonEmpty.length >= 3) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1 || headerRowIdx >= allRows.length - 1) {
      return defaultRows; // fallback
    }

    // Build rows using the detected header
    const headers = allRows[headerRowIdx].map((h: any) => String(h).trim());
    const dataRows: Record<string, string>[] = [];
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const cells = allRows[i];
      if (!Array.isArray(cells)) continue;
      const row: Record<string, string> = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue;
        const val = cells[j] !== null && cells[j] !== undefined ? String(cells[j]).trim() : "";
        row[key] = val;
        if (val) hasData = true;
      }
      if (hasData) dataRows.push(row);
    }
    return dataRows;
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}
