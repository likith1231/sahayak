"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminNGOs() {
  const [ngos, setNgos] = useState<any[]>([]);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const [actionError, setActionError] = useState("");

  const loadNgos = () => {
    apiFetch("/api/admin/ngos/pending")
      .then((data) => setNgos(data.ngos || []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      loadNgos();
    }
  }, [user]);

  const handleVerify = async (id: string) => {
    setActionError("");
    try {
      await apiFetch(`/api/admin/ngos/${id}/verify`, { method: "PATCH" });
      loadNgos();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="max-w-lg mx-auto px-4 md:px-8 py-12 text-center">
        <div className="bg-white rounded-xl border border-border p-8">
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-sm text-muted mb-4">Only Administrators can access this page.</p>
          <Link href="/" className="text-primary text-sm font-medium hover:text-primary-light">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal">NGO Verification</h1>
        <p className="text-muted text-sm mt-1">Review and approve pending NGO registrations</p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
      )}
      {actionError && (
        <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">Action Error: {actionError}</div>
      )}

      {ngos.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-1">All caught up</h3>
          <p className="text-sm text-muted">No pending NGO verifications at this time.</p>
        </div>
      )}

      <div className="space-y-4">
        {ngos.map((n) => (
          <div key={n.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-accent to-accent-light" />
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-charcoal mb-2">{n.organizationName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted block">Contact Person</span>
                      <span className="font-medium text-charcoal">{n.user?.name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Contact Info</span>
                      <span className="font-medium text-charcoal">{n.user?.email || n.user?.phone}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted block">Document</span>
                      {n.documentUrl ? (
                        <a href={n.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">View Document</a>
                      ) : (
                        <span className="text-muted">None provided</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleVerify(n.id)}
                  className="bg-success text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-success/90 transition-colors shrink-0"
                >
                  ✓ Verify NGO
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
