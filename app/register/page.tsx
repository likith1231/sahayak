"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CONSUMER");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        name,
        phone,
        email: email || undefined,
        password,
        role
      };
      
      console.log("Sending registration payload to backend:", payload);

      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Assuming register returns the same structure as login
      login(data.access_token || data.token, data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "300px", gap: "1rem" }}>
        <div>
          <label>Name:</label>
          <br />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Phone:</label>
          <br />
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label>Email (optional):</label>
          <br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Role:</label>
          <br />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="FARMER">Farmer</option>
            <option value="CONSUMER">Consumer</option>
            <option value="NGO">NGO</option>
          </select>
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}
