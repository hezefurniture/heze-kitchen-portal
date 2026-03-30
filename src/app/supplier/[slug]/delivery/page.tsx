"use client";

import { useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface ParsedRow {
  itemName: string;
  barcode: string;
  quantity: number;
  orderNumber: string;
}

interface ParsedFile {
  name: string;
  rows: ParsedRow[];
}

interface OrderGroup {
  orderNumber: string;
  editedOrderNumber: string;
  items: { itemName: string; barcode: string; quantity: number }[];
}

export default function DeliveryUploadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [reviewStep, setReviewStep] = useState(false);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        import("papaparse").then((Papa) => {
          const result = Papa.default.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h: string) => h.trim(),
          });
          const rows: ParsedRow[] = [];
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

            if (!itemName || !barcode || !orderNumber) continue;
            const quantity = parseInt(quantityStr, 10);
            if (isNaN(quantity) || quantity <= 0) continue;
            rows.push({ itemName, barcode, quantity, orderNumber });
          }
          resolve({ name: file.name, rows });
        });
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: ParsedFile[] = [];
      for (const file of Array.from(fileList)) {
        if (file.name.endsWith(".csv") || file.type === "text/csv") {
          const parsed = await parseFile(file);
          if (parsed.rows.length > 0) {
            newFiles.push(parsed);
          }
        }
      }
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleReview = () => {
    const allRows = files.flatMap((f) => f.rows);
    const groupMap = new Map<string, { itemName: string; barcode: string; quantity: number }[]>();
    for (const row of allRows) {
      const items = groupMap.get(row.orderNumber) || [];
      const existing = items.find((i) => i.barcode === row.barcode);
      if (existing) {
        existing.quantity += row.quantity;
      } else {
        items.push({ itemName: row.itemName, barcode: row.barcode, quantity: row.quantity });
      }
      groupMap.set(row.orderNumber, items);
    }
    const groups: OrderGroup[] = [];
    for (const [orderNumber, items] of groupMap) {
      groups.push({ orderNumber, editedOrderNumber: orderNumber, items });
    }
    setOrderGroups(groups);
    setReviewStep(true);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    // Build rows with edited order numbers
    const allRows: ParsedRow[] = [];
    for (const group of orderGroups) {
      for (const item of group.items) {
        allRows.push({
          itemName: item.itemName,
          barcode: item.barcode,
          quantity: item.quantity,
          orderNumber: group.editedOrderNumber.trim() || group.orderNumber,
        });
      }
    }

    try {
      const res = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, rows: allRows }),
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
      <div className="flex flex-col items-center pt-12 px-4">
        <h1 className="text-4xl font-black text-white mb-2">Review Orders</h1>
        <p className="text-white/80 mb-8 text-lg">
          Review and edit order numbers before uploading
        </p>

        <div className="w-full max-w-3xl space-y-4">
          {orderGroups.map((group, idx) => (
            <div key={idx} className="bg-card rounded-lg px-6 py-4">
              <div className="flex items-center gap-4 mb-3">
                <label className="text-white/70 text-sm font-bold whitespace-nowrap">Order Number:</label>
                <input
                  type="text"
                  value={group.editedOrderNumber}
                  onChange={(e) => {
                    const updated = [...orderGroups];
                    updated[idx].editedOrderNumber = e.target.value;
                    setOrderGroups(updated);
                  }}
                  className="flex-1 px-3 py-2 rounded bg-white text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="text-white/60 text-sm">
                {group.items.length} item{group.items.length !== 1 ? "s" : ""} &middot;{" "}
                {group.items.reduce((s, i) => s + i.quantity, 0)} total qty
              </div>
              <div className="mt-2 space-y-1">
                {group.items.map((item, i) => (
                  <div key={i} className="text-white/50 text-xs flex justify-between px-2">
                    <span>{item.itemName}</span>
                    <span>x{item.quantity}</span>
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
    <div className="flex flex-col items-center pt-12 px-4">
      <h1 className="text-4xl font-black text-white mb-2">New Delivery</h1>
      <p className="text-white/80 mb-8 text-lg">
        Upload your files to create new kitchen delivery in the warehouse
      </p>

      {/* Drop zone */}
      <div
        className={`drop-zone w-full max-w-2xl h-64 rounded-lg bg-card flex flex-col items-center justify-center cursor-pointer ${
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
        <p className="text-white text-lg mt-4 font-medium">Drag your files here</p>
        <p className="text-white/50 text-sm mt-1">or click to browse</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="w-full max-w-2xl mt-6 space-y-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="bg-card/60 rounded px-4 py-2 flex justify-between items-center"
            >
              <span className="text-white font-medium">{f.name}</span>
              <div className="flex items-center gap-4">
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

          {error && <p className="text-red-300 text-sm">{error}</p>}

          <button
            onClick={handleReview}
            className="w-full py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition mt-4"
          >
            Review & Upload
          </button>
        </div>
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
