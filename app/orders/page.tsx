"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ConsumerOrderList from "../components/ConsumerOrderList";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="p-8 text-center text-muted">Loading...</div>;
  }

  if (!user || user.role !== "CONSUMER") {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4">
          Access denied. Please log in as a consumer to view your orders.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 relative">
      
      <div className="flex items-center gap-2 mb-8">
        <Link href="/" className="text-muted hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-3xl font-bold text-charcoal tracking-tight">My Orders</h1>
      </div>

      <ConsumerOrderList />
    </div>
  );
}
