"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { generateOrderPdf } from "@/lib/generate-order-pdf";

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
  plinthColour: string | null;
  sealQty: number | null;
  bracketQty: number | null;
  weight: string | null;
  notes: string | null;
  supplier: { name: string };
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

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then(setOrder);
  }, [orderId]);

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
  const hasMeta = order.hezeOrderNumber || order.customerName || order.postcode || order.plinthQty || order.plinthColour || order.sealQty || order.bracketQty || order.weight || order.notes;

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

      {hasMeta && (
        <div className="w-full max-w-4xl bg-card rounded-lg px-4 sm:px-6 py-3 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {order.hezeOrderNumber && (
              <div><span className="text-white/50">Heze Order:</span> <span className="text-white font-medium">{order.hezeOrderNumber}</span></div>
            )}
            {order.customerName && (
              <div><span className="text-white/50">Customer:</span> <span className="text-white font-medium">{order.customerName}</span></div>
            )}
            {order.postcode && (
              <div><span className="text-white/50">Postcode:</span> <span className="text-white font-medium">{order.postcode}</span></div>
            )}
            {order.plinthQty && (
              <div><span className="text-white/50">Plinth Qty:</span> <span className="text-white font-medium">{order.plinthQty}</span></div>
            )}
            {order.plinthColour && (
              <div><span className="text-white/50">Plinth Colour:</span> <span className="text-white font-medium">{order.plinthColour}</span></div>
            )}
            {order.sealQty && (
              <div><span className="text-white/50">Seal Qty:</span> <span className="text-white font-medium">{order.sealQty}</span></div>
            )}
            {order.bracketQty && (
              <div><span className="text-white/50">Bracket Qty:</span> <span className="text-white font-medium">{order.bracketQty}</span></div>
            )}
            {order.weight && (
              <div><span className="text-white/50">Weight:</span> <span className="text-white font-medium">{order.weight}</span></div>
            )}
          </div>
          {order.notes && (
            <div className="mt-2 text-sm">
              <span className="text-white/50">Notes:</span> <span className="text-white/80">{order.notes}</span>
            </div>
          )}
        </div>
      )}

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
        <button
          onClick={() => generateOrderPdf({
            orderNumber: order.orderNumber,
            hezeOrderNumber: order.hezeOrderNumber,
            customerName: order.customerName,
            postcode: order.postcode,
            plinthQty: order.plinthQty,
            plinthColour: order.plinthColour,
            sealQty: order.sealQty,
            bracketQty: order.bracketQty,
            weight: order.weight,
            notes: order.notes,
            supplierName: order.supplier.name,
          })}
          className="px-6 py-3 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition flex items-center gap-2"
        >
          <PrintIcon />
          Print Label
        </button>
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

function PrintIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
}
