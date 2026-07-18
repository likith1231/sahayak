"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

export default function NewEmergency() {
  const { user } = useAuth();
  const router = useRouter();

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [needType, setNeedType] = useState("");
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Access Denied</h2>
        <p>Please log in to raise an emergency request.</p>
        <Link href="/">Back to Home</Link>
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
    <div style={{ padding: "2rem" }}>
      <h2>Raise Emergency Request</h2>
      <Link href="/emergency">Back to Emergency List</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "300px", gap: "1rem" }}>
        <div>
          <label>Latitude:</label><br />
          <input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
        </div>
        <div>
          <label>Longitude:</label><br />
          <input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
        </div>
        <div>
          <label>Need Type (e.g. food, water):</label><br />
          <input type="text" value={needType} onChange={(e) => setNeedType(e.target.value)} required />
        </div>
        <button type="submit">Submit Request</button>
      </form>
    </div>
  );
}
