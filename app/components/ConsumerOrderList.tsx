"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { getCropImage } from "../lib/cropImages";
import { OrderData, etaHeadline, isActive, progressPercent, statusBadgeClass, formatDate } from "../lib/orders";

type Filter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "In progress" },
  { id: "DELIVERED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function ConsumerOrderList() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchOrders();
    // Keep statuses fresh while the page is open
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await apiFetch("/api/orders");
      setOrders(data.orders || []);
      setError("");
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to fetch orders");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const counts = useMemo(() => ({
    ALL: orders.length,
    ACTIVE: orders.filter(isActive).length,
    DELIVERED: orders.filter((o) => o.fulfillmentStatus === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.fulfillmentStatus === "CANCELLED").length,
  }), [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "ACTIVE" && !isActive(o)) return false;
      if (filter === "DELIVERED" && o.fulfillmentStatus !== "DELIVERED") return false;
      if (filter === "CANCELLED" && o.fulfillmentStatus !== "CANCELLED") return false;
      if (!q) return true;
      return o.listing.cropName.toLowerCase().includes(q) || (o.trackingNumber || "").toLowerCase().includes(q);
    });
  }, [orders, filter, query]);

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 mb-6">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">Loading your orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <p className="text-muted mb-4">You haven&apos;t placed any orders yet.</p>
        <Link href="/listings" className="text-primary hover:text-primary-light font-medium">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filters + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 !px-3.5 !py-1.5 text-xs rounded-full border transition-colors ${filter === f.id ? "bg-primary text-white border-primary" : "bg-white/80 text-muted border-border hover:border-primary/40"}`}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="md:ml-auto md:w-64">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search crop or tracking #"
            aria-label="Search orders"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-xl text-sm text-muted">No orders match this filter.</div>
      ) : (
        <div className="space-y-5">
          {visible.map((order) => {
            const img = getCropImage(order.listing.cropName);
            const cancelled = order.fulfillmentStatus === "CANCELLED";
            const delivered = order.fulfillmentStatus === "DELIVERED";
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block glass-card rounded-xl shadow-sm overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 !text-charcoal"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-36 h-28 sm:h-auto shrink-0 relative bg-primary/5">
                    {img ? (
                      <img src={img} alt={order.listing.cropName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30 font-bold text-4xl">
                        {order.listing.cropName.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-charcoal truncate">{order.listing.cropName}</h3>
                        <p className="text-xs text-muted">
                          {order.quantity} {order.listing.unit} · Ordered {formatDate(order.createdAt)}
                          {order.trackingNumber && <> · <span className="font-mono">#{order.trackingNumber}</span></>}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass(order.fulfillmentStatus)}`}>
                        {order.fulfillmentLabel}
                      </span>
                    </div>

                    <p className={`text-sm font-semibold mt-3 ${cancelled ? "text-error" : delivered ? "text-success" : "text-primary"}`}>
                      {etaHeadline(order)}
                    </p>

                    {!cancelled && (
                      <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${delivered ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.max(progressPercent(order), 6)}%` }} />
                      </div>
                    )}

                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-xs text-muted">{order.paymentLabel}</p>
                        <p className="font-bold text-primary text-lg">₹{(order.totalPrice + (order.deliveryFee || 0)).toFixed(2)}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">
                        {isActive(order) ? "Track order →" : "View details →"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
