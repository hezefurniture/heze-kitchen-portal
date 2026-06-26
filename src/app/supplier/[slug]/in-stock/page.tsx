"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalQty: number;
  scannedQty: number;
  hezeOrderNumber: string | null;
  customerName: string | null;
  postcode: string | null;
}

export default function InStockPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}&status=IN_STOCK&isAddition=false`);
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to remove order ${orderNumber}? This will delete the order and all its scan data.`)) return;
    const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
    if (res.ok) loadOrders();
  };

  const handleEditStart = (order: OrderSummary) => {
    setEditingId(order.id);
    setEditValue(order.orderNumber);
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditError("");
    const res = await fetch(`/api/orders/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: editValue }),
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
      <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 text-center">Kitchens In Stock</h1>
      <p className="text-white/80 mb-6 text-sm sm:text-lg text-center">Fully scanned kitchens ready for despatch</p>

      <div className="w-full max-w-4xl space-y-3">
        {orders.length === 0 && (
          <p className="text-white/60 text-center text-lg mt-12">No kitchens in stock.</p>
        )}

        {orders.map((order) => {
          const isEditing = editingId === order.id;

          return (
            <div key={order.id} className="bg-card rounded-lg px-3 sm:px-5 py-3 sm:py-4 fade-in">
              {isEditing && (
                <div className="mb-3 bg-white/10 rounded-lg p-3">
                  <label className="text-white text-sm font-bold block mb-2">Change Order Number</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingId(null); }}
                    className="w-full px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEditSave} className="flex-1 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-white text-white font-bold rounded hover:bg-white/10 transition">Cancel</button>
                  </div>
                  {editError && <p className="text-red-300 text-sm mt-2">{editError}</p>}
                </div>
              )}

              {/* Order info */}
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-scan-green rounded flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-black text-white truncate">ORDER: {order.orderNumber}</h3>
                  <p className="text-white/70 text-xs sm:text-sm">
                    DELIVERED {order.scannedQty}/{order.totalQty}
                    {order.hezeOrderNumber && <span className="ml-2">| {order.hezeOrderNumber}</span>}
                    {order.customerName && <span className="ml-2">| {order.customerName}</span>}
                    {order.postcode && <span className="ml-1 hidden sm:inline">| {order.postcode}</span>}
                  </p>
                </div>
              </div>

              {/* Buttons - wrap on mobile */}
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link href={`/supplier/${slug}/in-stock/${order.id}/despatch`} className="bg-card-light hover:bg-gray-500 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded transition text-sm sm:text-base">Despatch</Link>
                <Link href={`/supplier/${slug}/in-stock/${order.id}`} className="bg-card-light hover:bg-gray-500 text-white font-bold px-4 sm:px-6 py-2 sm:py-3 rounded transition text-sm sm:text-base">View</Link>
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
