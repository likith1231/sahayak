"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import TranslateWidget from "../../components/TranslateWidget";
import { toast } from "react-hot-toast";
import { getCropImage } from "../../lib/cropImages";

export default function ListingDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/listings/${id}`)
      .then((data) => setListing(data.listing || data))
      .catch((err) => setError(err.message));
  }, [id]);

  const handleAddToCart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = parseFloat(orderQuantity) || 1;
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          listingId: id,
          quantity: qty
        })
      });
      window.dispatchEvent(new Event("cart-updated"));
      toast.success(`Added ${qty} of ${listing.cropName} to cart`);
      setOrderQuantity("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    }
  };

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3">{error}</div>
    </div>
  );

  if (!listing) return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <div className="glass-card rounded-xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm text-muted">Loading listing details...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 relative">
      <Link href="/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Listings
      </Link>

      <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden relative">
        
        {/* Image Banner */}
        {getCropImage(listing.cropName) ? (
          <div className="w-full h-48 md:h-64 bg-primary/10 relative">
            <img src={getCropImage(listing.cropName)!} alt={listing.cropName} className="object-cover w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6 md:left-8">
              {listing.category && <span className="text-xs font-semibold text-white/90 uppercase tracking-wider block mb-1">{listing.category}</span>}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{listing.cropName}</h1>
            </div>
          </div>
        ) : (
          <div className="h-2 bg-gradient-to-r from-primary to-primary-light" />
        )}

        <div className="p-6 md:p-8">
          {/* Crop Name + Translate (only if no image) */}
          {!getCropImage(listing.cropName) && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-charcoal mb-2">Listing Details</h1>
              <div className="mt-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Crop Name</span>
                <TranslateWidget text={listing.cropName} />
              </div>
            </div>
          )}
          {getCropImage(listing.cropName) && (
            <div className="mb-6 flex items-center justify-between">
              <TranslateWidget text={listing.cropName} />
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-cream/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Quantity</p>
              <p className="text-lg font-bold text-charcoal">{listing.quantity} <span className="text-sm font-normal text-muted">{listing.unit}</span></p>
            </div>
            <div className="bg-cream/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Price</p>
              <p className="text-lg font-bold text-primary">₹{listing.price}<span className="text-sm font-normal text-muted">/{listing.unit}</span></p>
            </div>
            <div className="bg-cream/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Harvest Date</p>
              <p className="text-sm font-medium text-charcoal">{new Date(listing.harvestDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-cream/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Farmer</p>
              <p className="text-sm font-medium text-charcoal">{listing.farmer?.name}</p>
            </div>
          </div>

          {/* Assigned Distribution Center */}
          {listing.distributionCenter && (
            <div className="bg-surface border border-border rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-charcoal mb-1 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Assigned Distribution Center
              </h4>
              <p className="text-xs text-charcoal font-medium">{listing.distributionCenter.name}</p>
              <p className="text-xs text-muted">{listing.distributionCenter.address}, {listing.distributionCenter.district}</p>
            </div>
          )}

          {/* Order Section (Consumer only) */}
          {user?.role === "CONSUMER" && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Add to Cart</h3>

              <form onSubmit={handleAddToCart} className="flex items-end gap-3">
                <div className="flex-1">
                  <label>Quantity ({listing.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    placeholder={`Max ${listing.quantity}`}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-primary text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-light transition-colors shrink-0"
                >
                  Add to Cart
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
