"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  despatchedAt: string | null;
  despatchedBy: string | null;
  totalQty: number;
  hezeOrderNumber: string | null;
  postcode: string | null;
}

export default function ArchivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterHezeOrderNumber, setFilterHezeOrderNumber] = useState("");
  const [filterPostcode, setFilterPostcode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}&status=DESPATCHED`);
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    setLoading(false);
  }, [slug]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleDelete = async (id: string, orderNumber: string) => {
    if (!confirm(`Are you sure you want to remove archived order ${orderNumber}? This will permanently delete all data for this order.`)) return;
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

  const handleRestore = async (id: string, orderNumber: string) => {
    if (!confirm(`Restore order ${orderNumber} back to In Stock? This will reset all despatch quantities.`)) return;
    const res = await fetch(`/api/orders/${id}/restore-to-stock`, { method: "POST" });
    if (res.ok) loadOrders();
  };

  const filteredOrders = orders.filter((o) => {
    if (filterOrderId && !o.orderNumber.toLowerCase().includes(filterOrderId.toLowerCase())) return false;
    if (filterHezeOrderNumber && !(o.hezeOrderNumber || "").toLowerCase().includes(filterHezeOrderNumber.toLowerCase())) return false;
    if (filterPostcode && !(o.postcode || "").toLowerCase().includes(filterPostcode.toLowerCase())) return false;
    if (filterDateFrom && o.despatchedAt) {
      if (new Date(o.despatchedAt) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo && o.despatchedAt) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59);
      if (new Date(o.despatchedAt) > to) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  return (
    <div className="flex flex-col items-center pt-4 px-3 pb-20">
      {/* Filter bar */}
      <section aria-labelledby="archive-filter" className="w-full max-w-5xl bg-card rounded-lg px-4 sm:px-6 py-4 mb-4 sm:mb-6">
        <h2 id="archive-filter" className="text-white font-bold text-base sm:text-lg mb-3">Filter</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col min-w-0 text-white text-xs font-bold gap-1">
            Order ID
            <input type="text" placeholder="SQ-2424" value={filterOrderId} onChange={(e) => setFilterOrderId(e.target.value)} className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <label className="flex flex-col min-w-0 text-white text-xs font-bold gap-1">
            Heze Order No.
            <input type="text" placeholder="HZ-1234" value={filterHezeOrderNumber} onChange={(e) => setFilterHezeOrderNumber(e.target.value)} className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <label className="flex flex-col min-w-0 text-white text-xs font-bold gap-1">
            Postcode
            <input type="text" placeholder="B69 2BT" value={filterPostcode} onChange={(e) => setFilterPostcode(e.target.value)} className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <fieldset className="col-span-2 lg:col-span-1 min-w-0">
            <legend className="text-white text-xs font-bold mb-1">Despatched Between</legend>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input type="date" aria-label="From date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-w-0" />
              <span className="text-white" aria-hidden="true">–</span>
              <input type="date" aria-label="To date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent min-w-0" />
            </div>
          </fieldset>
        </div>
      </section>

      {/* Orders list */}
      <div className="w-full max-w-5xl space-y-3">
        {loading && <p className="text-white text-center text-xl mt-12">Loading...</p>}
        {!loading && filteredOrders.length === 0 && <p className="text-white/60 text-center text-lg mt-12">No despatched orders found.</p>}

        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-card rounded-lg px-3 sm:px-5 py-3 sm:py-4 fade-in">
            {editingId === order.id && (
              <div className="mb-3 bg-white/10 rounded-lg p-3">
                <label className="text-white text-sm font-bold block mb-2">Change Order Number</label>
                <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditingId(null); }}
                  className="w-full px-3 py-2 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent mb-2" autoFocus />
                <div className="flex gap-2">
                  <button onClick={handleEditSave} className="flex-1 py-2 bg-accent text-white font-bold rounded hover:bg-accent-light transition">Save</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2 border border-white text-white font-bold rounded hover:bg-white/10 transition">Cancel</button>
                </div>
                {editError && <p className="text-red-300 text-sm mt-2">{editError}</p>}
              </div>
            )}

            {/* Order info */}
            <div className="mb-2">
              <h3 className="text-base sm:text-lg font-black text-white truncate">Order: {order.orderNumber}</h3>
              {(order.hezeOrderNumber || order.postcode) && (
                <p className="text-white/70 text-sm truncate">
                  {order.hezeOrderNumber && <span>{order.hezeOrderNumber}</span>}
                  {order.hezeOrderNumber && order.postcode && <span> · </span>}
                  {order.postcode && <span>{order.postcode}</span>}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 text-white/70 text-xs sm:text-sm">
                <span>Despatched: {formatDate(order.despatchedAt)}</span>
                <span>Packer: {order.despatchedBy || "-"}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {isAdmin && (
                <button
                  onClick={() => handleRestore(order.id, order.orderNumber)}
                  className="hidden sm:inline-flex bg-blue-600/80 hover:bg-blue-600 text-white font-bold min-h-[44px] sm:min-h-[48px] px-5 sm:px-6 rounded transition text-sm items-center gap-1"
                  title="Restore to In Stock"
                >
                  <RestoreIcon /> Restore
                </button>
              )}
              <Link href={`/supplier/${slug}/archive/${order.id}`} className="bg-card-light hover:bg-gray-500 text-white font-bold min-h-[44px] sm:min-h-[48px] px-5 sm:px-6 inline-flex items-center justify-center rounded transition text-sm">View</Link>
              <button onClick={() => handleEditStart(order)} className="bg-card-light hover:bg-gray-500 text-white w-11 h-11 sm:w-12 sm:h-12 inline-flex items-center justify-center rounded transition" title="Edit order number" aria-label="Edit order details">
                <EditIcon />
              </button>
              <button onClick={() => handleDelete(order.id, order.orderNumber)} className="bg-red-600/80 hover:bg-red-600 text-white w-11 h-11 sm:w-12 sm:h-12 ml-3 inline-flex items-center justify-center rounded transition" title="Remove order" aria-label="Remove order">
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}

function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}

function RestoreIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,4 1,10 7,10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>;
}
