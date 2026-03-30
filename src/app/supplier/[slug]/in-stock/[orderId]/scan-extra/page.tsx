"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  scannedQty: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  supplier: { id: string };
}

export default function ScanExtraPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.orderId as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScan, setLastScan] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setOrder(data);
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Keep input focused
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (barcode: string) => {
    if (!barcode.trim() || !order) return;

    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode: barcode.trim(),
        supplierId: order.supplier.id,
      }),
    });

    const result = await res.json();
    setLastScan(result);

    if (result.matched) {
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    }

    await loadOrder();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScan(scanBuffer);
      setScanBuffer("");
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalScanned = order.items.reduce((s, i) => s + i.scannedQty, 0);
  const allDone = totalScanned >= totalQty;

  return (
    <div className="flex flex-col items-center pt-8 px-4 relative">
      {showConfirmation && lastScan?.matched && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowConfirmation(false)}>
          <div className="bg-scan-green rounded-2xl mx-4 w-full max-w-5xl h-[70vh] flex flex-col items-center justify-center scan-flash">
            <h2 className="text-5xl font-black text-white mb-4">ORDER</h2>
            <p className="text-[12vw] font-black text-white leading-none">
              {lastScan.orderNumber}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={scanBuffer}
        onChange={(e) => setScanBuffer(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 w-0 h-0"
        autoFocus
      />

      <h1 className="text-3xl font-black text-white mb-2">
        Scan Extra: {order.orderNumber}
      </h1>
      <p className="text-white/80 mb-6 text-lg">
        Scanned {totalScanned}/{totalQty} items
      </p>

      {lastScan && !lastScan.matched && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="py-3 px-4 text-center font-bold">NAME</th>
              <th className="py-3 px-4 text-center font-bold w-24">QTY</th>
              <th className="py-3 px-4 text-center font-bold w-24">SCANNED</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const isComplete = item.scannedQty >= item.quantity;
              const isPartial = item.scannedQty > 0 && !isComplete;
              return (
                <tr
                  key={item.id}
                  className={
                    isComplete ? "bg-green-200" : isPartial ? "bg-yellow-200" : "bg-yellow-100"
                  }
                >
                  <td className="py-3 px-4 text-center text-gray-800">{item.itemName}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.scannedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {allDone && (
        <div className="mt-6">
          <button
            onClick={() => router.push(`/supplier/${slug}/in-stock`)}
            className="px-12 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition"
          >
            Done - Back to In Stock
          </button>
        </div>
      )}
    </div>
  );
}
