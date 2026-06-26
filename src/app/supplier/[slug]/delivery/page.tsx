"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ColumnMappingConfig } from "@/lib/file-parser";

interface ParsedRow {
  itemName: string;
  barcode: string;
  quantity: number;
  orderNumber: string;
  parentBarcode?: string;
  parentName?: string;
}

interface ParsedFile {
  name: string;
  rows: ParsedRow[];
}

interface OrderGroup {
  orderNumber: string;
  editedOrderNumber: string;
  items: { itemName: string; barcode: string; quantity: number; parentBarcode?: string; parentName?: string }[];
  hezeOrderNumber: string;
  customerName: string;
  postcode: string;
  plinthQty: string;
  weight: string;
  notes: string;
}

export default function DeliveryUploadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [reviewStep, setReviewStep] = useState(false);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [mappings, setMappings] = useState<ColumnMappingConfig[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load column mappings for this supplier
  useEffect(() => {
    fetch(`/api/suppliers?slug=${slug}`)
      .then((r) => r.json())
      .then((supplier) => {
        if (!supplier.id) return;
        return fetch(`/api/column-mappings?supplierId=${supplier.id}`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (!data || !Array.isArray(data)) return;
        const configs: ColumnMappingConfig[] = data.map((m: any) => ({
          targetField: m.targetField,
          sourceColumns: JSON.parse(m.sourceColumns),
          mergeStrategy: m.mergeStrategy,
          separator: m.separator,
          template: m.template,
          prefix: m.prefix,
          suffix: m.suffix,
        }));
        setMappings(configs);
      })
      .catch(() => {});
  }, [slug]);

  const processFile = async (file: File): Promise<ParsedFile | null> => {
    const { parseFileToRawRows, applyMappingsToRows } = await import("@/lib/file-parser");
    const rawRows = await parseFileToRawRows(file);
    if (rawRows.length === 0) {
      setError(`${file.name}: File is empty or has no data rows.`);
      return null;
    }
    const rows = applyMappingsToRows(rawRows, mappings, { allowEmptyBarcode: slug === "extom" });
    if (rows.length === 0) {
      const headers = Object.keys(rawRows[0] || {}).join(", ");
      setError(
        `${file.name}: Could not map any rows. Detected columns: ${headers}. ` +
        `Check column mappings in Admin → Import Mappings, or ensure your file has columns like "Order Number", "Item Name", "Barcode", "Quantity".`
      );
      return null;
    }
    return { name: file.name, rows };
  };

  const handleFiles = async (fileList: FileList) => {
    setError("");
    setParsing(true);
    try {
      const newFiles: ParsedFile[] = [];
      for (const file of Array.from(fileList)) {
        const name = file.name.toLowerCase();
        const isValid = name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls") || file.type === "text/csv";
        if (!isValid) {
          setError(`${file.name}: Unsupported file type. Use CSV or Excel (.xlsx) files.`);
          continue;
        }
        try {
          const result = await processFile(file);
          if (result) newFiles.push(result);
        } catch (err: any) {
          setError(`Error parsing ${file.name}: ${err.message || "Unknown error"}`);
        }
      }
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message || "Unknown error"}`);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleReview = () => {
    // For BRW and Extom, multiple element types can share the same barcode
    // (one physical box = several rows, or multi-box cabinets with same barcode).
    // We keep them as separate rows instead of merging by barcode.
    const keepDistinctTitles = slug === "brw" || slug === "extom" || slug === "akrylik";

    // First divide rows by order, then process items inside each order.
    const groupMap = new Map<string, { itemName: string; barcode: string; quantity: number; parentBarcode?: string; parentName?: string }[]>();
    for (const file of files) {
      for (const row of file.rows) {
        if (!groupMap.has(row.orderNumber)) {
          groupMap.set(row.orderNumber, []);
        }
      }
    }
    for (const file of files) {
      for (const row of file.rows) {
        const items = groupMap.get(row.orderNumber)!;
        const existing = keepDistinctTitles
          ? items.find((i) => i.barcode === row.barcode && i.itemName === row.itemName)
          : items.find((i) => i.barcode === row.barcode);
        if (existing) {
          existing.quantity += row.quantity;
        } else {
          items.push({
            itemName: row.itemName,
            barcode: row.barcode,
            quantity: row.quantity,
            ...(row.parentBarcode ? { parentBarcode: row.parentBarcode } : {}),
            ...(row.parentName ? { parentName: row.parentName } : {}),
          });
        }
      }
    }
    const groups: OrderGroup[] = [];
    for (const [orderNumber, items] of groupMap) {
      groups.push({
        orderNumber,
        editedOrderNumber: orderNumber,
        items,
        hezeOrderNumber: "",
        customerName: "",
        postcode: "",
        plinthQty: "",
        weight: "",
        notes: "",
      });
    }
    setOrderGroups(groups);
    setReviewStep(true);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    const allRows: ParsedRow[] = [];
    for (const group of orderGroups) {
      for (const item of group.items) {
        allRows.push({
          itemName: item.itemName,
          barcode: item.barcode,
          quantity: item.quantity,
          orderNumber: group.editedOrderNumber.trim() || group.orderNumber,
          ...(item.parentBarcode ? { parentBarcode: item.parentBarcode } : {}),
          ...(item.parentName ? { parentName: item.parentName } : {}),
        });
      }
    }

    const orderMeta: Record<string, any> = {};
    for (const group of orderGroups) {
      const key = group.editedOrderNumber.trim() || group.orderNumber;
      const meta: any = {};
      if (group.hezeOrderNumber.trim()) meta.hezeOrderNumber = group.hezeOrderNumber.trim();
      if (group.customerName.trim()) meta.customerName = group.customerName.trim();
      if (group.postcode.trim()) meta.postcode = group.postcode.trim();
      if (group.plinthQty.trim()) meta.plinthQty = group.plinthQty.trim();
      if (group.weight.trim()) meta.weight = group.weight.trim();
      if (group.notes.trim()) meta.notes = group.notes.trim();
      if (Object.keys(meta).length > 0) orderMeta[key] = meta;
    }

    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rows: allRows, orderMeta }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      router.push(`/supplier/${slug}/to-book`);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  const totalOrders = new Set(files.flatMap((f) => f.rows.map((r) => r.orderNumber))).size;
  const totalItems = files.reduce((sum, f) => sum + f.rows.length, 0);

  if (reviewStep) {
    return (
      <div className="flex flex-col items-center pt-4 sm:pt-12 px-2 sm:px-4">
        <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">Review Orders</h1>
        <p className="text-white/80 mb-4 sm:mb-8 text-base sm:text-lg text-center">
          Review and edit order numbers before uploading
        </p>

        <div className="w-full max-w-3xl space-y-4">
          {orderGroups.map((group, idx) => (
            <div key={idx} className="bg-card rounded-lg px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                <label className="text-white/70 text-sm font-bold whitespace-nowrap">Order Number:</label>
                <input
                  type="text"
                  value={group.editedOrderNumber}
                  onChange={(e) => {
                    const updated = [...orderGroups];
                    updated[idx].editedOrderNumber = e.target.value;
                    setOrderGroups(updated);
                  }}
                  className="w-full sm:flex-1 px-3 py-2 rounded bg-white text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-white/50 text-xs">Heze Order Number</label>
                  <input
                    type="text"
                    value={group.hezeOrderNumber}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].hezeOrderNumber = e.target.value;
                      setOrderGroups(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. HZ-1234"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs">Customer Name</label>
                  <input
                    type="text"
                    value={group.customerName}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].customerName = e.target.value;
                      setOrderGroups(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs">Postcode</label>
                  <input
                    type="text"
                    value={group.postcode}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].postcode = e.target.value;
                      setOrderGroups(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs">Plinth Quantity</label>
                  <input
                    type="number"
                    value={group.plinthQty}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].plinthQty = e.target.value;
                      setOrderGroups(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs">Weight</label>
                  <input
                    type="text"
                    value={group.weight}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].weight = e.target.value;
                      setOrderGroups(updated);
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-white/50 text-xs">Notes</label>
                  <textarea
                    value={group.notes}
                    onChange={(e) => {
                      const updated = [...orderGroups];
                      updated[idx].notes = e.target.value;
                      setOrderGroups(updated);
                    }}
                    rows={2}
                    className="w-full px-3 py-1.5 rounded bg-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>
              </div>

              <div className="text-white/60 text-sm">
                {group.items.length} item{group.items.length !== 1 ? "s" : ""} &middot;{" "}
                {group.items.reduce((s, i) => s + i.quantity, 0)} total qty
              </div>
              <div className="mt-2 space-y-1">
                {group.items.map((item, i) => (
                  <div key={i} className="text-white/50 text-xs flex justify-between px-2">
                    <span className="truncate mr-2">{item.itemName}</span>
                    <span className="shrink-0">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setReviewStep(false)}
              className="flex-1 py-3 rounded border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition disabled:opacity-50"
            >
              {uploading ? "Processing..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-12 px-2 sm:px-4">
      <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">New Delivery</h1>
      <p className="text-white/80 mb-4 sm:mb-8 text-base sm:text-lg text-center">
        Upload CSV or Excel files to create new kitchen delivery
      </p>

      {/* Drop zone */}
      <div
        className={`drop-zone w-full max-w-2xl h-48 sm:h-64 rounded-lg bg-card flex flex-col items-center justify-center cursor-pointer ${
          dragging ? "dragging" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <CloudUploadIcon />
        {parsing ? (
          <p className="text-white text-lg mt-4 font-medium">Parsing file...</p>
        ) : (
          <>
            <p className="text-white text-lg mt-4 font-medium">Drag your files here</p>
            <p className="text-white/50 text-sm mt-1">CSV or Excel (.xlsx) files</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="w-full max-w-2xl mt-4 bg-red-500/80 text-white rounded-lg px-4 py-3">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="w-full max-w-2xl mt-6 space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="bg-card/60 rounded px-4 py-2 flex justify-between items-center"
            >
              <span className="text-white font-medium truncate mr-2">{f.name}</span>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-white/60 text-sm">{f.rows.length} items</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-red-300 hover:text-red-100 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center mt-4 text-white/80 text-sm">
            <span>
              {totalOrders} order{totalOrders !== 1 ? "s" : ""} &middot; {totalItems} item
              {totalItems !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            onClick={handleReview}
            className="w-full py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition mt-4"
          >
            Review & Upload
          </button>
        </div>
      )}

      {files.length === 0 && !error && (
        <p className="text-white/40 text-sm mt-4 text-center max-w-md">
          {mappings.filter(m => m.sourceColumns.length > 0).length > 0
            ? "Column mappings configured for this supplier."
            : "No column mappings configured. Using auto-detect (expects columns: Order Number, Item Name, Barcode, Quantity)."}
        </p>
      )}
    </div>
  );
}

function CloudUploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
