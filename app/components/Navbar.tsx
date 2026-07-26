"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count for consumers
  useEffect(() => {
    if (user?.role === "CONSUMER") {
      apiFetch("/api/cart")
        .then((data) => {
          setCartCount(data.items?.length || 0);
        })
        .catch(() => setCartCount(0));
    }
  }, [user]);

  // Listen for custom cart-updated events
  useEffect(() => {
    const handler = () => {
      if (user?.role === "CONSUMER") {
        apiFetch("/api/cart")
          .then((data) => setCartCount(data.items?.length || 0))
          .catch(() => {});
      }
    };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [user]);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-charcoal tracking-tight">Sahayak</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/listings" className="text-muted hover:text-primary transition-colors">
            Listings
          </Link>
          <Link href="/mandis" className="text-muted hover:text-primary transition-colors">
            Mandis
          </Link>
          <Link href="/emergency" className="text-muted hover:text-primary transition-colors">
            Emergency
          </Link>
          {user?.role === "FARMER" && (
            <>
              <Link href="/farmer/listings" className="text-muted hover:text-primary transition-colors">
                My Listings
              </Link>
              <Link href="/farmer/orders" className="text-muted hover:text-primary transition-colors">
                Sales History
              </Link>
            </>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin/ngos" className="text-muted hover:text-primary transition-colors">
              Admin
            </Link>
          )}
        </div>

        {/* Auth section + Cart */}
        <div className="hidden md:flex items-center gap-3">
          {/* Cart icon for consumers */}
          {user?.role === "CONSUMER" && (
            <Link href="/cart" className="relative text-muted hover:text-primary transition-colors p-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-charcoal leading-tight">{user.name}</p>
                  <p className="text-xs text-muted leading-tight">{user.role}</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="ml-2 text-sm font-medium text-muted hover:text-error transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Mobile cart icon */}
          {user?.role === "CONSUMER" && (
            <Link href="/cart" className="relative text-muted hover:text-primary transition-colors p-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-muted hover:text-charcoal"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white/90 backdrop-blur-md px-4 py-4 space-y-3">
          <Link href="/listings" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
            Listings
          </Link>
          <Link href="/mandis" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
            Mandis
          </Link>
          <Link href="/emergency" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
            Emergency
          </Link>
          {user?.role === "FARMER" && (
            <>
              <Link href="/farmer/listings" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
                My Listings
              </Link>
              <Link href="/farmer/orders" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
                Sales History
              </Link>
            </>
          )}
          {user?.role === "NGO" && (
            <Link href="/ngo/register" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
              NGO Profile
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin/ngos" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-muted hover:text-primary">
              Admin
            </Link>
          )}
          <hr className="border-border" />
          {user ? (
            <div className="flex items-center justify-between">
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="text-sm text-charcoal font-medium hover:text-primary transition-colors">
                {user.name} <span className="text-muted">({user.role})</span>
              </Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="text-sm text-error font-medium">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-muted hover:text-primary">
                Login
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
