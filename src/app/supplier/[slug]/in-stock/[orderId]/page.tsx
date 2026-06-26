"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  movedToStockAt: string | null;
  movedToStockBy: string | null;
  hezeOrderNumber: string | null;
  customerName: string | null;
  postcode: string | null;
  plinthQty: number | null;
  weight: string | null;
  notes: string | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    scannedQty: number;
    despatchedQty: number;
  }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [meta, setMeta] = useState({
    hezeOrderNumber: "",
    customerName: "",
    postcode: "",
    plinthQty: "",
    weight: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await res.json();
    setOrder(data);
    setMeta({
      hezeOrderNumber: data.hezeOrderNumber || "",
      customerName: data.customerName || "",
      postcode: data.postcode || "",
      plinthQty: data.plinthQty != null ? String(data.plinthQty) : "",
      weight: data.weight || "",
      notes: data.notes || "",
    });
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const saveMeta = async () => {
    setSaving(true);
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hezeOrderNumber: meta.hezeOrderNumber,
        customerName: meta.customerName,
        postcode: meta.postcode,
        plinthQty: meta.plinthQty,
        weight: meta.weight,
        notes: meta.notes,
      }),
    });
    setSaving(false);
    await loadOrder();
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalScanned = order.items.reduce((s, i) => s + i.scannedQty, 0);
  const hasUnscanned = totalScanned < totalQty;

  const metaChanged =
    meta.hezeOrderNumber !== (order.hezeOrderNumber || "") ||
    meta.customerName !== (order.customerName || "") ||
    meta.postcode !== (order.postcode || "") ||
    meta.plinthQty !== (order.plinthQty != null ? String(order.plinthQty) : "") ||
    meta.weight !== (order.weight || "") ||
    meta.notes !== (order.notes || "");

  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-3xl font-black text-white mb-2">
        ORDER: {order.orderNumber}
      </h1>
      <p className="text-white/60 mb-4 text-center">
        {order.movedToStockAt
          ? `In stock since: ${new Date(order.movedToStockAt).toLocaleDateString("en-GB")}`
          : ""}
        {order.movedToStockBy && ` | Scanned by: ${order.movedToStockBy}`}
      </p>

      <div className="w-full max-w-4xl bg-card rounded-lg px-4 sm:px-6 py-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-white/60 text-xs font-bold">Heze Order Number</label>
            <input
              type="text"
              value={meta.hezeOrderNumber}
              onChange={(e) => setMeta({ ...meta, hezeOrderNumber: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. HZ-1234"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-bold">Customer Name</label>
            <input
              type="text"
              value={meta.customerName}
              onChange={(e) => setMeta({ ...meta, customerName: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-bold">Postcode</label>
            <input
              type="text"
              value={meta.postcode}
              onChange={(e) => setMeta({ ...meta, postcode: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-bold">Plinth Quantity</label>
            <input
              type="number"
              value={meta.plinthQty}
              onChange={(e) => setMeta({ ...meta, plinthQty: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-bold">Weight</label>
            <input
              type="text"
              value={meta.weight}
              onChange={(e) => setMeta({ ...meta, weight: e.target.value })}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-white/60 text-xs font-bold">Notes</label>
            <textarea
              value={meta.notes}
              onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>
        {metaChanged && (
          <button
            onClick={saveMeta}
            disabled={saving}
            className="mt-3 px-6 py-2 rounded bg-accent text-white font-bold text-sm hover:bg-accent-light transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold">NAME</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-10 sm:w-16">QTY</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-12 sm:w-20">SCN</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-14 sm:w-24">DSP</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const isScanned = item.scannedQty >= item.quantity;
              const isPartial = item.scannedQty > 0 && !isScanned;
              return (
                <tr
                  key={item.id}
                  className={
                    isScanned ? "bg-green-200" : isPartial ? "bg-yellow-200" : "bg-yellow-100"
                  }
                >
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm break-all">{item.itemName}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.quantity}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.scannedQty}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.despatchedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {hasUnscanned && (
          <Link
            href={`/supplier/${slug}/in-stock/${orderId}/scan-extra`}
            className="px-6 py-3 rounded bg-accent text-white font-bold hover:bg-accent-light transition"
          >
            Scan More Items ({totalScanned}/{totalQty})
          </Link>
        )}
        <Link
          href={`/supplier/${slug}/in-stock`}
          className="px-8 py-3 rounded border-2 border-white text-white font-bold hover:bg-white/10 transition"
        >
          Back to Kitchens In Stock
        </Link>
      </div>
    </div>
  );
}
