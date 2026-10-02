"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { OrderData, etaHeadline, isActive, progressPercent } from "../lib/orders";

/** Dashboard widget: consumer's in-progress orders with live ETA. Renders nothing if none. */
export default function ActiveOrdersStrip() {
  const [orders, setOrders] = useState<OrderData[]>([]);

  useEffect(() => {
    apiFetch("/api/orders")
      .then((data) => setOrders((data.orders || []).filter(isActive).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (orders.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-charcoal">On the way</h2>
        <Link href="/orders" className="text-sm font-medium">View all orders →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="glass-card rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 !text-charcoal">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-charcoal truncate">{o.listing.cropName}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{o.fulfillmentType === "DELIVERY" ? "Delivery" : "Pickup"}</span>
            </div>
            <p className="text-sm font-semibold text-primary">{etaHeadline(o)}</p>
            <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(progressPercent(o), 6)}%` }} />
            </div>
            <p className="text-xs text-muted mt-2">{o.fulfillmentLabel}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
