"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { playSuccessSound, playErrorSound, isSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { addToQueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useWakeLock } from "@/lib/use-wake-lock";

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
  const scanningRef = useRef(false);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScan, setLastScan] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const { isOnline, queueCount, refreshQueueCount } = useOnlineStatus();

  useWakeLock();

  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      setOrder(data);
      if (data.status === "DESPATCHED") setIsComplete(true);
    } catch {}
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    const handler = () => loadOrder();
    window.addEventListener("scans-flushed", handler);
    return () => window.removeEventListener("scans-flushed", handler);
  }, [loadOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.focus();
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    if (scanningRef.current) return;
    scanningRef.current = true;
    const scanUrl = `/api/orders/${orderId}/despatch`;
    const scanBody = { barcode: barcode.trim() };
    try {
      const res = await fetch(scanUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanBody),
      });
      const result = await res.json();
      setLastScan(result);
      if (result.matched) {
        if (soundOn) playSuccessSound();
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 1500);
      } else {
        if (soundOn) playErrorSound();
      }
      await loadOrder();
    } catch {
      addToQueue(scanUrl, scanBody);
      refreshQueueCount();
      if (soundOn) playSuccessSound();
      setLastScan({ matched: true, itemName: barcode.trim(), orderNumber: "QUEUED" });
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 1500);
    } finally {
      scanningRef.current = false;
    }
  };

  const handleManualScan = async (itemId: string, action: "increment" | "decrement") => {
    try {
      await fetch(`/api/orders/${orderId}/manual-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action, type: "despatch" }),
      });
      await loadOrder();
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { handleScan(scanBuffer); setScanBuffer(""); }
  };
  const toggleSound = () => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-40 h-40 rounded-full border-4 border-scan-green flex items-center justify-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
        </div>
        <h1 className="text-4xl font-black text-white mb-6">Despatch Complete</h1>
        <p className="text-white/80 text-lg mb-8">Order {order?.orderNumber} has been despatched and moved to archive.</p>
        <div className="flex gap-4">
          <button onClick={() => router.push(`/supplier/${slug}/in-stock`)} className="px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition">Back to Kitchens In Stock</button>
          <button onClick={() => router.push(`/supplier/${slug}/archive`)} className="px-8 py-3 rounded border-2 border-white text-white font-bold text-lg hover:bg-white/10 transition">Go to Archive</button>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-white text-xl">Loading...</p></div>;
  }

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalDespatched = order.items.reduce((s, i) => s + i.despatchedQty, 0);

  return (
    <div className="scan-page flex flex-col items-center pt-4 sm:pt-8 px-2 sm:px-4 relative pb-20">
      {showConfirmation && lastScan?.matched && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowConfirmation(false)}>
          <div className={`${lastScan.orderNumber === "QUEUED" ? "bg-yellow-500" : "bg-scan-green"} rounded-2xl mx-4 w-full max-w-3xl py-16 flex flex-col items-center justify-center scan-flash`}>
            {lastScan.orderNumber === "QUEUED" ? (
              <>
                <h2 className="text-3xl font-black text-white mb-2">QUEUED OFFLINE</h2>
                <p className="text-xl text-white">{lastScan.itemName}</p>
                <p className="text-lg text-white/80 mt-2">Will sync when back online</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black text-white mb-2">DESPATCHED</h2>
                <p className="text-xl text-white">{lastScan.itemName}</p>
                <p className="text-lg text-white/80 mt-2">{lastScan.newScannedQty}/{lastScan.totalQty}</p>
              </>
            )}
          </div>
        </div>
      )}

      <input ref={inputRef} type="text" value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)} onKeyDown={handleKeyDown} className="absolute opacity-0 w-0 h-0" autoFocus inputMode="none" />

      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-black text-white">Despatch: {order.orderNumber}</h1>
        <button onClick={toggleSound} className="text-white/70 hover:text-white transition" title={soundOn ? "Mute" : "Unmute"}>
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        {!isOnline && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OFFLINE</span>}
        {queueCount > 0 && <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">{queueCount} queued</span>}
      </div>
      <p className="text-white/80 mb-6 text-lg">Scan items to confirm despatch ({totalDespatched}/{totalQty})</p>

      {lastScan && !lastScan.matched && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found or already despatched</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-100 text-gray-700 text-sm">
            <th className="py-3 px-4 text-center font-bold">NAME</th>
            <th className="py-3 px-4 text-center font-bold w-24">QTY</th>
            <th className="py-3 px-4 text-center font-bold w-28">DESPATCHED</th>
            <th className="py-3 px-4 text-center font-bold w-32">MANUAL</th>
          </tr></thead>
          <tbody>
            {order.items.map((item) => {
              const done = item.despatchedQty >= item.quantity;
              const partial = item.despatchedQty > 0 && !done;
              return (
                <tr key={item.id} className={done ? "bg-green-200" : partial ? "bg-yellow-200" : "bg-yellow-100"}>
                  <td className="py-3 px-4 text-center text-gray-800">{item.itemName}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.despatchedQty}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleManualScan(item.id, "decrement")} disabled={item.despatchedQty <= 0}
                        className="w-10 h-10 sm:w-8 sm:h-8 rounded bg-red-400 hover:bg-red-500 disabled:bg-gray-300 text-white font-bold text-lg flex items-center justify-center transition">-</button>
                      <button onClick={() => handleManualScan(item.id, "increment")} disabled={item.despatchedQty >= item.quantity}
                        className="w-10 h-10 sm:w-8 sm:h-8 rounded bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold text-lg flex items-center justify-center transition">+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SoundOnIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}
function SoundOffIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
}
