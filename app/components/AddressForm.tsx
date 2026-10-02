"use client";

import React, { useState } from "react";
import { apiFetch } from "../lib/api";
import { Address } from "../lib/orders";

interface AddressFormProps {
  initial?: Partial<Address>;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const LABELS = ["Home", "Work", "Other"];

export default function AddressForm({ initial, onSaved, onCancel, submitLabel = "Save address" }: AddressFormProps) {
  const [form, setForm] = useState({
    label: initial?.label || "Home",
    name: initial?.name || "",
    phone: initial?.phone || "",
    line1: initial?.line1 || "",
    line2: initial?.line2 || "",
    landmark: initial?.landmark || "",
    city: initial?.city || "",
    pincode: initial?.pincode || "",
    isDefault: initial?.isDefault ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = initial?.id
        ? await apiFetch(`/api/addresses/${initial.id}`, { method: "PUT", body: JSON.stringify(form) })
        : await apiFetch("/api/addresses", { method: "POST", body: JSON.stringify(form) });
      onSaved(data.address);
    } catch (err: any) {
      setError(err.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg px-4 py-2">{error}</div>}

      <div className="flex gap-2">
        {LABELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setForm((f) => ({ ...f, label: l }))}
            className={`!px-3 !py-1 text-xs rounded-full border transition-colors ${form.label === l ? "bg-primary text-white border-primary" : "bg-white text-muted border-border hover:border-primary/40"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="addr-name">Full name</label>
          <input id="addr-name" type="text" value={form.name} onChange={set("name")} required />
        </div>
        <div>
          <label htmlFor="addr-phone">Phone</label>
          <input id="addr-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="10-digit mobile" required />
        </div>
      </div>
      <div>
        <label htmlFor="addr-line1">House / flat, street</label>
        <input id="addr-line1" type="text" value={form.line1} onChange={set("line1")} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="addr-line2">Area / locality <span className="text-muted font-normal">(optional)</span></label>
          <input id="addr-line2" type="text" value={form.line2 || ""} onChange={set("line2")} />
        </div>
        <div>
          <label htmlFor="addr-landmark">Landmark <span className="text-muted font-normal">(optional)</span></label>
          <input id="addr-landmark" type="text" value={form.landmark || ""} onChange={set("landmark")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="addr-city">City</label>
          <input id="addr-city" type="text" value={form.city} onChange={set("city")} required />
        </div>
        <div>
          <label htmlFor="addr-pincode">Pincode</label>
          <input id="addr-pincode" type="text" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set("pincode")} required />
        </div>
      </div>
      <label className="!flex items-center gap-2 !font-normal text-sm cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={set("isDefault")} className="accent-primary" />
        Make this my default address
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="bg-primary text-white hover:bg-primary-light">
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="bg-white text-muted border border-border hover:text-charcoal">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
