"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RadioGroup } from "../components/RadioGroup";
import AddressForm from "../components/AddressForm";
import { Address, FulfillmentType, formatDate } from "../lib/orders";

interface CartItemData {
  id: string;
  listingId: string;
  quantity: number;
  listing?: {
    cropName: string;
    price: number;
    unit: string;
    category?: string;
    farmer?: { name: string; phone: string };
    distributionCenter?: { id: string; name: string; district: string; address: string };
  };
}

interface PickupDetail {
  dc: { name: string; address: string };
  items: { cropName: string; quantity: string; farmer: { name: string; phone: string } }[];
}

interface SlotDay {
  date: string;
  label: string;
  slots: { id: string; label: string; window: string; available: boolean }[];
}

interface CheckoutResult {
  orders_count: number;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  fulfillment_type: FulfillmentType;
  orders: { id: string; trackingNumber: string; listingId: string }[];
  delivery: { name: string; address: string; city: string; pincode: string; slot: string; date: string; estimatedDeliveryAt: string } | null;
  pickup_details: PickupDetail[];
}

type Step = "summary" | "confirmation";

// Mirrors backend defaults; the server's /api/delivery/slots response is authoritative.
const DEFAULT_FEE = 40;
const DEFAULT_FREE_THRESHOLD = 500;

