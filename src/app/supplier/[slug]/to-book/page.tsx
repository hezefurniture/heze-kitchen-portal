"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  isAddition: boolean;
  createdAt: string;
  totalQty: number;
  scannedQty: number;
  hezeOrderNumber: string | null;
  customerName: string | null;
  postcode: string | null;
  plinthQty: number | null;
  weight: string | null;
  notes: string | null;
}

export default function ToBookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editMeta, setEditMeta] = useState({ hezeOrderNumber: "", customerName: "", postcode: "", plinthQty: "", weight: "", notes: "" });
  const [editError, setEditError] = useState("");

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}&status=PENDING`);
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to remove order ${orderNumber}? This will delete the order and all its data.`)) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) loadOrders();
  };

  const handleEditStart = (order: OrderSummary) => {
    setEditingId(order.id);
    setEditValue(order.orderNumber);
    setEditMeta({
      hezeOrderNumber: order.hezeOrderNumber || "",
      customerName: order.customerName || "",
      postcode: order.postcode || "",
      plinthQty: order.plinthQty != null ? String(order.plinthQty) : "",
      weight: order.weight || "",
      notes: order.notes || "",
    });
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditError("");
    const res = await fetch(`/api/orders/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: editValue,
        hezeOrderNumber: editMeta.hezeOrderNumber,
        customerName: editMeta.customerName,
        postcode: editMeta.postcode,
        plinthQty: editMeta.plinthQty,
        weight: editMeta.weight,
        notes: editMeta.notes,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Failed to update");
      return;
    }
    setEditingId(null);
    loadOrders();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-white text-xl">Loading...</p></div>;
  }

  return (
    <div className="flex flex-col items-center pt-6 px-3 pb-20">
      <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 text-center">Kitchens to Book</h1>
      <p className="text-white/80 mb-4 text-sm sm:text-lg text-center">Scan items to confirm delivery and move to stock</p>

      {orders.length > 0 && (
        <Link
          href={`/supplier/${slug}/to-book/scan-all`}
          className="mb-6 px-8 sm:px-12 py-3 sm:py-4 rounded-lg bg-accent text-white font-black text-xl sm:text-2xl hover:bg-accent-light transition text-center"
        >
          Scan All Orders
        </Link>
      )}

      <div className="w-full max-w-4xl space-y-3">
        {orders.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-white/60 text-lg mb-4">No kitchens waiting to be booked.</p>
            <Link href={`/supplier/${slug}/delivery`} className="px-8 py-3 rounded bg-accent text-white font-bold text-lg hover:bg-accent-light transition">
              Upload New Delivery
            </Link>
          </div>
        )}

        {orders.map((order) => {
          const progress = order.totalQty > 0 ? Math.round((order.scannedQty / order.totalQty) * 100) : 0;
          const isEditing = editingId === order.id;

          return (
            <div key={order.id} className="bg-card rounded-lg px-3 sm:px-5 py-3 sm:py-4 fade-in">
              {/* Edit order number */}
              {isEditing && (
                <div className="mb-3 bg-white/10 rounded-lg p-3">
                  <label className="text-white text-sm font-bold block mb-2">Order Number</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                    className="w-full px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent mb-3"
                    autoFocus
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-white/60 text-xs font-bold">Heze Order Number</label>
                      <input type="text" value={editMeta.hezeOrderNumber} onChange={(e) => setEditMeta({ ...editMeta, hezeOrderNumber: e.target.value })} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. HZ-1234" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-bold">Customer Name</label>
                      <input type="text" value={editMeta.customerName} onChange={(e) => setEditMeta({ ...editMeta, customerName: e.target.value })} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-bold">Postcode</label>
                      <input type="text" value={editMeta.postcode} onChange={(e) => setEditMeta({ ...editMeta, postcode: e.target.value })} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-bold">Plinth Quantity</label>
                      <input type="number" value={editMeta.plinthQty} onChange={(e) => setEditMeta({ ...editMeta, plinthQty: e.target.value })} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs font-bold">Weight</label>
                      <input type="text" value={editMeta.weight} onChange={(e) => setEditMeta({ ...editMeta, weight: e.target.value })} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-white/60 text-xs font-bold">Notes</label>
                      <textarea value={editMeta.notes} onChange={(e) => setEditMeta({ ...editMeta, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEditSave} className="flex-1 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-white text-white font-bold rounded hover:bg-white/10 transition">Cancel</button>
                  </div>
                  {editError && <p className="text-red-300 text-sm mt-2">{editError}</p>}
                </div>
              )}

              {/* Order info row */}
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-sm sm:text-lg">{progress}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-white truncate">ORDER: {order.orderNumber}</h3>
                  {(order.hezeOrderNumber || order.postcode) && (
                    <p className="text-white/50 text-xs sm:text-sm truncate">
                      {order.hezeOrderNumber && <span>{order.hezeOrderNumber}</span>}
                      {order.hezeOrderNumber && order.postcode && <span> · </span>}
                      {order.postcode && <span>{order.postcode}</span>}
                    </p>
                  )}
                  <p className="text-white/70 text-xs sm:text-sm">
                    SCANNED {order.scannedQty}/{order.totalQty}
                    <span className="ml-2 text-white/50">· {new Date(order.createdAt).toLocaleDateString("en-GB")}</span>
                  </p>
                </div>
              </div>

              {/* Addition toggle */}
              <button
                onClick={async () => {
                  const next = !order.isAddition;
                  await fetch(`/api/orders/${order.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isAddition: next }),
                  });
                  setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, isAddition: next } : o));
                }}
                className={`mb-2 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold transition ${
                  order.isAddition
                    ? "border-blue-400 bg-blue-500/20 text-blue-300"
                    : "border-white/20 text-white/50 hover:border-white/40"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                  order.isAddition ? "border-blue-400 bg-blue-500" : "border-white/40"
                }`}>
                  {order.isAddition && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                  )}
                </span>
                Addition
              </button>

              {/* Action buttons - wrap on mobile */}
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link href={`/supplier/${slug}/to-book/${order.id}/scan`} className="bg-accent hover:bg-accent-light text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded transition text-sm sm:text-base">
                  Scan
                </Link>
                <Link href={`/supplier/${slug}/to-book/${order.id}`} className="bg-card-light hover:bg-gray-500 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded transition text-sm sm:text-base">
                  View
                </Link>
                <button onClick={() => handleEditStart(order)} className="bg-card-light hover:bg-gray-500 text-white p-2 sm:p-3 rounded transition" title="Edit order number">
                  <EditIcon />
                </button>
                <button onClick={() => handleDelete(order.id, order.orderNumber)} className="bg-red-600/80 hover:bg-red-600 text-white p-2 sm:p-3 rounded transition" title="Remove order">
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}

function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}
