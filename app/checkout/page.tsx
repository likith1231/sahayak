"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { RadioGroup } from "../components/RadioGroup";

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

type Step = "summary" | "payment" | "confirmation";

export default function CheckoutPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("summary");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pickupDetails, setPickupDetails] = useState<PickupDetail[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH_ON_PICKUP">("CARD");

  useEffect(() => {
    if (user?.role === "CONSUMER") {
      fetchCartItems();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.listing?.price || 0) * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    setProcessingPayment(true);
    setError("");

    try {
      // Step 1: Call checkout endpoint
      const checkoutData = await apiFetch("/api/checkout", { 
        method: "POST",
        body: JSON.stringify({
          paymentMethod
        })
      });

      const rzpOrder = checkoutData.razorpay_order;
      setPickupDetails(checkoutData.pickup_details || []);
      setOrdersCount(checkoutData.orders_count || 0);
      setTotalAmount(checkoutData.total_amount || subtotal);

      if (!rzpOrder) {
        // Cash on pickup or free order
        window.dispatchEvent(new Event("cart-updated"));
        setStep("confirmation");
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
              window.dispatchEvent(new Event("cart-updated"));
              setStep("confirmation");
            } catch (err: any) {
              setError("Payment verification failed. Contact support.");
            }
          },
          prefill: {
            name: user?.name,
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
  if (step === "confirmation") {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-8 py-12">
        <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-success to-primary-light" />
          <div className="p-8 text-center">
            {/* 3D success celebration */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              {/* Success checkmark overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-charcoal mb-2">Order Placed!</h1>
            <p className="text-sm text-muted mb-6">
              {ordersCount} order{ordersCount > 1 ? "s" : ""} placed successfully. Total: <strong className="text-charcoal">₹{totalAmount.toFixed(2)}</strong>
            </p>

            {/* Grouped Pickup details */}
            {pickupDetails.length > 0 && (
              <div className="space-y-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  <h3 className="text-base font-bold text-charcoal">Pickup Coordination</h3>
                </div>
                <p className="text-xs text-muted mb-4">
                  Travel to the designated Distribution Centers below to pick up your order. Contact the farmer to arrange exact timing.
                </p>

                {pickupDetails.map((pd, idx) => (
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

            <Link
              href="/listings"
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-primary-light transition-colors"
            >
              Back to Marketplace
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ───── ORDER SUMMARY STEP ───── */
  return (
    <div className="max-w-xl mx-auto px-4 md:px-8 py-8">
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
          <p className="text-sm text-muted mb-6">Review your order before payment</p>

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
              {/* Items */}
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{item.listing?.cropName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {item.quantity} {item.listing?.unit} × ₹{item.listing?.price || 0}
                        </span>
                        {item.listing?.distributionCenter && (
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

              {/* Total */}
              <div className="flex items-center justify-between py-4 border-t-2 border-charcoal/10 mb-6">
                <span className="text-base font-bold text-charcoal">Total</span>
                <span className="text-xl font-bold text-primary">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Info note */}
              <div className="bg-cream rounded-lg p-3 mb-6">
                <p className="text-xs text-muted leading-relaxed">
                  <strong className="text-charcoal">Note:</strong> After payment, you&apos;ll receive the farmer&apos;s contact details to coordinate pickup. Sahayak does not handle delivery — you&apos;ll pick up directly from the farmer.
                </p>
              </div>

              <RadioGroup
                title="Payment Method"
                name="paymentMethod"
                selectedValue={paymentMethod}
                onChange={(val) => setPaymentMethod(val as "CARD" | "CASH_ON_PICKUP")}
                options={[
                  { value: "CARD", label: "Pay Online (Card / UPI)" },
                  { value: "CASH_ON_PICKUP", label: "Cash on Pickup" }
                ]}
              />

              {/* Pay button */}
              <button
                onClick={handleCheckout}
                disabled={processingPayment}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 text-sm"
              >
                {processingPayment ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  paymentMethod === "CARD" ? `Pay ₹${subtotal.toFixed(2)}` : `Confirm Order (₹${subtotal.toFixed(2)} at Pickup)`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
