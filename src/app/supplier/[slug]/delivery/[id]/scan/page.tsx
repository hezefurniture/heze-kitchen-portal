"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { playSuccessSound, playErrorSound, isSoundEnabled, setSoundEnabled } from "@/lib/sounds";

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  scannedQty: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
}

interface ScanResult {
  matched: boolean;
  orderNumber?: string;
  itemName?: string;
  newScannedQty?: number;
  totalQty?: number;
  error?: string;
}

export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const deliveryId = params.id as string;
  const inputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [supplierId, setSupplierId] = useState<string>("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  // Get supplier ID
  useEffect(() => {
    fetch(`/api/suppliers?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setSupplierId(d.id);
      });
  }, [slug]);

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!supplierId) return;
    const res = await fetch(
      `/api/scan?supplierId=${supplierId}&deliveryId=${deliveryId}`
    );
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
  }, [supplierId, deliveryId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
    if (!barcode.trim() || !supplierId) return;

    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: barcode.trim(), supplierId, deliveryId }),
    });

    const result: ScanResult = await res.json();
    setLastScan(result);

    if (result.matched) {
      if (soundOn) playSuccessSound();
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    } else {
      if (soundOn) playErrorSound();
    }

    await loadOrders();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleScan(scanBuffer);
      setScanBuffer("");
    }
  };

  const handleFinish = () => {
    router.push(`/supplier/${slug}/delivery/${deliveryId}/finished`);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  return (
    <div className="flex flex-col items-center pt-8 px-4 relative">
      {/* Order confirmation overlay */}
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

      {/* Hidden scanner input */}
      <input
        ref={inputRef}
        type="text"
        value={scanBuffer}
        onChange={(e) => setScanBuffer(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 w-0 h-0"
        autoFocus
      />

      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-4xl font-black text-white">Step 2</h1>
        <button onClick={toggleSound} className="text-white/70 hover:text-white transition" title={soundOn ? "Mute sounds" : "Unmute sounds"}>
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
      </div>
      <p className="text-white/80 mb-8 text-lg">
        Scan the items to accept kitchens to the warehouse
      </p>

      {/* Error display */}
      {lastScan && !lastScan.matched && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found: {scanBuffer || "unknown"}</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      {/* Orders list */}
      <div className="w-full max-w-4xl space-y-4">
        {orders.map((order) => {
          const orderTotal = order.items.reduce((s, i) => s + i.quantity, 0);
          const orderScanned = order.items.reduce((s, i) => s + i.scannedQty, 0);
          const isExpanded = expandedOrder === order.id;

          return (
            <div key={order.id} className="fade-in">
              <button
                onClick={() =>
                  setExpandedOrder(isExpanded ? null : order.id)
                }
                className="w-full bg-card rounded-lg px-6 py-4 flex items-center justify-between hover:bg-card-light transition"
              >
                <h3 className="text-xl font-black text-white">
                  ORDER: {order.orderNumber}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-white text-lg">
                    DELIVERED {orderScanned}/{orderTotal}
                  </span>
                  <ChevronIcon expanded={isExpanded} />
                </div>
              </button>

              {isExpanded && (
                <div className="bg-white rounded-b-lg overflow-hidden">
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
                              isComplete
                                ? "bg-green-200"
                                : isPartial
                                ? "bg-yellow-200"
                                : "bg-yellow-100"
                            }
                          >
                            <td className="py-3 px-4 text-center text-gray-800">
                              {item.itemName}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-800">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-800">
                              {item.scannedQty}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finish button */}
      {orders.length > 0 && (
        <button
          onClick={handleFinish}
          className="mt-8 px-16 py-4 rounded-lg border-2 border-accent text-white font-bold text-2xl hover:bg-accent/20 transition"
        >
          Finish
        </button>
      )}
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
