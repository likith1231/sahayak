"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

export default function NGORegister() {
  const { user } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [error, setError] = useState("");

  if (!user || user.role !== "NGO") {
    return (
      <div className="max-w-lg mx-auto px-4 md:px-8 py-12 text-center">
        <div className="bg-white rounded-xl border border-border p-8">
          <h2 className="text-xl font-bold text-charcoal mb-2">Access Denied</h2>
          <p className="text-sm text-muted mb-4">Only NGOs can access this page.</p>
          <Link href="/" className="text-primary text-sm font-medium hover:text-primary-light">Back to Home</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/ngo/register", {
        method: "POST",
        body: JSON.stringify({
          organizationName,
          documentUrl: documentUrl || undefined
        })
      });
      alert("NGO Registered! Wait for admin verification.");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 md:px-8 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Home
      </Link>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-accent" />
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-charcoal mb-1">NGO Registration</h1>
          <p className="text-sm text-muted mb-6">Register your organization to claim and fulfill emergency requests.</p>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label>Organization Name</label>
              <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="e.g. Helping Hands Foundation" required />
            </div>
            <div>
              <label>Document URL <span className="text-muted font-normal">(optional)</span></label>
              <input type="text" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-light transition-colors"
            >
              Register NGO Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
