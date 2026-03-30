"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  despatchedAt: string | null;
  despatchedBy: string | null;
  totalQty: number;
}

export default function ArchivePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrderId, setFilterOrderId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}&status=DESPATCHED`);
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((o) => {
    if (filterOrderId && !o.orderNumber.toLowerCase().includes(filterOrderId.toLowerCase())) {
      return false;
    }
    if (filterDateFrom && o.despatchedAt) {
      const d = new Date(o.despatchedAt);
      const from = new Date(filterDateFrom);
      if (d < from) return false;
    }
    if (filterDateTo && o.despatchedAt) {
      const d = new Date(o.despatchedAt);
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59);
      if (d > to) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB");
  };

  return (
    <div className="flex flex-col items-center pt-4 px-4">
      {/* Filter bar */}
      <div className="w-full max-w-5xl bg-gray-600 rounded-lg px-6 py-4 flex items-center gap-6 mb-6">
        <span className="text-white font-black text-xl">FILTER</span>
        <div className="flex flex-col">
          <label className="text-white text-xs font-bold mb-1">Order ID</label>
          <input
            type="text"
            placeholder="SQ-2424"
            value={filterOrderId}
            onChange={(e) => setFilterOrderId(e.target.value)}
            className="px-3 py-2 rounded bg-white text-gray-800 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-white text-xs font-bold mb-1">Despatch Time Range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-white">-</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Orders list */}
      <div className="w-full max-w-5xl space-y-3">
        {loading && (
          <p className="text-white text-center text-xl mt-12">Loading...</p>
        )}

        {!loading && filteredOrders.length === 0 && (
          <p className="text-white/60 text-center text-lg mt-12">
            No despatched orders found.
          </p>
        )}

        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="bg-card rounded-lg px-6 py-4 flex items-center justify-between fade-in"
          >
            <div className="flex items-center gap-8">
              <h3 className="text-lg font-black text-white min-w-[200px]">
                ORDER: {order.orderNumber}
              </h3>
              <span className="text-white/80 text-sm">
                Despatched: {formatDate(order.despatchedAt)}
              </span>
              <span className="text-white/80 text-sm">
                Packer: {order.despatchedBy || "-"}
              </span>
            </div>

            <Link
              href={`/supplier/${slug}/archive/${order.id}`}
              className="bg-card-light hover:bg-gray-500 text-white font-bold px-6 py-2 rounded transition"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
