"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { OrderData, formatDate, formatDateTime, isActive, progressPercent, statusBadgeClass } from "../lib/orders";

type Filter = "ACTIVE" | "DELIVERED" | "CANCELLED" | "ALL";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ACTIVE", label: "To fulfill" },
  { id: "DELIVERED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "ALL", label: "All" },
];

export default function FarmerOrderList() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ACTIVE");

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (silent = false) => {
    try {
      const data = await apiFetch("/api/orders/farmer");
      setOrders(data.orders || []);
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load sales history");
    } finally {
      setLoading(false);
    }
  };

  const replaceOrder = (updated: OrderData) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
    const completed = orders.filter((o) => o.fulfillmentStatus === "DELIVERED");
    return {
      toFulfill: orders.filter(isActive).length,
      dueToday: orders.filter((o) => isActive(o) && o.fulfillmentType === "DELIVERY" && o.deliveryDate === todayStr).length,
      completed: completed.length,
      revenue: completed.reduce((sum, o) => sum + o.totalPrice, 0),
    };
  }, [orders]);

  const visible = orders.filter((o) => {
    if (filter === "ACTIVE") return isActive(o);
    if (filter === "DELIVERED") return o.fulfillmentStatus === "DELIVERED";
    if (filter === "CANCELLED") return o.fulfillmentStatus === "CANCELLED";
    return true;
  });

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 mb-6">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">Loading your sales history...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-xl shadow-sm">
        <p className="text-muted mb-4">You have not made any sales yet.</p>
        <Link href="/farmer/listings" className="text-primary hover:text-primary-light font-medium">
          Manage your listings
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="To fulfill" value={stats.toFulfill} highlight={stats.toFulfill > 0} />
        <Stat label="Deliveries due today" value={stats.dueToday} highlight={stats.dueToday > 0} />
        <Stat label="Completed" value={stats.completed} />
        <Stat label="Earned (completed)" value={`₹${stats.revenue.toFixed(0)}`} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 !px-3.5 !py-1.5 text-xs rounded-full border transition-colors ${filter === f.id ? "bg-primary text-white border-primary" : "bg-white/80 text-muted border-border hover:border-primary/40"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-xl text-sm text-muted">
          {filter === "ACTIVE" ? "All caught up — no orders waiting on you." : "No orders here yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <FarmerOrderCard key={order.id} order={order} onUpdated={replaceOrder} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`glass-card rounded-xl p-4 ${highlight ? "border border-primary/30" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${highlight ? "text-primary" : "text-charcoal"}`}>{value}</p>
    </div>
  );
}

