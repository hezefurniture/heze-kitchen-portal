"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  movedToStockAt: string | null;
  movedToStockBy: string | null;
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

  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-3xl font-black text-white mb-2">
        ORDER: {order.orderNumber}
      </h1>
      <p className="text-white/60 mb-6 text-center">
        {order.movedToStockAt
          ? `In stock since: ${new Date(order.movedToStockAt).toLocaleDateString("en-GB")}`
          : ""}
        {order.movedToStockBy && ` | Scanned by: ${order.movedToStockBy}`}
      </p>

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
