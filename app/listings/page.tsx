"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { getCropImage } from "../lib/cropImages";
import { CATEGORY_STYLES, CATEGORY_NAMES } from "../lib/categoryStyles";

const CATEGORIES = CATEGORY_NAMES;

/* ─── Inline Create Listing Form ─── */
function CreateListingForm({ onCreated }: { onCreated: () => void }) {
  const [cropName, setCropName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [category, setCategory] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<string | null>(null);

  const checkPrice = async () => {
    if (!cropName) return;
    try {
      const data = await apiFetch(`/api/listings/price-suggestion?cropName=${encodeURIComponent(cropName)}`);
      if (data.suggestedPrice) {
        setSuggestedPrice(`Suggested: ₹${data.suggestedPrice.toFixed(2)}/${unit || "unit"} (${data.basedOnListings} listings)`);
      } else {
        setSuggestedPrice(null);
      }
    } catch {
      setSuggestedPrice(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await apiFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          cropName,
          quantity: parseFloat(quantity),
          unit,
          price: parseFloat(price),
          harvestDate: new Date(harvestDate).toISOString(),
          category: category || undefined,
        }),
      });
      // Reset
      setCropName(""); setQuantity(""); setUnit(""); setPrice(""); setHarvestDate("");
      setCategory(""); setSuggestedPrice(null);
      setShowOptional(false);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden mb-8">
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary-light" />
      <div className="p-6">
        <h2 className="text-lg font-bold text-charcoal mb-1">Create New Listing</h2>
        <p className="text-xs text-muted mb-4">List your produce for consumers to browse.</p>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Core fields */}
          <div>
            <label>Crop Name</label>
            <input type="text" value={cropName} onChange={(e) => setCropName(e.target.value)} onBlur={checkPrice} placeholder="e.g. Tomatoes, Wheat" required />
            {suggestedPrice && (
              <p className="text-xs text-accent mt-1 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                {suggestedPrice}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label>Quantity</label>
              <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="100" required />
            </div>
            <div>
              <label>Unit</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg" required />
            </div>
            <div>
              <label>Price (₹)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="40" required />
            </div>
          </div>

          <div>
            <label>Harvest Date</label>
            <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} required />
          </div>

          {/* Collapsible optional fields */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="text-xs text-muted hover:text-primary flex items-center gap-1 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showOptional ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Additional details (category)
          </button>

          {showOptional && (
            <div className="space-y-4 pl-4 border-l-2 border-border">
              <div>
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Listings Page ─── */
export default function Listings() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [listings, setListings] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const { user } = useAuth();

  const fetchListings = () => {
    const params = categoryFilter ? `?category=${encodeURIComponent(categoryFilter)}` : "";
    apiFetch(`/api/listings${params}`)
      .then((data) => setListings(data.listings || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const addToCart = async (listingId: string) => {
    const qty = quantities[listingId] || 1;
    setAddingToCart(listingId);
    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ listingId, quantity: qty }),
      });
      // Notify navbar to update cart count
      window.dispatchEvent(new Event("cart-updated"));
      
      const cropName = listings.find(l => l.id === listingId)?.cropName || "Item";
      toast.success(`Added ${qty} of ${cropName} to cart`);
      
      // Reset qty
      setQuantities((prev) => ({ ...prev, [listingId]: 1 }));
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative">
      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Home
            </Link>
            {categoryFilter && (
              <Link href="/listings" className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Clear Filter
              </Link>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal">
            {categoryFilter ? categoryFilter : "Marketplace"}
          </h1>
          <p className="text-muted text-sm mt-1">Fresh produce directly from local farmers</p>
        </div>
        {user?.role === "FARMER" && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-light transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {showCreateForm ? "Cancel" : "New Listing"}
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/listings"
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            !categoryFilter
              ? "bg-primary text-white border-primary"
              : "bg-white text-muted border-border hover:border-primary/30 hover:text-primary"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((cat) => {
          const catStyle = CATEGORY_STYLES[cat];
          return (
            <Link
              key={cat}
              href={`/listings?category=${encodeURIComponent(cat)}`}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                categoryFilter === cat
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white border-border hover:shadow-sm"
              }`}
              style={
                categoryFilter === cat
                  ? { backgroundColor: catStyle.color, borderColor: catStyle.color }
                  : { color: catStyle.color }
              }
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {/* Inline create form for farmers */}
      {showCreateForm && user?.role === "FARMER" && (
        <CreateListingForm
          onCreated={() => {
            setShowCreateForm(false);
            fetchListings();
          }}
        />
      )}

      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">No listings found</h3>
          <p className="text-sm text-muted mb-4 max-w-sm mx-auto">
            {categoryFilter
              ? `No produce available in "${categoryFilter}" right now. Try another category.`
              : "No produce is listed yet. Check back later or create a listing if you're a farmer."}
          </p>
          {categoryFilter && (
            <Link href="/listings" className="text-sm font-medium text-primary hover:text-primary-light">
              View all categories →
            </Link>
          )}
        </div>
      )}

      {/* Card Grid — enhanced with photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((l, idx) => (
          <div
            key={l.id}
            className="group glass-card rounded-xl hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden flex flex-col"
          >
            {/* Image or Category Banner */}
            <Link href={`/listings/${l.id}`} className="block relative h-40 w-full bg-primary/10 overflow-hidden">
              {getCropImage(l.cropName) ? (
                <img src={getCropImage(l.cropName)!} alt={l.cropName} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-primary font-bold text-5xl opacity-50">
                  {l.category ? l.category.charAt(0) : "M"}
                </div>
              )}
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-white/20">
                {l.category && <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block leading-tight">{l.category}</span>}
                <span className="text-xs font-bold text-charcoal leading-tight">₹{l.price}/{l.unit}</span>
              </div>
            </Link>

            {/* Card body */}
            <div className="p-4 flex-1 flex flex-col">
              <Link href={`/listings/${l.id}`}>
                <h3 className="text-base font-semibold text-charcoal group-hover:text-primary transition-colors mb-1">
                  {l.cropName}
                </h3>
              </Link>
              <p className="text-xs text-muted mb-3">
                {l.quantity} {l.unit} available
              </p>

              {/* Location badge */}
              {l.location && (
                <div className="flex items-center gap-1 text-xs text-muted mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="truncate">{l.location}</span>
                </div>
              )}

              {/* Distribution Center */}
              {l.distributionCenter && (
                <div className="flex items-start gap-1 text-[11px] text-muted mb-3 bg-surface border border-border p-1.5 rounded">
                  <svg className="shrink-0 mt-0.5" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  <span className="truncate" title={`${l.distributionCenter.name} - ${l.distributionCenter.address}`}>
                    <span className="font-semibold text-charcoal">{l.distributionCenter.name}</span>
                  </span>
                </div>
              )}

              {/* Farmer info */}
              <div className="flex items-center gap-2 text-xs text-muted mt-auto">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-accent text-xs font-semibold">
                    {l.farmer?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <span className="truncate">{l.farmer?.name}</span>
              </div>

              {/* Add to Cart */}
              {user?.role === "CONSUMER" && (
                <div className="mt-3 flex gap-2">
                  <input 
                    type="number"
                    min="1"
                    className="w-16 border border-border rounded-lg text-sm text-center"
                    value={quantities[l.id] || 1}
                    onChange={(e) => setQuantities({ ...quantities, [l.id]: parseFloat(e.target.value) || 1 })}
                  />
                  <button
                    onClick={() => addToCart(l.id)}
                    disabled={addingToCart === l.id}
                    className="flex-1 bg-primary/10 text-primary text-xs font-semibold py-2 rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {addingToCart === l.id ? "Adding..." : "Add to Cart"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
