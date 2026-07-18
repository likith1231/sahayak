"use client";

import Link from "next/link";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Sahayak</h1>
      
      <div style={{ marginBottom: "2rem" }}>
        <h3>Navigation</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link href="/listings">View All Listings</Link></li>
          {user?.role === "FARMER" && (
            <li><Link href="/listings/new">Create New Listing</Link></li>
          )}
          <li><Link href="/emergency">View Emergency Requests</Link></li>
          {user && (
            <li><Link href="/emergency/new">Raise Emergency Request</Link></li>
          )}
          {user?.role === "NGO" && (
            <li><Link href="/ngo/register">Register NGO Profile</Link></li>
          )}
          {user?.role === "ADMIN" && (
            <li><Link href="/admin/ngos">Verify Pending NGOs</Link></li>
          )}
          {user && (
            <li><Link href="/agent">Chat with AI Agent</Link></li>
          )}
        </ul>
      </div>

      <hr />

      {user ? (
        <div style={{ marginTop: "2rem" }}>
          <p>Welcome, {user.name} ({user.role})</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <p>Welcome to Sahayak. Please log in or register.</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li><Link href="/login">Login</Link></li>
            <li><Link href="/register">Register</Link></li>
          </ul>
        </div>
      )}
    </main>
  );
}
