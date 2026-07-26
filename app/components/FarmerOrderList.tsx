"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

interface Order {
  id: string;
  consumerId: string;
  listingId: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  consumer: {
    name: string;
    phone: string;
  } | null;
  listing: {
    cropName: string;
    unit: string;
    price: number;
  };
}

export default function FarmerOrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await apiFetch("/api/orders/farmer");
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message || "Failed to load sales history");
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
    return <div className="text-center py-12 text-muted">Loading your sales history...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-border">
        <p className="text-muted mb-4">You have not made any sales yet.</p>
        <Link href="/farmer/listings" className="text-primary hover:text-primary-light font-medium">
          Manage your listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="glass-card rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-charcoal">{order.listing.cropName}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                order.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                order.status === 'PENDING' ? 'bg-accent/20 text-accent-dark' :
                'bg-muted/10 text-muted'
              }`}>
                {order.status}
              </span>
            </div>
            <div className="text-sm text-charcoal/80 mb-2">
              <span className="font-medium">{order.quantity} {order.listing.unit}</span> @ ₹{order.listing.price}/{order.listing.unit}
            </div>
            <div className="text-xs text-muted">
              Ordered on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
            </div>
          </div>

          <div className="md:text-right">
            <div className="text-sm text-muted mb-1">Total Sale</div>
            <div className="font-bold text-primary text-xl mb-3">₹{order.totalPrice.toFixed(2)}</div>
            
            {order.consumer ? (
              <div className="text-sm text-charcoal/80">
                <div>Buyer: <span className="font-medium">{order.consumer.name}</span></div>
                <div>Phone: <span className="font-medium">{order.consumer.phone}</span></div>
              </div>
            ) : (
              <div className="text-sm text-charcoal/80">
                Buyer details unavailable
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
