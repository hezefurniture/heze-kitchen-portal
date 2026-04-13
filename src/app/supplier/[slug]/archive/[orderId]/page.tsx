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
  despatchedAt: string | null;
  despatchedBy: string | null;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    scannedQty: number;
    despatchedQty: number;
  }[];
}

export default function ArchiveDetailPage() {
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

  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-3xl font-black text-white mb-2">
        ORDER: {order.orderNumber}
      </h1>
      <div className="text-white/60 mb-6 text-center text-sm space-y-1">
        {(order.movedToStockAt || order.movedToStockBy) && (
          <p>
            In stock: {order.movedToStockAt ? new Date(order.movedToStockAt).toLocaleDateString("en-GB") : "-"}
            {order.movedToStockBy && ` | Scanned by: ${order.movedToStockBy}`}
          </p>
        )}
        <p>
          Despatched: {order.despatchedAt ? new Date(order.despatchedAt).toLocaleDateString("en-GB") : "-"}
          {order.despatchedBy && ` | Packer: ${order.despatchedBy}`}
        </p>
      </div>

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs sm:text-sm">
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold">NAME</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-10 sm:w-16">QTY</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-14 sm:w-20">SCANNED</th>
              <th className="py-2 sm:py-3 px-1 sm:px-4 text-center font-bold w-14 sm:w-20">DESPATCHED</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="bg-green-200">
                <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm break-all">{item.itemName}</td>
                <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.quantity}</td>
                <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.scannedQty}</td>
                <td className="py-2 sm:py-3 px-1 sm:px-4 text-center text-gray-800 text-xs sm:text-sm">{item.despatchedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
        <Link
          href={`/supplier/${slug}/archive`}
          className="px-8 py-3 rounded border-2 border-white text-white font-bold hover:bg-white/10 transition"
        >
          Back to Archive
        </Link>
      </div>
    </div>
  );
}
