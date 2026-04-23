"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { playSuccessSound, playErrorSound, isSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { ManualBarcodeInput } from "@/components/manual-barcode-input";
import { addToQueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/lib/use-online-status";
import { useWakeLock } from "@/lib/use-wake-lock";
import { useBarcodeScanner } from "@/lib/use-barcode-scanner";
import { EditableQty } from "@/components/editable-qty";
import { LastScannedPanel, type LastScannedItem } from "@/components/last-scanned-panel";
import { DisambiguateModal, type AmbiguousCandidate } from "@/components/disambiguate-modal";

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
  orderId?: string;
  barcode?: string;
  scannedItems?: LastScannedItem[];
  ambiguous?: boolean;
  candidates?: AmbiguousCandidate[];
  error?: string;
}

export default function ScanAllPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const scanningRef = useRef(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [excludedOrderIds, setExcludedOrderIds] = useState<Set<string>>(new Set());
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [lastScannedItems, setLastScannedItems] = useState<LastScannedItem[]>([]);
  const [lastScannedOrder, setLastScannedOrder] = useState<string | undefined>();
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | undefined>();
  const [lastScannedOrderId, setLastScannedOrderId] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<AmbiguousCandidate[] | null>(null);
  const [ambiguousBarcode, setAmbiguousBarcode] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const { isOnline, queueCount, refreshQueueCount } = useOnlineStatus();

  useWakeLock();
  useEffect(() => { setSoundOn(isSoundEnabled()); }, []);

  useEffect(() => {
    fetch(`/api/suppliers?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.id) setSupplierId(d.id); })
      .catch(() => {});
  }, [slug]);

  const loadOrders = useCallback(async () => {
    if (!supplierId) return;
    try {
      const res = await fetch(`/api/scan?supplierId=${supplierId}`);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch {}
  }, [supplierId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const handler = () => loadOrders();
    window.addEventListener("scans-flushed", handler);
    return () => window.removeEventListener("scans-flushed", handler);
  }, [loadOrders]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!barcode.trim() || !supplierId) return;
    if (scanningRef.current) return;
    scanningRef.current = true;

    const scanUrl = "/api/scan";
    const excluded = Array.from(excludedOrderIds);
    const scanBody = {
      barcode: barcode.trim(),
      supplierId,
      preferredOrderId: lastScannedOrderId,
      ...(excluded.length > 0 ? { excludeOrderIds: excluded } : {}),
    };

    try {
      const res = await fetch(scanUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanBody),
      });
      const result: ScanResult = await res.json();
      setLastScan(result);
      if (result.matched) {
        if (result.scannedItems?.length) {
          setLastScannedItems(result.scannedItems);
          setLastScannedOrder(result.orderNumber);
          setLastScannedBarcode(result.barcode || barcode.trim());
          setLastScannedOrderId(result.orderId);
        }
        if (isSoundEnabled()) playSuccessSound();
        setShowConfirmation(true);
        setTimeout(() => setShowConfirmation(false), 1500);
      } else if (result.ambiguous && result.candidates?.length) {
        setAmbiguousBarcode(result.barcode || barcode.trim());
        setAmbiguousCandidates(result.candidates);
      } else {
        if (isSoundEnabled()) playErrorSound();
      }
      await loadOrders();
    } catch {
      addToQueue(scanUrl, scanBody);
      refreshQueueCount();
      if (isSoundEnabled()) playSuccessSound();
      setLastScan({ matched: true, orderNumber: "QUEUED", itemName: barcode.trim() });
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 1500);
    } finally {
      scanningRef.current = false;
    }
  }, [supplierId, excludedOrderIds, loadOrders, refreshQueueCount]);

  // Document-level barcode capture (DataWedge + USB scanners)
  const { handleManualSubmit } = useBarcodeScanner(handleScan);

  const handleManualScan = async (orderId: string, itemId: string, action: "increment" | "decrement") => {
    try {
      await fetch(`/api/orders/${orderId}/manual-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action, type: "delivery" }),
      });
      await loadOrders();
    } catch {}
  };

  const handleSetQty = async (
    orderId: string,
    itemId: string,
    value: number
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/manual-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: "set", value, type: "delivery" }),
      });
      if (!res.ok) throw new Error("Failed");
      setLastScannedItems((prev) =>
        prev.map((it) => (it.itemId === itemId ? { ...it, newQty: value } : it))
      );
      await loadOrders();
    } catch {}
  };

  const handleDisambiguatePick = async (candidate: AmbiguousCandidate) => {
    setAmbiguousCandidates(null);
    try {
      await fetch(`/api/orders/${candidate.orderId}/manual-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: candidate.itemId, action: "increment", type: "delivery" }),
      });
      if (isSoundEnabled()) playSuccessSound();
      setLastScannedItems([{
        itemId: candidate.itemId,
        itemName: candidate.itemName,
        barcode: ambiguousBarcode,
        newQty: candidate.scannedQty + 1,
        totalQty: candidate.quantity,
      }]);
      setLastScannedOrder(candidate.orderNumber);
      setLastScannedBarcode(ambiguousBarcode);
      setLastScannedOrderId(candidate.orderId);
      await loadOrders();
    } catch {}
  };

  const toggleSound = () => { const next = !soundOn; setSoundOn(next); setSoundEnabled(next); };

  return (
    <div className="scan-page flex flex-col items-center pt-4 sm:pt-8 px-2 sm:px-4 relative pb-20">
      {showConfirmation && lastScan?.matched && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowConfirmation(false)}>
          <div className={`${lastScan.orderNumber === "QUEUED" ? "bg-yellow-500" : "bg-scan-green"} rounded-2xl mx-2 w-[calc(100%-1rem)] h-[50vh] sm:h-[60vh] flex flex-col items-center justify-center scan-flash px-6`}>
            {lastScan.orderNumber === "QUEUED" ? (
              <>
                <h2 className="text-2xl sm:text-4xl font-black text-white mb-4">QUEUED OFFLINE</h2>
                <p className="text-xl sm:text-2xl text-white break-all text-center">{lastScan.itemName}</p>
                <p className="text-base sm:text-lg text-white/80 mt-4">Will sync when back online</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 sm:mb-4">ORDER</h2>
                <p className="text-[8vw] sm:text-7xl font-black text-white leading-tight text-center">{lastScan.orderNumber}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2 justify-center">
        <h1 className="text-2xl sm:text-4xl font-black text-white">Scan All Orders</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleSound} className="text-white/70 hover:text-white transition p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" title={soundOn ? "Mute sounds" : "Unmute sounds"}>
            {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>
          {!isOnline && <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OFFLINE</span>}
          {queueCount > 0 && <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">{queueCount} queued</span>}
        </div>
      </div>
      <p className="text-white/80 mb-3 text-base sm:text-lg text-center">Scan items across all pending orders</p>

      <ManualBarcodeInput onSubmit={handleManualSubmit} />

      <LastScannedPanel
        orderNumber={lastScannedOrder}
        barcode={lastScannedBarcode}
        items={lastScannedItems}
        type="delivery"
        onUpdate={(itemId, value) =>
          lastScannedOrderId
            ? handleSetQty(lastScannedOrderId, itemId, value)
            : Promise.resolve()
        }
      />

      {ambiguousCandidates && (
        <DisambiguateModal
          barcode={ambiguousBarcode}
          candidates={ambiguousCandidates}
          onPick={handleDisambiguatePick}
          onCancel={() => setAmbiguousCandidates(null)}
        />
      )}

      {lastScan && !lastScan.matched && !lastScan.ambiguous && (
        <div className="w-full max-w-4xl bg-red-500/80 text-white rounded-lg px-4 sm:px-6 py-3 mb-4 fade-in">
          <p className="font-bold">Item not found</p>
          <p className="text-sm text-white/80">{lastScan.error}</p>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-3 sm:space-y-4">
        {orders.length === 0 && (
          <p className="text-white/60 text-center text-lg mt-12">No pending orders to scan.</p>
        )}

        {orders.map((order) => {
          const orderTotal = order.items.reduce((s, i) => s + i.quantity, 0);
          const orderScanned = order.items.reduce((s, i) => s + i.scannedQty, 0);
          const isExpanded = expandedOrder === order.id;
          const isExcluded = excludedOrderIds.has(order.id);
          return (
            <div key={order.id} className={`fade-in ${isExcluded ? "opacity-50" : ""}`}>
              <div className={`w-full ${isExcluded ? "bg-card/60" : "bg-card"} rounded-lg px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between min-h-[56px]`}>
                <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="flex items-center min-w-0 flex-1 mr-2">
                  <h3 className={`text-base sm:text-xl font-black truncate mr-2 ${isExcluded ? "text-white/50 line-through" : "text-white"}`}>ORDER: {order.orderNumber}</h3>
                </button>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="text-white text-sm sm:text-lg">{orderScanned}/{orderTotal}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExcludedOrderIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(order.id)) next.delete(order.id);
                        else next.add(order.id);
                        return next;
                      });
                    }}
                    className={`relative w-16 h-8 rounded-full transition-colors duration-200 shrink-0 focus:outline-none ${isExcluded ? "bg-red-500" : "bg-green-500"}`}
                    title={isExcluded ? "Excluded from scanning — tap to include" : "Included in scanning — tap to exclude"}
                  >
                    <span className={`absolute top-1.5 left-1.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isExcluded ? "translate-x-0" : "translate-x-8"}`} />
                  </button>
                  <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="p-1">
                    <ChevronIcon expanded={isExpanded} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="bg-white rounded-b-lg overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead><tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
                      <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold">NAME</th>
                      <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-10 sm:w-16">QTY</th>
                      <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-12 sm:w-16">DONE</th>
                      <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-[72px] sm:w-24">+/-</th>
                    </tr></thead>
                    <tbody>
                      {order.items.map((item) => {
                        const done = item.scannedQty >= item.quantity;
                        const partial = item.scannedQty > 0 && !done;
                        return (
                          <tr key={item.id} className={done ? "bg-green-200" : partial ? "bg-yellow-200" : "bg-yellow-100"}>
                            <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm break-all">{item.itemName}</td>
                            <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.quantity}</td>
                            <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">
                              <EditableQty
                                value={item.scannedQty}
                                max={item.quantity}
                                onChange={(v) => handleSetQty(order.id, item.id, v)}
                              />
                            </td>
                            <td className="py-2 sm:py-3 px-1 sm:px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleManualScan(order.id, item.id, "decrement")} disabled={item.scannedQty <= 0}
                                  className="w-8 h-8 rounded bg-red-400 hover:bg-red-500 disabled:bg-gray-300 text-white font-bold text-sm flex items-center justify-center transition">-</button>
                                <button onClick={() => handleManualScan(order.id, item.id, "increment")} disabled={item.scannedQty >= item.quantity}
                                  className="w-8 h-8 rounded bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold text-sm flex items-center justify-center transition">+</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {orderScanned > 0 && orderScanned < orderTotal && (
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Move order ${order.orderNumber} to In Stock?\n\nOnly ${orderScanned} of ${orderTotal} items scanned.`)) return;
                          try {
                            await fetch(`/api/orders/${order.id}/move-to-stock`, { method: "POST" });
                            await loadOrders();
                          } catch {}
                        }}
                        className="text-sm font-bold text-yellow-600 hover:text-yellow-800 transition px-3 py-1 rounded border border-yellow-400 hover:bg-yellow-50"
                      >
                        Move to In Stock ({orderScanned}/{orderTotal})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 sm:mt-8 mb-8">
        <button onClick={() => router.push(`/supplier/${slug}/to-book`)} className="px-10 sm:px-16 py-4 rounded-lg border-2 border-accent text-white font-bold text-xl sm:text-2xl hover:bg-accent/20 transition min-h-[56px]">
          Done
        </button>
      </div>
    </div>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><polyline points="6,9 12,15 18,9" /></svg>;
}
function SoundOnIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
}
function SoundOffIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;
}
