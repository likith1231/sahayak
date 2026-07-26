"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

export default function NewEmergency() {
  const { user } = useAuth();
  const router = useRouter();

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [needType, setNeedType] = useState("");
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 md:px-8 py-12 text-center">
        <div className="glass-card-strong rounded-xl p-8">
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-sm text-muted mb-4">Please log in to raise an emergency request.</p>
          <Link href="/" className="text-primary text-sm font-medium hover:text-primary-light">Back to Home</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/emergency", {
        method: "POST",
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          needType
        })
      });
      router.push("/emergency");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 md:px-8 py-8">
      <Link href="/emergency" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Emergency List
      </Link>

      <div className="glass-card-strong rounded-xl shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emergency to-emergency/60" />
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-charcoal mb-1">Raise Emergency Request</h1>
          <p className="text-sm text-muted mb-6">Request urgent supplies — food, water, medical, or other needs.</p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Latitude</label>
                <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 12.9716" required />
              </div>
              <div>
                <label>Longitude</label>
                <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 77.5946" required />
              </div>
            </div>
            <div>
              <label>Need Type</label>
              <input type="text" value={needType} onChange={(e) => setNeedType(e.target.value)} placeholder="e.g. food, water, medical" required />
            </div>
            <button
              type="submit"
              className="w-full bg-emergency text-white py-3 rounded-lg font-semibold hover:bg-emergency/90 transition-colors"
            >
              Submit Emergency Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
