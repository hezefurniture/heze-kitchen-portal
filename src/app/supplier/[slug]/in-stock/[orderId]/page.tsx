"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
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

  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-3xl font-black text-white mb-6">
        ORDER: {order.orderNumber}
      </h1>

      <div className="w-full max-w-4xl bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-sm">
              <th className="py-3 px-4 text-center font-bold">NAME</th>
              <th className="py-3 px-4 text-center font-bold w-24">QTY</th>
              <th className="py-3 px-4 text-center font-bold w-24">SCANNED</th>
              <th className="py-3 px-4 text-center font-bold w-28">DESPATCHED</th>
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
                  <td className="py-3 px-4 text-center text-gray-800">{item.itemName}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.scannedQty}</td>
                  <td className="py-3 px-4 text-center text-gray-800">{item.despatchedQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6">
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
