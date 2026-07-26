"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { getCropImage } from "../lib/cropImages";
import { useAuth } from "../context/AuthContext";

interface Listing {
  id: string;
  cropName: string;
  quantity: number;
  unit: string;
  price: number;
  harvestDate: string;
  location: string | null;
  category: string | null;
  status: string;
  createdAt: string;
}

export default function FarmerListingList() {
  const { user, login, token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  const [farmLocation, setFarmLocation] = useState((user as any)?.location || "");
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (user && (user as any).location) {
      setFarmLocation((user as any).location);
    }
  }, [user]);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      const data = await apiFetch("/api/listings/me");
      setListings(data.listings);
    } catch (err: any) {
      setError(err.message || "Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      const updatedUser = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ location: farmLocation }),
      });
      if (token && user) {
        login(token, { ...user, ...updatedUser });
      }
      alert("Farm location updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update location");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
      fetchMyListings();
    } catch (err: any) {
      alert(err.message || "Failed to delete listing");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;
    setUpdating(true);
    try {
      await apiFetch(`/api/listings/${editingListing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity: parseFloat(editQuantity),
          price: parseFloat(editPrice)
        })
      });
      setEditingListing(null);
      fetchMyListings();
    } catch (err: any) {
      alert(err.message || "Failed to update listing");
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setEditQuantity(listing.quantity.toString());
    setEditPrice(listing.price.toString());
  };

  return (
    <div>
      <div className="glass-card-strong rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-charcoal mb-2">Farm Location</h2>
        <p className="text-sm text-muted mb-4">Set your default farm location. This will be automatically applied to all your listings.</p>
        <form onSubmit={handleUpdateLocation} className="flex gap-4 max-w-lg">
          <input
            type="text"
            value={farmLocation}
            onChange={(e) => setFarmLocation(e.target.value)}
            placeholder="e.g. Kolar, Karnataka"
            className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            required
          />
          <button
            type="submit"
            disabled={savingLocation}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {savingLocation ? "Saving..." : "Save Location"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted">Loading your listings...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-border">
          <p className="text-muted mb-4">You have not posted any listings yet.</p>
          <Link href="/listings" className="text-primary hover:text-primary-light font-medium">
            Post your first listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {listings.map((l) => (
            <div key={l.id} className={`glass-card rounded-xl shadow-sm relative overflow-hidden group flex flex-col transition-all duration-300 ${l.status === 'REMOVED' ? 'opacity-50' : ''}`}>
              {/* Image Banner */}
              {getCropImage(l.cropName) ? (
                <div className="w-full h-32 relative bg-primary/10">
                  <img src={getCropImage(l.cropName)!} alt={l.cropName} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <h3 className="absolute bottom-2 left-4 font-bold text-lg text-white">{l.cropName}</h3>
                </div>
              ) : (
                <div className="relative h-12 bg-gradient-to-r from-primary-dark to-primary">
                  <h3 className="absolute bottom-2 left-4 font-bold text-lg text-white">{l.cropName}</h3>
                </div>
              )}
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/20 text-accent-dark">
                      {l.category || "Uncategorized"}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      l.status === 'AVAILABLE' ? 'bg-success/10 text-success' :
                      l.status === 'SOLD_OUT' ? 'bg-muted/10 text-muted' :
                      'bg-error/10 text-error'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary text-xl">₹{l.price}</div>
                    <div className="text-xs text-muted">per {l.unit}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-charcoal/80 mb-6 flex-1">
                  <div className="flex items-center gap-2">
                  <span className="text-muted">Quantity:</span>
                  <span className="font-medium">{l.quantity} {l.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Harvest Date:</span>
                  <span>{new Date(l.harvestDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">Location:</span>
                  <span>{l.location || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>Posted: {new Date(l.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {l.status !== 'REMOVED' && (
                <div className="flex gap-2 pt-4 border-t border-border">
                  <button
                    onClick={() => openEditModal(l)}
                    className="flex-1 px-4 py-2 text-sm font-medium border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-charcoal mb-4">Edit Listing</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Quantity ({editingListing.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Price (₹ per {editingListing.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="flex-1 px-4 py-2 border border-border text-charcoal rounded-lg hover:bg-gray-50"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
