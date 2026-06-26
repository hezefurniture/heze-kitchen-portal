"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
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
  }[];
}

export default function ToBookOrderDetailPage() {
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

  const hasMeta = order.hezeOrderNumber || order.customerName || order.postcode || order.plinthQty || order.weight || order.notes;

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 px-2 sm:px-4 pb-20">
      <h1 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-6 text-center break-all px-2">
        ORDER: {order.orderNumber}
      </h1>

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
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-14 sm:w-20">SCANNED</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const isScanned = item.scannedQty >= item.quantity;
              const isPartial = item.scannedQty > 0 && !isScanned;
              return (
                <tr
                  key={item.id}
                  className={isScanned ? "bg-green-200" : isPartial ? "bg-yellow-200" : "bg-yellow-100"}
                >
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm break-all">{item.itemName}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.quantity}</td>
                  <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.scannedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link
          href={`/supplier/${slug}/to-book`}
          className="px-8 py-3 rounded border-2 border-white text-white font-bold hover:bg-white/10 transition"
        >
          Back to Kitchens to Book
        </Link>
      </div>
    </div>
  );
}
