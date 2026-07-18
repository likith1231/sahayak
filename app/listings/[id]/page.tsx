"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import TranslateWidget from "../../components/TranslateWidget";

export default function ListingDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/listings/${id}`)
      .then((data) => setListing(data.listing || data))
      .catch((err) => setError(err.message));
  }, [id]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError("");
    setOrderSuccess("");
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          listingId: id,
          quantity: parseFloat(orderQuantity)
        })
      });
      setOrderSuccess("Order placed successfully!");
      setOrderQuantity("");
    } catch (err: any) {
      setOrderError(err.message);
    }
  };

  if (error) return <p style={{ color: "red", padding: "2rem" }}>{error}</p>;
  if (!listing) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Listing</h2>
      <Link href="/listings">Back to Listings</Link>
      <hr />
      <div>
        <strong>Crop Name:</strong>
        <TranslateWidget text={listing.cropName} />
      </div>
      <p><strong>Quantity:</strong> {listing.quantity} {listing.unit}</p>
      <p><strong>Price:</strong> ${listing.price}/{listing.unit}</p>
      <p><strong>Harvest Date:</strong> {new Date(listing.harvestDate).toLocaleDateString()}</p>
      <p><strong>Farmer:</strong> {listing.farmer?.name}</p>
      
      {user?.role === "CONSUMER" && (
        <div style={{ marginTop: "2rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
          <h3>Place an Order</h3>
          {orderError && <p style={{ color: "red" }}>{orderError}</p>}
          {orderSuccess && <p style={{ color: "green" }}>{orderSuccess}</p>}
          <form onSubmit={handleOrder}>
            <div>
              <label>Quantity to Order:</label>
              <br />
              <input type="number" step="0.01" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} required />
            </div>
            <br />
            <button type="submit">Place Order</button>
          </form>
        </div>
      )}
    </div>
  );
}
