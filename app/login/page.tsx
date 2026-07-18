"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ 
          phone: phone || undefined, 
          email: email || undefined, 
          password 
        }),
      });
      login(data.access_token || data.token, data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "300px", gap: "1rem" }}>
        <div>
          <label>Phone:</label>
          <br />
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label>Email:</label>
          <br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <p style={{ fontSize: "0.8rem", margin: 0, color: "#666" }}>Provide either phone or email.</p>
        <div>
          <label>Password:</label>
          <br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
