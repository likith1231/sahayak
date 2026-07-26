"use client";

import Link from "next/link";
import { CATEGORY_STYLES, CATEGORY_NAMES } from "../lib/categoryStyles";

/**
 * SVG icons per category — small, stylized, consistent.
 */
function CategoryIcon({ icon, className = "" }: { icon: string; className?: string }) {
  const props = {
    width: 32,
    height: 32,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (icon) {
    case "leaf":
      return (
        <svg {...props}>
          <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.5 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );
    case "apple":
      return (
        <svg {...props}>
          <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
          <path d="M10 2c1 .5 2 2 2 5" />
        </svg>
      );
    case "wheat":
      return (
        <svg {...props}>
          <path d="M2 22 16 8" />
          <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
          <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
          <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
          <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function CategoryBrowse() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-charcoal">Browse by Category</h2>
          <p className="text-sm text-muted mt-1">Explore fresh produce from local farmers</p>
        </div>
        <Link
          href="/listings"
          className="text-sm font-medium text-primary hover:text-primary-light transition-colors hidden sm:inline-flex items-center gap-1"
        >
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATEGORY_NAMES.map((name) => {
          const style = CATEGORY_STYLES[name];
          return (
            <Link
              key={name}
              href={`/listings?category=${encodeURIComponent(name)}`}
              className="group relative rounded-xl overflow-hidden aspect-[4/5] block"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} transition-all duration-500 group-hover:scale-105`} />

              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`cat-dots-${name}`} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="12" cy="12" r="1" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#cat-dots-${name})`} />
                </svg>
              </div>

              {/* Glass highlight at top */}
              <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                {/* Icon container */}
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300 shadow-lg border border-white/10">
                  <CategoryIcon icon={style.icon} className="text-white" />
                </div>

                <h3 className="font-bold text-lg leading-tight text-center drop-shadow-md text-white">
                  {name}
                </h3>
                <p className="text-white text-xs mt-1 text-center font-medium drop-shadow-sm">
                  {style.description}
                </p>
              </div>

              {/* Bottom vignette */}
              <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/20 to-transparent" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