export default function CheckoutPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("summary");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CARD");

  // Fulfillment
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("DELIVERY");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [slotDays, setSlotDays] = useState<SlotDay[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [serviceable, setServiceable] = useState<boolean | null>(null);
  const [fee, setFee] = useState(DEFAULT_FEE);
  const [freeThreshold, setFreeThreshold] = useState(DEFAULT_FREE_THRESHOLD);

  useEffect(() => {
    if (user?.role === "CONSUMER") {
      fetchCartItems();
      fetchAddresses();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  // Re-check serviceability and slots whenever the delivery pincode changes
  useEffect(() => {
    if (fulfillment !== "DELIVERY" || !selectedAddress) {
      setSlotDays([]);
      setServiceable(null);
      return;
    }
    const pincode = selectedAddress.pincode;
    setSlotsLoading(true);
    Promise.all([
      apiFetch(`/api/delivery/serviceability?pincode=${pincode}`),
      apiFetch(`/api/delivery/slots?pincode=${pincode}`),
    ])
      .then(([svc, slots]) => {
        setServiceable(svc.serviceable);
        setFee(slots.deliveryFee ?? DEFAULT_FEE);
        setFreeThreshold(slots.freeDeliveryThreshold ?? DEFAULT_FREE_THRESHOLD);
        const days: SlotDay[] = svc.serviceable ? slots.days || [] : [];
        setSlotDays(days);
        // Preselect the earliest available slot, like most grocery apps do
        const firstDay = days[0];
        const firstSlot = firstDay?.slots.find((s) => s.available);
        setSelectedDate(firstDay?.date || null);
        setSelectedSlot(firstSlot?.id || null);
      })
      .catch(() => setServiceable(null))
      .finally(() => setSlotsLoading(false));
  }, [fulfillment, selectedAddress?.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/cart");
      const cartItems = data.items || [];

      const enriched = await Promise.all(
        cartItems.map(async (item: CartItemData) => {
          try {
            const listingData = await apiFetch(`/api/listings/${item.listingId}`);
            return { ...item, listing: listingData.listing || listingData };
          } catch {
            return item;
          }
        })
      );

      setItems(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const data = await apiFetch("/api/addresses");
      const list: Address[] = data.addresses || [];
      setAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setSelectedAddressId(def.id);
      else setShowAddressForm(true);
    } catch {
      setShowAddressForm(true);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.listing?.price || 0) * item.quantity;
  }, 0);
  const deliveryFee = fulfillment === "DELIVERY" ? (subtotal >= freeThreshold ? 0 : fee) : 0;
  const total = subtotal + deliveryFee;

  const deliveryReady = fulfillment === "PICKUP" || (!!selectedAddress && serviceable === true && !!selectedDate && !!selectedSlot);

  const finish = (data: CheckoutResult) => {
    window.dispatchEvent(new Event("cart-updated"));
    window.dispatchEvent(new Event("notifications-updated"));
    setResult(data);
    setStep("confirmation");
  };

  const handleCheckout = async () => {
    setProcessingPayment(true);
    setError("");

    try {
      const isCash = paymentMethod === "CASH";
      const checkoutData: CheckoutResult & { razorpay_order: any } = await apiFetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: isCash ? (fulfillment === "DELIVERY" ? "CASH_ON_DELIVERY" : "CASH_ON_PICKUP") : "CARD",
          fulfillmentType: fulfillment,
          addressId: fulfillment === "DELIVERY" ? selectedAddressId : null,
          deliveryDate: fulfillment === "DELIVERY" ? selectedDate : null,
          deliverySlot: fulfillment === "DELIVERY" ? selectedSlot : null,
          deliveryInstructions: fulfillment === "DELIVERY" ? instructions : null,
        }),
      });

      const rzpOrder = checkoutData.razorpay_order;

      if (!rzpOrder) {
        finish(checkoutData);
        return;
      }

      // Real Razorpay: load checkout script
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const options = {
          key: rzpOrder.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || "INR",
          name: "Sahayak",
          description: "Fresh produce order",
          order_id: rzpOrder.id,
          handler: async function (response: any) {
            try {
              await apiFetch("/api/checkout/verify", {
                method: "POST",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              finish(checkoutData);
            } catch (err: any) {
              setError("Payment verification failed. Contact support.");
            }
          },
          prefill: {
            name: user?.name,
            contact: selectedAddress?.phone || user?.phone,
          },
          theme: {
            color: "#2D6A4F",
          },
        };

        const rzp = new (window as any).Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
            setError(response.error.description || "Payment failed or was cancelled.");
        });

        rzp.open();
      };
      document.body.appendChild(script);
    } catch (err: any) {
      setError(err.message || "Checkout failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (!user || user.role !== "CONSUMER") {
    return (
      <div className="max-w-lg mx-auto px-4 md:px-8 py-12 text-center">
        <div className="glass-card-strong rounded-xl p-8">
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-sm text-muted mb-4">Only consumers can checkout.</p>
          <Link href="/" className="text-primary text-sm font-medium hover:text-primary-light">Back to Home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted">Preparing checkout...</p>
        </div>
      </div>
    );
  }

  /* ───── CONFIRMATION STEP ───── */
  if (step === "confirmation" && result) {
    const isDelivery = result.fulfillment_type === "DELIVERY";
    return (
      <div className="max-w-xl mx-auto px-4 md:px-8 py-12">
        <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-success to-primary-light" />
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-charcoal mb-2">Order Placed!</h1>
            <p className="text-sm text-muted mb-6">
              {result.orders_count} item{result.orders_count > 1 ? "s" : ""} ordered. Total: <strong className="text-charcoal">₹{result.total_amount.toFixed(2)}</strong>
            </p>

            {isDelivery && result.delivery && (
              <div className="text-left bg-primary/5 border border-primary/15 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TruckIcon />
                  <h3 className="text-base font-bold text-charcoal">Arriving {formatDate(result.delivery.date + "T00:00:00")}</h3>
                </div>
                <p className="text-sm text-charcoal font-medium">{result.delivery.slot}</p>
                <p className="text-xs text-muted mt-2">
                  Delivering to <strong className="text-charcoal">{result.delivery.name}</strong>, {result.delivery.address}, {result.delivery.city} – {result.delivery.pincode}
                </p>
                <p className="text-xs text-muted mt-2">
                  Share the 4-digit handover code from your order page with the delivery person to receive your order.
                </p>
              </div>
            )}

            {/* Tracking numbers */}
            <div className="text-left space-y-2 mb-6">
              <h3 className="text-sm font-bold text-charcoal">Track your order{result.orders.length > 1 ? "s" : ""}</h3>
              {result.orders.map((o) => {
                const item = items.find((i) => i.listingId === o.listingId);
                return (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between bg-white rounded-lg p-3 border border-border hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal">{item?.listing?.cropName || "Order"}</p>
                      <p className="text-xs text-muted font-mono">#{o.trackingNumber}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">Track →</span>
                  </Link>
                );
              })}
            </div>

            {/* Grouped Pickup details */}
            {!isDelivery && result.pickup_details.length > 0 && (
              <div className="space-y-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <PinIcon />
                  <h3 className="text-base font-bold text-charcoal">Pickup Coordination</h3>
                </div>
                <p className="text-xs text-muted mb-4">
                  Travel to the designated Distribution Centers below to pick up your order. We&apos;ll notify you when it&apos;s ready; you can also contact the farmer directly.
                </p>

                {result.pickup_details.map((pd, idx) => (
                  <div key={idx} className="bg-cream rounded-xl p-5 border border-border">
                    <h4 className="text-sm font-bold text-charcoal">{pd.dc.name}</h4>
                    <p className="text-xs text-muted mb-4">{pd.dc.address}</p>

                    <div className="space-y-3">
                      {pd.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-border">
                          <div>
                            <p className="text-sm font-medium text-charcoal">{item.cropName}</p>
                            <p className="text-xs text-muted">{item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-charcoal">{item.farmer.name}</p>
                            <p className="text-xs text-primary font-semibold">{item.farmer.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/orders"
                className="inline-flex items-center justify-center gap-2 bg-primary !text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-primary-light transition-colors"
              >
                View My Orders
              </Link>
              <Link
                href="/listings"
                className="inline-flex items-center justify-center gap-2 bg-white text-charcoal text-sm font-semibold px-6 py-3 rounded-lg border border-border hover:border-primary/40 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───── ORDER SUMMARY STEP ───── */
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Cart
      </Link>

      <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary-light" />
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-charcoal mb-1">Checkout</h1>
          <p className="text-sm text-muted mb-6">Choose how you&apos;d like to receive your order</p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted mb-4">Your cart is empty.</p>
              <Link href="/listings" className="text-sm font-medium text-primary hover:text-primary-light">Browse Marketplace</Link>
            </div>
          ) : (
            <>
              {/* ── 1. Fulfillment method ── */}
              <SectionTitle n={1} title="Delivery method" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <FulfillmentCard
                  active={fulfillment === "DELIVERY"}
                  onClick={() => setFulfillment("DELIVERY")}
                  icon={<TruckIcon />}
                  title="Home Delivery"
                  subtitle={subtotal >= freeThreshold ? "FREE delivery on this order" : `₹${fee} · Free above ₹${freeThreshold}`}
                />
                <FulfillmentCard
                  active={fulfillment === "PICKUP"}
                  onClick={() => setFulfillment("PICKUP")}
                  icon={<PinIcon />}
                  title="Pickup"
                  subtitle="Collect from the distribution center · Free"
                />
              </div>

              {/* ── 2. Address + slot ── */}
              {fulfillment === "DELIVERY" && (
                <>
                  <SectionTitle n={2} title="Delivery address" />
                  <div className="space-y-2 mb-3">
                    {addresses.map((a) => (
                      <label
                        key={a.id}
                        className={`!flex items-start gap-3 !mb-0 !font-normal p-3 rounded-lg border cursor-pointer transition-colors ${selectedAddressId === a.id ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/30"}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === a.id}
                          onChange={() => setSelectedAddressId(a.id)}
                          className="mt-1 accent-primary"
                        />
                        <div className="text-sm">
                          <p className="font-semibold text-charcoal">
                            {a.name} <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">{a.label}</span>
                          </p>
                          <p className="text-muted text-xs mt-0.5">
                            {[a.line1, a.line2, a.landmark && `Near ${a.landmark}`].filter(Boolean).join(", ")}, {a.city} – {a.pincode} · {a.phone}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {showAddressForm ? (
                    <div className="bg-white rounded-lg border border-border p-4 mb-4">
                      <AddressForm
                        submitLabel="Save & deliver here"
                        initial={{ name: user.name, phone: user.phone }}
                        onSaved={(addr) => {
                          setAddresses((prev) => [addr, ...prev.map((p) => (addr.isDefault ? { ...p, isDefault: false } : p))]);
                          setSelectedAddressId(addr.id);
                          setShowAddressForm(false);
                        }}
                        onCancel={addresses.length ? () => setShowAddressForm(false) : undefined}
                      />
                    </div>
                  ) : (
                    <button onClick={() => setShowAddressForm(true)} className="!p-0 bg-transparent text-primary text-sm hover:text-primary-light mb-4">
                      + Add a new address
                    </button>
                  )}

                  {selectedAddress && serviceable === false && (
                    <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">
                      We don&apos;t deliver to {selectedAddress.pincode} yet. Choose another address or switch to pickup.
                    </div>
                  )}

                  {selectedAddress && serviceable && (
                    <>
                      <SectionTitle n={3} title="Delivery slot" />
                      {slotsLoading ? (
                        <p className="text-sm text-muted mb-6">Checking available slots...</p>
                      ) : (
                        <div className="mb-6">
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                            {slotDays.map((d) => (
                              <button
                                key={d.date}
                                type="button"
                                onClick={() => {
                                  setSelectedDate(d.date);
                                  setSelectedSlot(d.slots.find((s) => s.available)?.id || null);
                                }}
                                className={`shrink-0 !px-4 !py-2 rounded-lg border text-xs ${selectedDate === d.date ? "bg-primary text-white border-primary" : "bg-white text-charcoal border-border hover:border-primary/40"}`}
                              >
                                <span className="block font-semibold">{d.label}</span>
                                <span className={`block font-normal ${selectedDate === d.date ? "text-white/80" : "text-muted"}`}>
                                  {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {slotDays.find((d) => d.date === selectedDate)?.slots.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                disabled={!s.available}
                                onClick={() => setSelectedSlot(s.id)}
                                className={`!px-3 !py-2.5 rounded-lg border text-left ${selectedSlot === s.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-white hover:border-primary/40"}`}
                              >
                                <span className="block text-sm font-semibold text-charcoal">{s.label}</span>
                                <span className="block text-xs font-normal text-muted">{s.available ? s.window : "Unavailable"}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mb-6">
                        <label htmlFor="instructions">Delivery instructions <span className="text-muted font-normal">(optional)</span></label>
                        <textarea
                          id="instructions"
                          rows={2}
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="e.g. Leave with the security guard, call on arrival"
                          maxLength={200}
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Items ── */}
              <SectionTitle n={fulfillment === "DELIVERY" ? 4 : 2} title="Order summary" />
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{item.listing?.cropName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {item.quantity} {item.listing?.unit} × ₹{item.listing?.price || 0}
                        </span>
                        {fulfillment === "PICKUP" && item.listing?.distributionCenter && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-cream text-primary px-2 py-0.5 rounded-full font-medium">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            {item.listing.distributionCenter.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-charcoal shrink-0 ml-4">
                      ₹{((item.listing?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 py-4 border-t border-border text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {fulfillment === "DELIVERY" && (
                  <div className="flex justify-between text-muted">
                    <span>Delivery fee</span>
                    {deliveryFee === 0 ? (
                      <span className="text-success font-semibold"><s className="text-muted font-normal mr-1">₹{fee}</s>FREE</span>
                    ) : (
                      <span>₹{deliveryFee.toFixed(2)}</span>
                    )}
                  </div>
                )}
                {fulfillment === "DELIVERY" && deliveryFee > 0 && (
                  <p className="text-xs text-primary bg-primary/5 rounded-md px-3 py-2">
                    Add ₹{(freeThreshold - subtotal).toFixed(0)} more for free delivery.{" "}
                    <Link href="/listings" className="font-semibold underline">Shop more</Link>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between py-4 border-t-2 border-charcoal/10 mb-6">
                <span className="text-base font-bold text-charcoal">Total</span>
                <span className="text-xl font-bold text-primary">₹{total.toFixed(2)}</span>
              </div>

              {fulfillment === "PICKUP" && (
                <div className="bg-cream rounded-lg p-3 mb-6">
                  <p className="text-xs text-muted leading-relaxed">
                    <strong className="text-charcoal">Pickup:</strong> You&apos;ll collect your order from the farmer&apos;s distribution center. We&apos;ll notify you when it&apos;s ready, and you can track it from My Orders.
                  </p>
                </div>
              )}

              <RadioGroup
                title="Payment Method"
                name="paymentMethod"
                selectedValue={paymentMethod}
                onChange={(val) => setPaymentMethod(val as "CARD" | "CASH")}
                options={[
                  { value: "CARD", label: "Pay Online (Card / UPI)" },
                  { value: "CASH", label: fulfillment === "DELIVERY" ? "Cash on Delivery" : "Cash on Pickup" }
                ]}
              />

              {/* Pay button */}
              <button
                onClick={handleCheckout}
                disabled={processingPayment || !deliveryReady}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 text-sm"
              >
                {processingPayment ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : !deliveryReady ? (
                  !selectedAddress ? "Add a delivery address to continue" : "Choose a delivery slot"
                ) : paymentMethod === "CARD" ? (
                  `Pay ₹${total.toFixed(2)}`
                ) : (
                  `Place Order (₹${total.toFixed(2)} ${fulfillment === "DELIVERY" ? "on delivery" : "at pickup"})`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-charcoal mb-3">
      <span className="w-5 h-5 rounded-full bg-primary text-white text-[11px] flex items-center justify-center">{n}</span>
      {title}
    </h3>
  );
}

function FulfillmentCard({ active, onClick, icon, title, subtitle }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-3 text-left !p-4 rounded-xl border-2 transition-all ${active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/30"}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary/15" : "bg-cream"}`}>{icon}</div>
      <div>
        <span className="block text-sm font-bold text-charcoal">{title}</span>
        <span className="block text-xs font-normal text-muted mt-0.5">{subtitle}</span>
      </div>
    </button>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
