"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import TranslateWidget from "../components/TranslateWidget";

export default function EmergencyList() {
  const [requests, setRequests] = useState<any[]>([]);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [actionError, setActionError] = useState("");

  const loadRequests = () => {
    apiFetch("/api/emergency")
      .then((data) => setRequests(data.emergencyRequests || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleClaim = async (id: string) => {
    setActionError("");
    try {
      await apiFetch(`/api/emergency/${id}/claim`, { method: "PATCH" });
      setRequests(requests.map(r => r.id === id ? { ...r, status: "CLAIMED", claimedById: user?.id } : r));
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleFulfill = async (id: string) => {
    setActionError("");
    try {
      await apiFetch(`/api/emergency/${id}/fulfill`, { method: "PATCH" });
      setRequests(requests.map(r => r.id === id ? { ...r, status: "FULFILLED" } : r));
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Home
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal">Emergency Requests</h1>
          <p className="text-muted text-sm mt-1">Urgent needs from community members</p>
        </div>
        {user && (
          <Link
            href="/emergency/new"
            className="inline-flex items-center gap-2 bg-emergency text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-emergency/90 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Raise Request
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
      )}
      {actionError && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">Action Error: {actionError}</div>
      )}

      {requests.length === 0 && !error && (
        <div className="text-center py-12 glass-card rounded-xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-1">No open emergencies</h3>
          <p className="text-sm text-muted">All clear! No urgent requests at this time.</p>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="glass-card rounded-xl shadow-sm overflow-hidden transition-all duration-300">
            <div className="h-1.5 bg-gradient-to-r from-emergency to-emergency/60" />
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      r.status === "OPEN" ? "bg-emergency/10 text-emergency" :
                      r.status === "CLAIMED" ? "bg-accent/20 text-accent" :
                      "bg-success/10 text-success"
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">Need Type</span>
                    <TranslateWidget text={r.needType} />
                  </div>
                  
                  {r.targetMandi && (
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 bg-surface border border-border px-2.5 py-1 rounded-md text-xs font-medium text-charcoal">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        Requested from: {r.targetMandi.name}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-muted block">Location</span>
                      <span className="font-medium text-charcoal">{r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Requested by</span>
                      <span className="font-medium text-charcoal">{r.consumer?.name || "Anonymous"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Created</span>
                      <span className="font-medium text-charcoal">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {user?.role === "NGO" && (
                  <div className="shrink-0 flex gap-2">
                    {r.status === "OPEN" && (
                      <button
                        onClick={() => handleClaim(r.id)}
                        className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Claim
                      </button>
                    )}
                    {r.status === "CLAIMED" && r.claimedById === user.id && (
                      <button
                        onClick={() => handleFulfill(r.id)}
                        className="bg-success text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-success/90 transition-colors"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
