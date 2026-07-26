"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { CartStepper } from "../components/CartStepper";
import { getCropImage } from "../lib/cropImages";

interface CartItemData {
  id: string;
  listingId: string;
  quantity: number;
  listing?: {
    cropName: string;
    price: number;
    unit: string;
    category?: string;
    location?: string;
    farmer?: { name: string; phone: string };
  };
}


export default function CartPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/cart");
      // The cart endpoint returns items with listing details if populated by the backend,
      // otherwise we need to fetch listing details separately
      const cartItems = data.items || [];

      // Fetch listing details for each item
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

  useEffect(() => {
    if (user?.role === "CONSUMER") {
      fetchCart();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const removeItem = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await apiFetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err: any) {
      alert(err.message || "Failed to remove item");
    } finally {
      setRemovingId(null);
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty <= 0) return removeItem(itemId);
    try {
      const data = await apiFetch(`/api/cart/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity: newQty }),
      });
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity: data.quantity } : i))
      );
    } catch (err: any) {
      alert(err.message || "Failed to update quantity");
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.listing?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  if (!user || user.role !== "CONSUMER") {
    return (
      <div className="max-w-lg mx-auto px-4 md:px-8 py-12 text-center">
        <div className="glass-card-strong rounded-xl p-8">
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-sm text-muted mb-4">Only consumers can view the cart.</p>
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
          <p className="text-sm text-muted">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 relative">
      <Link href="/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Continue Shopping
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-6">Your Cart</h1>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4A373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">Your cart is empty</h3>
          <p className="text-sm text-muted mb-4">Browse the marketplace and add fresh produce to your cart.</p>
          <Link href="/listings" className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-light transition-colors">
            Browse Marketplace
          </Link>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="glass-card rounded-xl p-4 flex gap-4 transition-all duration-300">
                {/* Thumbnail / Category Badge */}
                <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden relative border border-border">
                  {item.listing?.cropName && getCropImage(item.listing.cropName) ? (
                    <img src={getCropImage(item.listing.cropName)!} alt={item.listing.cropName} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-primary text-2xl font-bold">
                      {item.listing?.category ? item.listing.category.charAt(0) : "M"}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-charcoal text-sm truncate">{item.listing?.cropName || "Unknown"}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    by {item.listing?.farmer?.name || "Unknown farmer"}
                    {item.listing?.location && ` · ${item.listing.location}`}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-semibold text-primary">
                      ₹{item.listing?.price || 0}/{item.listing?.unit || "unit"}
                    </p>
                    <CartStepper 
                      quantity={item.quantity} 
                      onUpdate={(newQty) => updateQuantity(item.id, newQty)} 
                    />
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="flex flex-col items-end justify-between shrink-0">
                  <p className="text-sm font-bold text-charcoal">
                    ₹{((item.listing?.price || 0) * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={removingId === item.id}
                    className="text-xs text-error hover:text-error/80 font-medium transition-colors disabled:opacity-50"
                  >
                    {removingId === item.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="glass-card-strong rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">Subtotal ({items.length} item{items.length > 1 ? "s" : ""})</span>
              <span className="text-lg font-bold text-charcoal">₹{subtotal.toFixed(2)}</span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-primary text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-light transition-colors text-sm"
            >
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
