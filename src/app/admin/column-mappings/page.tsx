"use client";

import { useState, useEffect, useCallback } from "react";

interface Supplier {
  id: string;
  name: string;
  slug: string;
}

interface MappingConfig {
  targetField: string;
  sourceColumns: string[];
  mergeStrategy: "first" | "concat" | "template";
  separator: string;
  template: string;
  prefix: string;
  suffix: string;
}

const TARGET_FIELDS = [
  { key: "orderNumber", label: "Order Number" },
  { key: "itemName", label: "Item Name" },
  { key: "barcode", label: "Barcode" },
  { key: "quantity", label: "Quantity" },
  { key: "parentBarcode", label: "Parent Barcode" },
  { key: "parentName", label: "Parent Name" },
];

function emptyMapping(targetField: string): MappingConfig {
  return {
    targetField,
    sourceColumns: [],
    mergeStrategy: "first",
    separator: " ",
    template: "",
    prefix: "",
    suffix: "",
  };
}

export default function ColumnMappingsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [mappings, setMappings] = useState<MappingConfig[]>(
    TARGET_FIELDS.map((f) => emptyMapping(f.key))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [sampleHeaders, setSampleHeaders] = useState<string[]>([]);
  const [newColumnInputs, setNewColumnInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.suppliers || [];
        setSuppliers(list);
        if (list.length > 0) setSelectedSupplier(list[0].id);
      })
      .catch(() => {});
  }, []);

  const loadMappings = useCallback(async () => {
    if (!selectedSupplier) return;
    try {
      const res = await fetch(`/api/column-mappings?supplierId=${selectedSupplier}`);
      const data = await res.json();
      const loaded: MappingConfig[] = TARGET_FIELDS.map((f) => {
        const existing = data.find((m: any) => m.targetField === f.key);
        if (existing) {
          return {
            targetField: existing.targetField,
            sourceColumns: JSON.parse(existing.sourceColumns),
            mergeStrategy: existing.mergeStrategy,
            separator: existing.separator,
            template: existing.template,
            prefix: existing.prefix,
            suffix: existing.suffix,
          };
        }
        return emptyMapping(f.key);
      });
      setMappings(loaded);
    } catch {
      setMappings(TARGET_FIELDS.map((f) => emptyMapping(f.key)));
    }
  }, [selectedSupplier]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const handleSampleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      const text = await file.text();
      const PapaMod = await import("papaparse");
      const Papa = (PapaMod as any).default || PapaMod;
      const result = Papa.parse(text, { header: true, preview: 1, transformHeader: (h: string) => h.trim() });
      setSampleHeaders(result.meta.fields || []);
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSXMod = await import("xlsx");
      const XLSX = (XLSXMod as any).default || XLSXMod;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as any[][];
      // Find the first row with at least 3 non-empty cells (the header row)
      for (let i = 0; i < Math.min(allRows.length, 20); i++) {
        const row = allRows[i];
        if (!Array.isArray(row)) continue;
        const nonEmpty = row.filter((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
        if (nonEmpty.length >= 3) {
          setSampleHeaders(row.map((h: any) => String(h).trim()).filter((h: string) => h !== ""));
          break;
        }
      }
    }
  };

  const updateMapping = (targetField: string, updates: Partial<MappingConfig>) => {
    setMappings((prev) =>
      prev.map((m) => (m.targetField === targetField ? { ...m, ...updates } : m))
    );
  };

  const addSourceColumn = (targetField: string, col: string) => {
    if (!col.trim()) return;
    setMappings((prev) =>
      prev.map((m) =>
        m.targetField === targetField && !m.sourceColumns.includes(col.trim())
          ? { ...m, sourceColumns: [...m.sourceColumns, col.trim()] }
          : m
      )
    );
  };

  const removeSourceColumn = (targetField: string, col: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.targetField === targetField
          ? { ...m, sourceColumns: m.sourceColumns.filter((c) => c !== col) }
          : m
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/column-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: selectedSupplier, mappings }),
      });
      if (res.ok) {
        setMessage("Column mappings saved successfully");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to save");
      }
    } catch {
      setMessage("Failed to save mappings");
    }
    setSaving(false);
  };

  const previewValue = (mapping: MappingConfig): string => {
    if (mapping.sourceColumns.length === 0) return "(not mapped - will use auto-detect)";
    const sampleVals = mapping.sourceColumns.map((c) => `[${c}]`);
    let result = "";
    if (mapping.mergeStrategy === "first") {
      result = sampleVals[0];
    } else if (mapping.mergeStrategy === "concat") {
      result = sampleVals.join(mapping.separator || " ");
    } else if (mapping.mergeStrategy === "template") {
      result = mapping.template || sampleVals.join(" ");
      for (const col of mapping.sourceColumns) {
        result = result.replace(`{${col}}`, `[${col}]`);
      }
    }
    if (mapping.prefix) result = mapping.prefix + result;
    if (mapping.suffix) result = result + mapping.suffix;
    return result;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black text-white mb-2">Column Mappings</h1>
      <p className="text-white/70 mb-6">
        Configure how columns in your CSV/Excel files map to order fields. Each supplier can have different mappings.
      </p>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded text-white font-bold ${message.includes("success") ? "bg-green-500" : "bg-red-500"}`}>
          {message}
        </div>
      )}

      {/* Supplier selector */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Supplier</label>
        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sample file upload */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Load sample file to detect columns (optional)
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Upload a CSV or Excel file to see available column names, then click them to add to mappings.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleSampleFile}
          className="text-sm text-gray-600"
        />
        {sampleHeaders.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-500 mb-1">Detected columns (click to add):</p>
            <div className="flex flex-wrap gap-1">
              {sampleHeaders.map((h) => (
                <span key={h} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded cursor-default font-mono">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mapping cards */}
      <div className="space-y-4">
        {TARGET_FIELDS.map((field) => {
          const mapping = mappings.find((m) => m.targetField === field.key)!;
          return (
            <div key={field.key} className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">{field.label}</h3>
                <span className="text-xs text-gray-400 font-mono">{field.key}</span>
              </div>

              {/* Source columns */}
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-500 mb-1">Source Column(s)</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {mapping.sourceColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded text-sm font-mono"
                    >
                      {col}
                      <button
                        onClick={() => removeSourceColumn(field.key, col)}
                        className="text-red-400 hover:text-red-600 font-bold ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                {/* Add from detected headers */}
                {sampleHeaders.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sampleHeaders
                      .filter((h) => !mapping.sourceColumns.includes(h))
                      .map((h) => (
                        <button
                          key={h}
                          onClick={() => addSourceColumn(field.key, h)}
                          className="text-xs bg-gray-100 hover:bg-accent/20 text-gray-600 hover:text-accent px-2 py-1 rounded font-mono transition"
                        >
                          + {h}
                        </button>
                      ))}
                  </div>
                )}
                {/* Manual add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newColumnInputs[field.key] || ""}
                    onChange={(e) =>
                      setNewColumnInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addSourceColumn(field.key, newColumnInputs[field.key] || "");
                        setNewColumnInputs((prev) => ({ ...prev, [field.key]: "" }));
                      }
                    }}
                    placeholder="Type column name..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    onClick={() => {
                      addSourceColumn(field.key, newColumnInputs[field.key] || "");
                      setNewColumnInputs((prev) => ({ ...prev, [field.key]: "" }));
                    }}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold text-gray-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Merge strategy - only show if multiple columns */}
              {mapping.sourceColumns.length > 1 && (
                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Merge Strategy
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "first", label: "First non-empty" },
                      { value: "concat", label: "Concatenate" },
                      { value: "template", label: "Template" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          updateMapping(field.key, { mergeStrategy: opt.value as any })
                        }
                        className={`px-3 py-1 rounded text-sm font-bold transition ${
                          mapping.mergeStrategy === opt.value
                            ? "bg-accent text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {mapping.mergeStrategy === "concat" && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">Separator</label>
                      <input
                        type="text"
                        value={mapping.separator}
                        onChange={(e) => updateMapping(field.key, { separator: e.target.value })}
                        placeholder="e.g. space, dash, comma..."
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}

                  {mapping.mergeStrategy === "template" && (
                    <div className="mt-2">
                      <label className="block text-xs text-gray-500 mb-1">
                        Template (use {"{ColumnName}"} placeholders)
                      </label>
                      <input
                        type="text"
                        value={mapping.template}
                        onChange={(e) => updateMapping(field.key, { template: e.target.value })}
                        placeholder={`e.g. {${mapping.sourceColumns[0] || "Col1"}} - {${mapping.sourceColumns[1] || "Col2"}}`}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Prefix / Suffix */}
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Prefix (prepend)</label>
                  <input
                    type="text"
                    value={mapping.prefix}
                    onChange={(e) => updateMapping(field.key, { prefix: e.target.value })}
                    placeholder="e.g. ORD-"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Suffix (append)</label>
                  <input
                    type="text"
                    value={mapping.suffix}
                    onChange={(e) => updateMapping(field.key, { suffix: e.target.value })}
                    placeholder="e.g. -UK"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded px-3 py-2">
                <span className="text-xs text-gray-500">Preview: </span>
                <span className="text-sm text-gray-700 font-mono">{previewValue(mapping)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Mappings"}
      </button>
    </div>
  );
}
