"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Address } from "../lib/orders";
import AddressForm from "./AddressForm";

/** Saved delivery addresses, managed from the profile page. */
export default function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch("/api/addresses");
      setAddresses(data.addresses || []);
    } catch (err: any) {
      setError(err.message || "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await apiFetch(`/api/addresses/${id}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      setError(err.message || "Failed to delete address");
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await apiFetch(`/api/addresses/${id}`, { method: "PUT", body: JSON.stringify({ isDefault: true }) });
      load();
    } catch (err: any) {
      setError(err.message || "Failed to update address");
    }
  };

  if (loading) return <div className="text-center py-12 text-muted">Loading addresses...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="bg-error/10 border border-error/20 text-error rounded-lg px-4 py-3 text-sm">{error}</div>}

      {editing ? (
        <div className="glass-card-strong rounded-xl p-6">
          <h3 className="font-bold text-charcoal mb-4">{editing === "new" ? "Add a new address" : "Edit address"}</h3>
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <button onClick={() => setEditing("new")} className="w-full border-2 border-dashed border-border bg-white/50 text-primary hover:border-primary/40 hover:bg-white/80 !py-4">
          + Add a new address
        </button>
      )}

      {addresses.length === 0 && !editing && (
        <p className="text-sm text-muted text-center py-6">No saved addresses yet. Add one to check out faster with home delivery.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((a) => (
          <div key={a.id} className={`glass-card rounded-xl p-5 border ${a.isDefault ? "border-primary/40" : "border-transparent"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{a.label}</span>
              {a.isDefault && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/20 text-[#8B5E34]">Default</span>}
            </div>
            <p className="text-sm font-semibold text-charcoal">{a.name} · {a.phone}</p>
            <p className="text-sm text-muted mt-1">
              {[a.line1, a.line2, a.landmark && `Near ${a.landmark}`].filter(Boolean).join(", ")}
              <br />
              {a.city} – {a.pincode}
            </p>
            <div className="flex gap-4 mt-3 text-xs font-semibold">
              <button onClick={() => setEditing(a)} className="!p-0 bg-transparent text-primary hover:text-primary-light">Edit</button>
              {!a.isDefault && (
                <button onClick={() => makeDefault(a.id)} className="!p-0 bg-transparent text-primary hover:text-primary-light">Set as default</button>
              )}
              <button onClick={() => remove(a.id)} className="!p-0 bg-transparent text-error hover:opacity-80">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
