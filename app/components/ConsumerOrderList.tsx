"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { getCropImage } from "../lib/cropImages";

interface Order {
  id: string;
  consumerId: string;
  listingId: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  listing: {
    cropName: string;
    unit: string;
    farmer: {
      name: string;
      phone: string;
    };
  };
}

export default function ConsumerOrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/orders");
      setOrders(data.orders || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-error/10 border border-error/20 text-error rounded-lg p-4 mb-6">
        {error}
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-muted">Loading your orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <p className="text-muted mb-4">You haven't placed any orders yet.</p>
        <Link href="/listings" className="text-primary hover:text-primary-light font-medium">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div key={order.id} className="glass-card rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row gap-0 md:gap-6 relative transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 md:h-full md:w-1 bg-primary/40" />
          
          <div className="w-full md:w-48 h-32 md:h-auto shrink-0 relative bg-primary/5">
            {getCropImage(order.listing.cropName) ? (
              <img src={getCropImage(order.listing.cropName)!} alt={order.listing.cropName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/30 font-bold text-4xl">
                {order.listing.cropName.charAt(0)}
              </div>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-charcoal">{order.listing.cropName}</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  order.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                  order.status === 'PENDING' ? 'bg-accent/20 text-accent-dark' :
                  'bg-muted/10 text-muted'
                }`}>
                  {order.status}
                </span>
              </div>
              
              <div className="text-sm text-charcoal/80 space-y-1 mb-4">
                <p>Ordered on <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span></p>
                <p>Quantity: <span className="font-medium">{order.quantity} {order.listing.unit}</span></p>
                <p>Farmer: <span className="font-medium">{order.listing.farmer.name}</span></p>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted mb-0.5">Total Amount</p>
                <p className="font-bold text-primary text-xl">₹{order.totalPrice.toFixed(2)}</p>
              </div>
              {order.status === 'PENDING' && (
                <div className="text-xs text-muted flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Awaiting Pickup
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
