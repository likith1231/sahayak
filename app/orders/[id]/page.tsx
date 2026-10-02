"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getCropImage } from "../../lib/cropImages";
import OrderTracker from "../../components/OrderTracker";
import { OrderData, etaHeadline, formatDateTime, isActive, statusBadgeClass } from "../../lib/orders";

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Delivery slot doesn't work for me",
  "Found a better price",
  "Need to change quantity",
  "Other",
];

export default function OrderTrackingPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      const data = await apiFetch(`/api/orders/${id}`);
      if (silent && lastStatus.current && lastStatus.current !== data.order.fulfillmentStatus) {
        toast.success(`Update: ${data.order.fulfillmentLabel}`);
      }
      lastStatus.current = data.order.fulfillmentStatus;
      setOrder(data.order);
      setLastUpdated(new Date());
      setError("");
    } catch (err: any) {
      if (!silent) setError(err.message || "Order not found");
    }
  }, [id]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  // Live tracking: poll while the order is still moving
  useEffect(() => {
    if (!order || !isActive(order)) return;
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, [order, load]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4">Please log in to track your order.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 mb-4">{error}</div>
        <Link href="/orders" className="text-sm text-muted hover:text-primary">← Back to My Orders</Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Loading tracking details...</p>
        </div>
      </div>
    );
  }

  const isFarmer = user.role === "FARMER";
  const isDelivery = order.fulfillmentType === "DELIVERY";
  const cancelled = order.fulfillmentStatus === "CANCELLED";
  const delivered = order.fulfillmentStatus === "DELIVERED";
  const img = getCropImage(order.listing.cropName);
  const grandTotal = order.totalPrice + (order.deliveryFee || 0);

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      const data = await apiFetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason }),
      });
      setOrder(data.order);
      setShowCancel(false);
      toast.success("Order cancelled");
    } catch (err: any) {
      toast.error(err.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const submitRating = async () => {
    if (!rating) return;
    setSubmittingRating(true);
    try {
      const data = await apiFetch(`/api/orders/${order.id}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating, review }),
      });
      setOrder(data.order);
      toast.success("Thanks for your feedback!");
    } catch (err: any) {
      toast.error(err.message || "Could not submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  const reorder = async () => {
    setReordering(true);
    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ listingId: order.listingId, quantity: order.quantity }),
      });
      window.dispatchEvent(new Event("cart-updated"));
      toast.success("Added to cart");
      router.push("/cart");
    } catch (err: any) {
      toast.error(err.message || "This item is no longer available");
    } finally {
      setReordering(false);
    }
  };

  const copyTracking = () => {
    if (!order.trackingNumber) return;
    navigator.clipboard?.writeText(order.trackingNumber);
    toast.success("Tracking number copied");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 print:py-0">
      <Link href={isFarmer ? "/farmer/orders" : "/orders"} className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6 print:hidden">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        {isFarmer ? "Back to Sales" : "Back to My Orders"}
      </Link>

      {/* ── Status hero ── */}
      <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden mb-6">
        <div className={`h-2 bg-gradient-to-r ${cancelled ? "from-error to-error/60" : delivered ? "from-success to-primary-light" : "from-primary to-primary-light"}`} />
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                {isDelivery ? "Home delivery" : "Pickup order"}
              </p>
              <h1 className={`text-2xl font-bold ${cancelled ? "text-error" : delivered ? "text-success" : "text-charcoal"}`}>
                {etaHeadline(order)}
              </h1>
              {order.trackingNumber && (
                <button onClick={copyTracking} className="!p-0 bg-transparent text-xs text-muted hover:text-primary mt-1 font-mono" title="Copy tracking number">
                  Tracking #{order.trackingNumber} ⧉
                </button>
              )}
            </div>
            <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass(order.fulfillmentStatus)}`}>
              {order.fulfillmentLabel}
            </span>
          </div>

          <OrderTracker steps={order.steps} />

          {isActive(order) && lastUpdated && (
            <p className="text-[11px] text-muted mt-5 flex items-center gap-1.5 print:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live · updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {/* ── Handover code (consumer) ── */}
      {!isFarmer && order.deliveryOtp && (
        <div className="glass-card rounded-xl p-5 mb-6 flex items-center justify-between gap-4 border border-accent/30">
          <div>
            <p className="text-sm font-bold text-charcoal">Handover code</p>
            <p className="text-xs text-muted mt-0.5">
              Share this code with {isDelivery ? "the delivery person" : "the farmer at the distribution center"} only when you receive your order.
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0" aria-label={`Handover code ${order.deliveryOtp}`}>
            {order.deliveryOtp.split("").map((d, i) => (
              <span key={i} className="w-9 h-11 rounded-lg bg-white border border-border flex items-center justify-center text-xl font-bold text-primary font-mono">{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Delivery partner ── */}
      {order.deliveryPartner?.name && order.fulfillmentStatus === "OUT_FOR_DELIVERY" && (
        <div className="glass-card rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {order.deliveryPartner.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{order.deliveryPartner.name}</p>
              <p className="text-xs text-muted">Your delivery partner</p>
            </div>
          </div>
          {order.deliveryPartner.phone && (
            <a href={`tel:${order.deliveryPartner.phone}`} className="text-sm font-semibold bg-primary !text-white px-4 py-2 rounded-lg hover:bg-primary-light">
              Call
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* ── Where ── */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-charcoal mb-3">{isDelivery ? "Delivery address" : "Pickup location"}</h2>
          {isDelivery && order.delivery ? (
            <div className="text-sm text-muted space-y-1">
              <p className="font-semibold text-charcoal">{order.delivery.name}</p>
              <p>{order.delivery.address}</p>
              <p>{order.delivery.city} – {order.delivery.pincode}</p>
              <p>Phone: {order.delivery.phone}</p>
              {order.deliverySlot && (
                <p className="pt-2"><span className="text-charcoal font-medium">Slot:</span> {order.deliveryDate && new Date(order.deliveryDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, {order.deliverySlot}</p>
              )}
              {order.delivery.instructions && (
                <p className="pt-1"><span className="text-charcoal font-medium">Instructions:</span> {order.delivery.instructions}</p>
              )}
            </div>
          ) : order.pickupCenter ? (
            <div className="text-sm text-muted space-y-1">
              <p className="font-semibold text-charcoal">{order.pickupCenter.name}</p>
              <p>{order.pickupCenter.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.pickupCenter.name + " " + order.pickupCenter.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block pt-2 text-xs font-semibold print:hidden"
              >
                Get directions →
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted">Contact the farmer to arrange pickup.</p>
          )}
        </div>

        {/* ── Who ── */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-bold text-charcoal mb-3">{isFarmer ? "Buyer" : "Sold by"}</h2>
          {isFarmer ? (
            order.consumer && (
              <div className="text-sm text-muted space-y-1">
                <p className="font-semibold text-charcoal">{order.consumer.name}</p>
                <a href={`tel:${order.consumer.phone}`}>{order.consumer.phone}</a>
              </div>
            )
          ) : (
            order.listing.farmer && (
              <div className="text-sm text-muted space-y-1">
                <p className="font-semibold text-charcoal">{order.listing.farmer.name}</p>
                <a href={`tel:${order.listing.farmer.phone}`}>{order.listing.farmer.phone}</a>
                <p className="text-xs pt-1">Local farmer · Fresh from the farm</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Item & payment ── */}
      <div className="glass-card rounded-xl p-5 mb-6">
        <h2 className="text-sm font-bold text-charcoal mb-4">Order summary</h2>
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-primary/5 shrink-0">
            {img ? <img src={img} alt={order.listing.cropName} className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center text-primary/30 font-bold text-2xl">{order.listing.cropName.charAt(0)}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-charcoal">{order.listing.cropName}</p>
            <p className="text-xs text-muted">{order.quantity} {order.listing.unit} × ₹{order.listing.price}</p>
          </div>
          <p className="font-semibold text-charcoal">₹{order.totalPrice.toFixed(2)}</p>
        </div>
        <div className="space-y-2 pt-4 text-sm">
          {isDelivery && (
            <div className="flex justify-between text-muted">
              <span>Delivery fee</span>
              <span>{order.deliveryFee ? `₹${order.deliveryFee.toFixed(2)}` : "FREE"}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-charcoal">
            <span>Total</span>
            <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted text-xs pt-1">
            <span>Payment</span>
            <span>{order.paymentLabel}</span>
          </div>
          <div className="flex justify-between text-muted text-xs">
            <span>Ordered on</span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {order.refundStatus && (
            <div className="flex justify-between text-xs">
              <span className="text-muted">Refund</span>
              <span className="font-semibold text-primary">{order.refundStatus === "INITIATED" ? "Initiated (5–7 business days)" : "Being processed"}</span>
            </div>
          )}
          {cancelled && order.cancelReason && (
            <div className="flex justify-between text-xs">
              <span className="text-muted">Cancellation reason</span>
              <span className="text-charcoal">{order.cancelReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Rate ── */}
      {!isFarmer && delivered && (
        <div className="glass-card rounded-xl p-5 mb-6 print:hidden">
          <h2 className="text-sm font-bold text-charcoal mb-3">{order.rating ? "Your rating" : "Rate this order"}</h2>
          {order.rating ? (
            <div>
              <Stars value={order.rating} />
              {order.review && <p className="text-sm text-muted mt-2">&ldquo;{order.review}&rdquo;</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="!p-0.5 bg-transparent"
                  >
                    <StarIcon filled={n <= (hoverRating || rating)} size={28} />
                  </button>
                ))}
              </div>
              <textarea rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder="How was the freshness and quality? (optional)" maxLength={500} />
              <button onClick={submitRating} disabled={!rating || submittingRating} className="bg-primary text-white hover:bg-primary-light">
                {submittingRating ? "Submitting..." : "Submit review"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Activity log ── */}
      {order.events && order.events.length > 0 && (
        <div className="glass-card rounded-xl p-5 mb-6">
          <h2 className="text-sm font-bold text-charcoal mb-4">Tracking history</h2>
          <ol className="relative border-l-2 border-border ml-1.5 space-y-5">
            {order.events.map((e, i) => (
              <li key={e.id} className="pl-5 relative">
                <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ${i === 0 ? (e.status === "CANCELLED" ? "bg-error" : "bg-primary") : "bg-border"}`} />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                  <p className={`text-sm font-semibold ${i === 0 ? "text-charcoal" : "text-muted"}`}>{e.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.createdAt)}</p>
                </div>
                {e.description && <p className="text-xs text-muted mt-0.5">{e.description}</p>}
                {e.location && <p className="text-xs text-primary mt-0.5">{e.location}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Actions ── */}
      {!isFarmer && (
        <div className="flex flex-wrap gap-3 print:hidden">
          {order.canCancel && !showCancel && (
            <button onClick={() => setShowCancel(true)} className="bg-white text-error border border-error/30 hover:bg-error/5">
              Cancel order
            </button>
          )}
          {(delivered || cancelled) && (
            <button onClick={reorder} disabled={reordering} className="bg-primary text-white hover:bg-primary-light">
              {reordering ? "Adding..." : "Buy it again"}
            </button>
          )}
          <button onClick={() => window.print()} className="bg-white text-charcoal border border-border hover:border-primary/40">
            Download invoice
          </button>
          <a href={`tel:${order.listing.farmer?.phone}`} className="inline-flex items-center text-sm font-semibold px-5 py-2.5 rounded-lg bg-white border border-border text-charcoal hover:border-primary/40">
            Contact farmer
          </a>
        </div>
      )}

      {showCancel && (
        <div className="glass-card-strong rounded-xl p-5 mt-4 border border-error/20 print:hidden">
          <h3 className="text-sm font-bold text-charcoal mb-1">Cancel this order?</h3>
          <p className="text-xs text-muted mb-4">
            {order.status === "PAID" ? "Your payment will be refunded to the original payment method." : "No payment has been taken for this order."}
          </p>
          <label htmlFor="cancel-reason">Reason</label>
          <select id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mb-4">
            {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={cancelOrder} disabled={cancelling} className="bg-emergency text-white hover:opacity-90">
              {cancelling ? "Cancelling..." : "Yes, cancel order"}
            </button>
            <button onClick={() => setShowCancel(false)} className="bg-white text-muted border border-border">Keep order</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StarIcon({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#D4A373" : "none"} stroke={filled ? "#D4A373" : "#9CA3AF"} strokeWidth="1.5" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => <StarIcon key={n} filled={n <= value} />)}
    </div>
  );
}
