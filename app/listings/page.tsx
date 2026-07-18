"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

export default function Listings() {
  const [listings, setListings] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/listings")
      .then((data) => setListings(data.listings || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>All Listings</h2>
      <Link href="/">Back to Home</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {listings.map((l) => (
          <li key={l.id} style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem 0" }}>
            <p><strong>{l.cropName}</strong></p>
            <p>{l.quantity} {l.unit} - ${l.price}/{l.unit}</p>
            <p>Farmer: {l.farmer?.name} ({l.farmer?.phone})</p>
            <Link href={`/listings/${l.id}`}>View Details</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
