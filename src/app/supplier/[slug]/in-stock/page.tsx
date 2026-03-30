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

export default function InStockPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?slug=${slug}&status=IN_STOCK,PENDING`);
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-8 px-4">
      <h1 className="text-4xl font-black text-white mb-2">Kitchens in Stock</h1>
      <p className="text-white/80 mb-8 text-lg">
        Scan the items to accept kitchens to the warehouse
      </p>

      <div className="w-full max-w-4xl space-y-4">
        {orders.length === 0 && (
          <p className="text-white/60 text-center text-lg mt-12">
            No kitchens in stock. Upload a delivery to get started.
          </p>
        )}

        {orders.map((order) => {
          const isComplete = order.scannedQty >= order.totalQty;
          return (
            <div
              key={order.id}
              className="bg-card rounded-lg px-6 py-4 flex items-center justify-between fade-in"
            >
              <div className="flex items-center gap-4">
                {isComplete ? (
                  <div className="w-12 h-12 bg-scan-green rounded flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-yellow-500 rounded flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-white">
                    ORDER: {order.orderNumber}
                  </h3>
                  <p className="text-white/70 text-sm">
                    DELIVERED {order.scannedQty}/{order.totalQty}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isComplete ? (
                  <Link
                    href={`/supplier/${slug}/in-stock/${order.id}/despatch`}
                    className="bg-card-light hover:bg-gray-500 text-white font-bold px-6 py-3 rounded transition text-lg"
                  >
                    Despatch
                  </Link>
                ) : (
                  <Link
                    href={`/supplier/${slug}/in-stock/${order.id}/scan-extra`}
                    className="bg-card-light hover:bg-gray-500 text-white font-bold px-6 py-3 rounded transition text-lg"
                  >
                    Scan Extra
                  </Link>
                )}
                <Link
                  href={`/supplier/${slug}/in-stock/${order.id}`}
                  className="bg-card-light hover:bg-gray-500 text-white font-bold px-6 py-3 rounded transition text-lg"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
