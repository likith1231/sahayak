"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMandis } from "../lib/api";
import { toast } from "react-hot-toast";

interface DistributionCenter {
  id: string;
  name: string;
  district: string;
  address: string;
}

export default function MandisPage() {
  const [mandis, setMandis] = useState<DistributionCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMandis()
      .then((data) => {
        setMandis(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load distribution centers");
      })
      .finally(() => setLoading(false));
  }, []);

  // Group by district
  const groupedMandis = mandis.reduce((acc, mandi) => {
    if (!acc[mandi.district]) acc[mandi.district] = [];
    acc[mandi.district].push(mandi);
    return acc;
  }, {} as Record<string, DistributionCenter[]>);

  const districts = Object.keys(groupedMandis).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal tracking-tight mb-2">
          Distribution Centers & Mandis
        </h1>
        <p className="text-muted">
          Browse all our verified distribution centers across Karnataka where farmers drop off their produce and consumers can pick up their orders.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {districts.map((district) => (
            <div key={district}>
              <h2 className="text-xl font-bold text-charcoal mb-4 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {district}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedMandis[district].map((mandi) => (
                  <Link href={`/mandis/${mandi.id}`} key={mandi.id} className="block group">
                    <div className="glass-card rounded-xl shadow-sm overflow-hidden flex flex-col h-full group-hover:border-primary/50 group-hover:shadow-md transition-all duration-300">
                      <div className="h-1.5 bg-gradient-to-r from-primary to-primary-light w-full"></div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-base font-bold text-charcoal group-hover:text-primary transition-colors">{mandi.name}</h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent-dark px-2 py-0.5 rounded-full shrink-0">
                            Verified
                          </span>
                        </div>
                        <p className="text-sm text-muted mt-auto line-clamp-3" title={mandi.address}>
                          {mandi.address}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {districts.length === 0 && (
            <div className="text-center py-12 text-muted">
              No distribution centers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
