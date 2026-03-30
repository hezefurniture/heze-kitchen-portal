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
}

export default function ToBookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
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
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-4xl font-black text-white mb-2">Kitchens to Book</h1>
      <p className="text-white/80 mb-4 text-lg">Scan items to confirm delivery and move to stock</p>

      {orders.length > 0 && (
        <Link
          href={`/supplier/${slug}/to-book/scan-all`}
          className="mb-8 px-12 py-4 rounded-lg bg-accent text-white font-black text-2xl hover:bg-accent-light transition inline-block"
        >
          Scan All Orders
        </Link>
      )}

      <div className="w-full max-w-4xl space-y-4">
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
            <div key={order.id} className="bg-card rounded-lg px-6 py-4 fade-in">
              {isEditing && (
                <div className="mb-4 bg-white/10 rounded-lg p-4">
                  <label className="text-white text-sm font-bold block mb-2">Change Order Number</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingId(null); }}
                      className="flex-1 px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent"
                      autoFocus
                    />
                    <button onClick={handleEditSave} className="px-4 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-white text-white font-bold rounded hover:bg-white/10 transition">Cancel</button>
                  </div>
                  {editError && <p className="text-red-300 text-sm mt-2">{editError}</p>}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded flex items-center justify-center">
                    <span className="text-white font-black text-lg">{progress}%</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">ORDER: {order.orderNumber}</h3>
                    <p className="text-white/70 text-sm">SCANNED {order.scannedQty}/{order.totalQty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/supplier/${slug}/to-book/${order.id}/scan`} className="bg-accent hover:bg-accent-light text-white font-bold px-6 py-3 rounded transition text-lg">
                    Scan
                  </Link>
                  <Link href={`/supplier/${slug}/in-stock/${order.id}`} className="bg-card-light hover:bg-gray-500 text-white font-bold px-6 py-3 rounded transition text-lg">
                    View
                  </Link>
                  <button onClick={() => handleEditStart(order)} className="bg-card-light hover:bg-gray-500 text-white p-3 rounded transition" title="Edit order number">
                    <EditIcon />
                  </button>
                  <button onClick={() => handleDelete(order.id, order.orderNumber)} className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded transition" title="Remove order">
                    <TrashIcon />
                  </button>
                </div>
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
