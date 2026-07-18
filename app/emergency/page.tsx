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
    <div style={{ padding: "2rem" }}>
      <h2>Emergency Requests</h2>
      <Link href="/">Back to Home</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      {actionError && <p style={{ color: "red" }}>Action Error: {actionError}</p>}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {requests.map((r) => (
          <li key={r.id} style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem 0" }}>
            <div>
              <strong>Need:</strong>
              <TranslateWidget text={r.needType} />
            </div>
            <p><strong>Location:</strong> Lat {r.latitude}, Lng {r.longitude}</p>
            <p><strong>Status:</strong> {r.status}</p>
            <p><strong>Created:</strong> {new Date(r.createdAt).toLocaleString()}</p>
            <p><strong>Consumer:</strong> {r.consumer?.name}</p>
            
            {user?.role === "NGO" && (
              <div style={{ marginTop: "1rem" }}>
                {r.status === "OPEN" && (
                  <button onClick={() => handleClaim(r.id)}>Claim</button>
                )}
                {r.status === "CLAIMED" && r.claimedById === user.id && (
                  <button onClick={() => handleFulfill(r.id)}>Fulfill</button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
