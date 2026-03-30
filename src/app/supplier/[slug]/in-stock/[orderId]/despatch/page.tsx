"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  despatchedQty: number;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
}

export default function DespatchPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.orderId as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScan, setLastScan] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setOrder(data);

    if (data.status === "DESPATCHED") {
      setIsComplete(true);
    }
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
    if (!barcode.trim()) return;

    const res = await fetch(`/api/orders/${orderId}/despatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: barcode.trim() }),
    });

    const result = await res.json();
    setLastScan(result);

    if (result.matched) {
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 1500);
    }

    await loadOrder();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScan(scanBuffer);
      setScanBuffer("");
    }
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-40 h-40 rounded-full border-4 border-scan-green flex items-center justify-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <h1 className="text-4xl font-black text-white mb-6">Despatch Complete</h1>
        <p className="text-white/80 text-lg mb-8">
          Order {order?.orderNumber} has been despatched and moved to archive.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/supplier/${slug}/in-stock`)}
            className="px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition"
          >
            Back to Kitchens In Stock
          </button>
          <button
            onClick={() => router.push(`/supplier/${slug}/archive`)}
            className="px-8 py-3 rounded border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition"
          >
            Go to Archive
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalDespatched = order.items.reduce((s, i) => s + i.despatchedQty, 0);

  return (
    <div className="flex flex-col items-center pt-8 px-4 relative">
      {showConfirmation && lastScan?.matched && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowConfirmation(false)}>
          <div className="bg-scan-green rounded-2xl mx-4 w-full max-w-3xl py-16 flex flex-col items-center justify-center scan-flash">
            <h2 className="text-3xl font-black text-white mb-2">DESPATCHED</h2>
            <p className="text-xl text-white">{lastScan.itemName}</p>
            <p className="text-lg text-white/80 mt-2">
              {lastScan.newScannedQty}/{lastScan.totalQty}
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
        Despatch: {order.orderNumber}
      </h1>
      <p className="text-white/80 mb-6 text-lg">
        Scan items to confirm despatch ({totalDespatched}/{totalQty})
      </p>

      {lastScan && !lastScan.matched && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found or already despatched</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="py-3 px-4 text-center font-bold">NAME</th>
              <th className="py-3 px-4 text-center font-bold w-24">QTY</th>
              <th className="py-3 px-4 text-center font-bold w-28">DESPATCHED</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const isComplete = item.despatchedQty >= item.quantity;
              const isPartial = item.despatchedQty > 0 && !isComplete;
              return (
                <tr
                  key={item.id}
                  className={
                    isComplete ? "bg-green-200" : isPartial ? "bg-yellow-200" : "bg-yellow-100"
                  }
                >
                  <td className="py-3 px-4 text-center text-gray-800">{item.itemName}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.despatchedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