function FarmerOrderCard({ order, onUpdated }: { order: OrderData; onUpdated: (o: OrderData) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [partnerName, setPartnerName] = useState(user?.name || "");
  const [partnerPhone, setPartnerPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const next = order.nextStatus;
  const isDelivery = order.fulfillmentType === "DELIVERY";

  const advance = async () => {
    if (!next) return;
    setBusy(true);
    try {
      const body: Record<string, string> = { status: next.status };
      if (next.requiresOtp) body.otp = otp;
      if (next.status === "OUT_FOR_DELIVERY") {
        body.deliveryPartnerName = partnerName;
        body.deliveryPartnerPhone = partnerPhone;
      }
      if (location.trim()) body.location = location.trim();
      const data = await apiFetch(`/api/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify(body) });
      onUpdated(data.order);
      setOtp("");
      setLocation("");
      toast.success(`Marked as ${next.title.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Could not update order");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      const data = await apiFetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason || "Unable to fulfill" }),
      });
      onUpdated(data.order);
      setRejecting(false);
      toast.success("Order rejected and stock restored");
    } catch (err: any) {
      toast.error(err.message || "Could not reject order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card rounded-xl shadow-sm p-5 md:p-6 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-lg text-charcoal">{order.listing.cropName}</h3>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass(order.fulfillmentStatus)}`}>
              {order.fulfillmentLabel}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDelivery ? "bg-primary/10 text-primary" : "bg-cream text-[#8B5E34] border border-accent/30"}`}>
              {isDelivery ? "Home delivery" : "Pickup"}
            </span>
          </div>
          <p className="text-sm text-charcoal/80">
            <span className="font-medium">{order.quantity} {order.listing.unit}</span> @ ₹{order.listing.price}/{order.listing.unit}
          </p>
          <p className="text-xs text-muted mt-1">
            Ordered {formatDateTime(order.createdAt)}
            {order.trackingNumber && <> · <span className="font-mono">#{order.trackingNumber}</span></>}
          </p>
        </div>

        <div className="md:text-right shrink-0">
          <p className="font-bold text-primary text-xl">₹{order.totalPrice.toFixed(2)}</p>
          <p className="text-xs text-muted">{order.paymentLabel}</p>
        </div>
      </div>

      {/* Fulfillment details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="bg-white/70 rounded-lg p-3 border border-border text-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Buyer</p>
          {order.consumer ? (
            <>
              <p className="font-medium text-charcoal">{order.consumer.name}</p>
              <a href={`tel:${order.consumer.phone}`} className="text-xs">{order.consumer.phone}</a>
            </>
          ) : (
            <p className="text-muted">Buyer details unavailable</p>
          )}
        </div>
        <div className="bg-white/70 rounded-lg p-3 border border-border text-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{isDelivery ? "Deliver to" : "Pickup at"}</p>
          {isDelivery && order.delivery ? (
            <>
              <p className="font-medium text-charcoal">{order.delivery.name} · {order.delivery.phone}</p>
              <p className="text-xs text-muted">{order.delivery.address}, {order.delivery.city} – {order.delivery.pincode}</p>
              {order.deliverySlot && (
                <p className="text-xs text-primary font-semibold mt-1">{formatDate(order.deliveryDate + "T00:00:00")}, {order.deliverySlot}</p>
              )}
              {order.delivery.instructions && <p className="text-xs text-muted mt-1 italic">&ldquo;{order.delivery.instructions}&rdquo;</p>}
            </>
          ) : (
            <p className="text-xs text-muted">{order.pickupCenter ? `${order.pickupCenter.name}, ${order.pickupCenter.address}` : "Distribution center"}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {order.fulfillmentStatus !== "CANCELLED" && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-muted mb-1">
            {order.steps.map((s) => (
              <span key={s.status} className={s.completed ? "text-primary font-semibold" : ""}>{s.title}</span>
            ))}
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.max(progressPercent(order), 4)}%` }} />
          </div>
        </div>
      )}

      {order.status === "PENDING_PAYMENT" && order.fulfillmentStatus !== "CANCELLED" && (
        <p className="text-xs text-muted mt-4 bg-cream rounded-md px-3 py-2">Waiting for the buyer to complete online payment before you can start fulfilling.</p>
      )}

      {/* Actions */}
      {(next || order.canReject) && order.status !== "PENDING_PAYMENT" && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {next?.status === "OUT_FOR_DELIVERY" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`pn-${order.id}`}>Delivery person</label>
                <input id={`pn-${order.id}`} type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
              </div>
              <div>
                <label htmlFor={`pp-${order.id}`}>Their phone</label>
                <input id={`pp-${order.id}`} type="tel" value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)} />
              </div>
            </div>
          )}
          {next?.status === "IN_TRANSIT" && (
            <div>
              <label htmlFor={`loc-${order.id}`}>Current location <span className="text-muted font-normal">(optional)</span></label>
              <input id={`loc-${order.id}`} type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Left farm, en route to Bengaluru" />
            </div>
          )}
          {next?.requiresOtp && (
            <div className="max-w-xs">
              <label htmlFor={`otp-${order.id}`}>Buyer&apos;s 4-digit handover code</label>
              <input
                id={`otp-${order.id}`}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="tracking-[0.5em] font-mono text-center"
              />
            </div>
          )}

          {rejecting ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (e.g. crop damaged by rain)" />
              <button onClick={reject} disabled={busy} className="bg-emergency text-white shrink-0">Confirm reject</button>
              <button onClick={() => setRejecting(false)} className="bg-white text-muted border border-border shrink-0">Back</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {next && (
                <button
                  onClick={advance}
                  disabled={busy || (next.requiresOtp && otp.length !== 4)}
                  className={`${next.status === "DELIVERED" ? "bg-success" : "bg-primary hover:bg-primary-light"} text-white`}
                >
                  {busy ? "Updating..." : `Mark as ${next.title}`}
                </button>
              )}
              {order.canReject && (
                <button onClick={() => setRejecting(true)} className="bg-white text-error border border-error/30 hover:bg-error/5">
                  Reject order
                </button>
              )}
              <Link href={`/orders/${order.id}`} className="inline-flex items-center text-sm font-semibold px-4 py-2 text-muted hover:text-primary">
                View timeline →
              </Link>
            </div>
          )}
        </div>
      )}

      {order.fulfillmentStatus === "DELIVERED" && order.rating && (
        <p className="text-xs text-muted mt-4 pt-3 border-t border-border">
          Buyer rated <span className="font-semibold text-[#8B5E34]">{"★".repeat(order.rating)}{"☆".repeat(5 - order.rating)}</span>
          {order.review && <> — &ldquo;{order.review}&rdquo;</>}
        </p>
      )}
      {order.fulfillmentStatus === "CANCELLED" && order.cancelReason && (
        <p className="text-xs text-muted mt-4 pt-3 border-t border-border">Cancelled: {order.cancelReason}</p>
      )}
    </div>
  );
}
