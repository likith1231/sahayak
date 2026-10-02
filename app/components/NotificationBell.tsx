"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/orders";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** Navbar bell showing order/tracking updates. Polls every minute. */
export default function NotificationBell({ role }: { role: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch("/api/notifications")
      .then((data) => setItems(data.notifications || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    window.addEventListener("notifications-updated", load);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", load);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = items.filter((n) => !n.isRead).length;
  // Server dates are naive UTC
  const toIso = (s: string) => (s.endsWith("Z") ? s : s + "Z");

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    apiFetch("/api/notifications/read-all", { method: "PATCH" }).catch(() => {});
  };

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  const ordersHref = role === "FARMER" ? "/farmer/orders" : role === "CONSUMER" ? "/orders" : "/profile";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative !p-2 bg-transparent text-muted hover:text-primary"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-emergency text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] glass-card-strong rounded-xl shadow-lg border border-border overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-charcoal">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="!p-0 bg-transparent text-xs text-primary hover:text-primary-light">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">You&apos;re all caught up.</p>
            ) : (
              items.slice(0, 15).map((n) => (
                <Link
                  key={n.id}
                  href={ordersHref}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className={`block px-4 py-3 border-b border-border last:border-0 hover:bg-primary/5 ${n.isRead ? "" : "bg-primary/[0.04]"}`}
                >
                  <div className="flex gap-2">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className={n.isRead ? "pl-4" : ""}>
                      <p className={`text-xs leading-relaxed ${n.isRead ? "text-muted" : "text-charcoal font-medium"}`}>{n.message}</p>
                      <p className="text-[10px] text-muted mt-1">{formatDateTime(toIso(n.createdAt))}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
