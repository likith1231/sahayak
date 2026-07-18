"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

export default function NewListing() {
  const { user } = useAuth();
  const router = useRouter();

  const [cropName, setCropName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState<string | null>(null);

  const checkPrice = async () => {
    if (!cropName) return;
    try {
      const data = await apiFetch(`/api/listings/price-suggestion?cropName=${encodeURIComponent(cropName)}`);
      if (data.suggestedPrice) {
        setSuggestedPrice(`Suggested price: ₹${data.suggestedPrice.toFixed(2)}/${unit || 'unit'} (based on ${data.basedOnListings} listings)`);
      } else {
        setSuggestedPrice("No price history available for this crop.");
      }
    } catch (err: any) {
      console.error(err);
      setSuggestedPrice("Error fetching suggestion.");
    }
  };

  if (!user || user.role !== "FARMER") {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Access Denied</h2>
        <p>Only farmers can create listings.</p>
        <Link href="/">Back to Home</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          cropName,
          quantity: parseFloat(quantity),
          unit,
          price: parseFloat(price),
          harvestDate: new Date(harvestDate).toISOString(),
          photoUrl: photoUrl || undefined
        })
      });
      router.push("/listings");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create New Listing</h2>
      <Link href="/listings">Back to Listings</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "300px", gap: "1rem" }}>
        <div>
          <label>Crop Name:</label><br />
          <input type="text" value={cropName} onChange={(e) => setCropName(e.target.value)} onBlur={checkPrice} required />
          {suggestedPrice && <p style={{ fontSize: "0.9em", color: "gray", margin: "0.2rem 0" }}>{suggestedPrice}</p>}
        </div>
        <div>
          <label>Quantity:</label><br />
          <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div>
          <label>Unit:</label><br />
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </div>
        <div>
          <label>Price:</label><br />
          <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div>
          <label>Harvest Date:</label><br />
          <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} required />
        </div>
        <div>
          <label>Photo URL (optional):</label><br />
          <input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
        </div>
        <button type="submit">Create Listing</button>
      </form>
    </div>
  );
}
