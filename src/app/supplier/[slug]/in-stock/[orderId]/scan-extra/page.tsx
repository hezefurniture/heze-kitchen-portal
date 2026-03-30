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
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setOrder(data);
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.focus();
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (barcode: string) => {
    if (!barcode.trim() || !order) return;
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: barcode.trim(), supplierId: order.supplier.id }),
    });
    const result = await res.json();
    setLastScan(result);
    if (result.matched) {
      if (soundOn) playSuccessSound();
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);
    } else {
      if (soundOn) playErrorSound();
    }
    await loadOrder();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { handleScan(scanBuffer); setScanBuffer(""); }
  };

  const toggleSound = () => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); };

  if (!order) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-white text-xl">Loading...</p></div>;
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
            <p className="text-[12vw] font-black text-white leading-none">{lastScan.orderNumber}</p>
          </div>
        </div>
      )}

      <input ref={inputRef} type="text" value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)} onKeyDown={handleKeyDown} className="absolute opacity-0 w-0 h-0" autoFocus />

      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-black text-white">Scan Extra: {order.orderNumber}</h1>
        <button onClick={toggleSound} className="text-white/70 hover:text-white transition" title={soundOn ? "Mute sounds" : "Unmute sounds"}>
          {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
      </div>
      <p className="text-white/80 mb-6 text-lg">Scanned {totalScanned}/{totalQty} items</p>

      {lastScan && !lastScan.matched && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-100 text-gray-700 text-sm">
            <th className="py-3 px-4 text-center font-bold">NAME</th>
            <th className="py-3 px-4 text-center font-bold w-24">QTY</th>
            <th className="py-3 px-4 text-center font-bold w-24">SCANNED</th>
          </tr></thead>
          <tbody>
            {order.items.map((item) => {
              const done = item.scannedQty >= item.quantity;
              const partial = item.scannedQty > 0 && !done;
              return (
                <tr key={item.id} className={done ? "bg-green-200" : partial ? "bg-yellow-200" : "bg-yellow-100"}>
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
          <button onClick={() => router.push(`/supplier/${slug}/in-stock`)} className="px-12 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition">Done - Back to In Stock</button>
        </div>
      )}
    </div>
  );
}

function SoundOnIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}
function SoundOffIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
}
