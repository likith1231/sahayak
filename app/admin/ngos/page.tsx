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
      <div style={{ padding: "2rem" }}>
        <h2>Access Denied</h2>
        <p>Only Administrators can access this page.</p>
        <Link href="/">Back to Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Pending NGO Verifications</h2>
      <Link href="/">Back to Home</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      {actionError && <p style={{ color: "red" }}>Action Error: {actionError}</p>}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {ngos.length === 0 && <p>No pending NGOs to verify.</p>}
        {ngos.map((n) => (
          <li key={n.id} style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem 0" }}>
            <p><strong>Organization Name:</strong> {n.organizationName}</p>
            <p><strong>Document URL:</strong> {n.documentUrl || "None"}</p>
            <p><strong>User:</strong> {n.user?.name} ({n.user?.email || n.user?.phone})</p>
            <p><strong>Created:</strong> {new Date(n.createdAt).toLocaleString()}</p>
            <button onClick={() => handleVerify(n.id)}>Verify</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
