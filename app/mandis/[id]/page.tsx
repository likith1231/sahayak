"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, getMandi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";
import { getCropImage } from "../../lib/cropImages";

interface DistributionCenter {
  id: string;
  name: string;
  district: string;
  address: string;
}

export default function MandiDetailsPage() {
  const { id } = useParams() as { id: string };
  const [mandi, setMandi] = useState<DistributionCenter | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // Emergency Request State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyNeed, setEmergencyNeed] = useState("");
  const [submittingEmergency, setSubmittingEmergency] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMandi(id),
      apiFetch(`/api/listings?distribution_center_id=${id}`)
    ])
      .then(([mandiData, listingsData]) => {
        setMandi(mandiData);
        setListings(listingsData.listings || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load distribution center details");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addToCart = async (listingId: string) => {
    const qty = quantities[listingId] || 1;
    setAddingToCart(listingId);
    try {
      await apiFetch("/api/cart", {
        method: "POST",
        body: JSON.stringify({ listingId, quantity: qty }),
      });
      toast.success("Added to cart");
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  const handleEmergencyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyNeed.trim()) return;
    
    setSubmittingEmergency(true);
    try {
      await apiFetch("/api/emergency", {
        method: "POST",
        body: JSON.stringify({
          latitude: 0, // In a real app we'd get NGO location, but use 0 for now or fetch from user profile
          longitude: 0,
          needType: emergencyNeed,
          targetMandiId: id
        }),
      });
      toast.success("Emergency request created successfully");
      setShowEmergencyModal(false);
      setEmergencyNeed("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create emergency request");
    } finally {
      setSubmittingEmergency(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mandi) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-charcoal mb-2">Distribution Center Not Found</h1>
        <Link href="/mandis" className="text-primary hover:underline">
          Return to Mandis
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <Link href="/mandis" className="text-sm font-medium text-muted hover:text-primary transition-colors flex items-center gap-1 w-fit mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Mandis
          </Link>
          <h1 className="text-3xl font-bold text-charcoal tracking-tight mb-2">
            {mandi.name}
          </h1>
          <p className="text-muted flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {mandi.address}
          </p>
        </div>
        
        {user?.role === "NGO" && listings.length > 0 && (
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="shrink-0 bg-emergency/10 text-emergency font-semibold py-2.5 px-5 rounded-lg hover:bg-emergency hover:text-white transition-colors border border-emergency/20 flex items-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Request Stock for Emergency
          </button>
        )}
      </div>

      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
          <div className="glass-card-strong rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-charcoal">Emergency Request</h2>
                <button onClick={() => setShowEmergencyModal(false)} className="text-muted hover:text-charcoal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <p className="text-sm text-muted">Request emergency stock directly from {mandi.name}. This will create an open request tagged to this location.</p>
            </div>
            <form onSubmit={handleEmergencyRequest} className="p-6">
              <label className="block text-sm font-semibold text-charcoal mb-2">
                What is needed?
              </label>
              <textarea
                required
                rows={4}
                className="w-full border border-border rounded-lg p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none mb-6"
                placeholder="e.g. Need 50kg rice and 20kg dal for flood relief camp in nearby village..."
                value={emergencyNeed}
                onChange={(e) => setEmergencyNeed(e.target.value)}
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 font-medium text-charcoal hover:bg-surface rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEmergency || !emergencyNeed.trim()}
                  className="px-4 py-2 bg-emergency text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submittingEmergency ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center shadow-sm">
          <svg className="mx-auto text-muted/50 mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <h2 className="text-lg font-bold text-charcoal mb-2">No produce currently at this location</h2>
          <p className="text-muted mb-6">
            There are no active listings assigned to {mandi.name} at this time.
          </p>
          <Link href="/listings" className="inline-block bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary-light transition-colors">
            Browse All Listings
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
