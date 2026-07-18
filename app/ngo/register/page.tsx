"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

export default function NGORegister() {
  const { user } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [error, setError] = useState("");

  if (!user || user.role !== "NGO") {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Access Denied</h2>
        <p>Only NGOs can access this page.</p>
        <Link href="/">Back to Home</Link>
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
    <div style={{ padding: "2rem" }}>
      <h2>NGO Registration</h2>
      <Link href="/">Back to Home</Link>
      <hr />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "300px", gap: "1rem" }}>
        <div>
          <label>Organization Name:</label><br />
          <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
        </div>
        <div>
          <label>Document URL (optional):</label><br />
          <input type="text" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} />
        </div>
        <button type="submit">Register NGO Profile</button>
      </form>
    </div>
  );
}
