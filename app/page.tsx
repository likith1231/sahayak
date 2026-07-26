"use client";

import Link from "next/link";
import { useAuth } from "./context/AuthContext";
import CategoryBrowse from "./components/CategoryBrowse";

/* ───── Logged-out landing page ───── */
function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative SVG pattern - subtle on cream */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grain" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1" fill="#2D6A4F"/>
                <circle cx="10" cy="10" r="0.5" fill="#2D6A4F"/>
                <circle cx="50" cy="50" r="0.75" fill="#2D6A4F"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grain)"/>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"/>
              <span className="text-primary text-xs font-semibold tracking-wide">Farm-fresh. Direct. Trusted.</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal leading-tight mb-6">
              From Farm to Table,{" "}
              <span className="text-primary">Without the Middleman</span>
            </h1>
            <p className="text-lg text-muted mb-8 leading-relaxed max-w-xl">
              Sahayak connects farmers directly with consumers. Browse fresh produce,
              support local agriculture, and get help during emergencies — all in one platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/listings"
                className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-light transition-colors text-sm shadow-sm"
              >
                Browse Listings
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-charcoal font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors border border-border text-sm shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-3">How Sahayak Works</h2>
          <p className="text-muted max-w-lg mx-auto">
            A complete ecosystem connecting farmers, consumers, and NGOs for a better agricultural marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* For Farmers */}
          <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300 group">
            <div className="h-1 bg-gradient-to-r from-primary to-primary-light rounded-t-xl -mt-6 -mx-6 mb-5" />
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">For Farmers</h3>
            <p className="text-sm text-muted leading-relaxed">
              List your produce directly. Set your own prices with live mandi data suggestions. Reach consumers without middlemen.
            </p>
          </div>

          {/* For Consumers */}
          <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300 group">
            <div className="h-1 bg-gradient-to-r from-accent to-accent-light rounded-t-xl -mt-6 -mx-6 mb-5" />
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">For Consumers</h3>
            <p className="text-sm text-muted leading-relaxed">
              Browse by category. Add to cart, checkout securely, and pick up farm-fresh produce directly from the farmer.
            </p>
          </div>

          {/* For NGOs */}
          <div className="glass-card rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300 group">
            <div className="h-1 bg-gradient-to-r from-emergency to-error rounded-t-xl -mt-6 -mx-6 mb-5" />
            <div className="w-12 h-12 rounded-lg bg-emergency/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">For NGOs</h3>
            <p className="text-sm text-muted leading-relaxed">
              Respond to emergency food and supply requests. Claim and fulfill disaster-relief needs in real time.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="glass-card-strong border-y border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">100+</p>
              <p className="text-sm text-muted mt-1">Active Farmers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">5</p>
              <p className="text-sm text-muted mt-1">Categories</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">0%</p>
              <p className="text-sm text-muted mt-1">Commission</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted mt-1">Emergency Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 mb-8">
        <div className="glass-card-strong rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-charcoal mb-3">Ready to join the movement?</h2>
            <p className="text-muted max-w-md mx-auto mb-6">
              Whether you&apos;re a farmer looking to sell directly, or a consumer wanting fresh produce — Sahayak has you covered.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register" className="bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-light transition-colors text-sm shadow-sm">
                Create an Account
              </Link>
              <Link href="/login" className="bg-white text-charcoal font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors border border-border text-sm shadow-sm">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ───── Logged-in dashboard ───── */
function Dashboard({ user }: { user: { id: number; name: string; role: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-10">
      {/* Greeting with 3D accent */}
      <div className="relative">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal">
            Welcome back, <span className="text-primary">{user.name}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            {user.role === "FARMER"
              ? "Manage your listings and track orders."
              : user.role === "NGO"
              ? "View emergency requests and manage your profile."
              : user.role === "ADMIN"
              ? "Administer the platform."
              : "Browse fresh produce from local farmers."}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {user.role === "FARMER" && (
          <Link
            href="/listings"
            className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">Create Listing</h3>
                <p className="text-xs text-muted mt-0.5">List your produce for consumers</p>
              </div>
            </div>
          </Link>
        )}

        <Link
          href="/listings"
          className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">Browse Marketplace</h3>
              <p className="text-xs text-muted mt-0.5">View all available produce</p>
            </div>
          </div>
        </Link>

        <Link
          href="/emergency"
          className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-emergency/20 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emergency/10 flex items-center justify-center group-hover:bg-emergency/15 transition-colors shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">Emergency Requests</h3>
              <p className="text-xs text-muted mt-0.5">Raise or respond to urgent needs</p>
            </div>
          </div>
        </Link>

        {user.role === "CONSUMER" && (
          <Link
            href="/cart"
            className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-accent/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">My Cart</h3>
                <p className="text-xs text-muted mt-0.5">View items and checkout</p>
              </div>
            </div>
          </Link>
        )}

        {user.role === "NGO" && (
          <Link
            href="/ngo/register"
            className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">NGO Profile</h3>
                <p className="text-xs text-muted mt-0.5">Register or update your organization</p>
              </div>
            </div>
          </Link>
        )}

        {user.role === "ADMIN" && (
          <Link
            href="/admin/ngos"
            className="group glass-card rounded-xl p-6 hover:shadow-lg hover:border-charcoal/20 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-charcoal/10 flex items-center justify-center group-hover:bg-charcoal/15 transition-colors shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B2D42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-charcoal group-hover:text-primary transition-colors">Verify NGOs</h3>
                <p className="text-xs text-muted mt-0.5">Review pending verifications</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Category Browse */}
      <CategoryBrowse />
    </div>
  );
}

/* ───── Main page component ───── */
export default function Home() {
  const { user } = useAuth();

  if (user) {
    return <Dashboard user={user} />;
  }

  return <LandingPage />;
}
