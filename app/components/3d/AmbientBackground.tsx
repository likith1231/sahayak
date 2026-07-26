"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

/**
 * AmbientBackground — persistent full-viewport 3D background layer.
 *
 * Rendered once in the root layout. Uses `usePathname()` to detect
 * the current route and automatically adjusts intensity, color, and
 * particle density. Emergency routes get muted gray tones.
 *
 * Lazy-loaded via next/dynamic with ssr:false so Three.js never
 * blocks initial page render or SSR.
 */
const AmbientCanvas = dynamic(() => import("./AmbientCanvas"), {
  ssr: false,
  loading: () => null,
});

export default function AmbientBackground() {
  const pathname = usePathname();

  // Determine mood based on current route
  const isEmergency = pathname.startsWith("/emergency");
  const isHero = pathname === "/" || pathname === "";
  const isDense =
    pathname.startsWith("/listings") ||
    pathname.startsWith("/farmer") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/orders");

  // Compute intensity: hero = high, dense pages = low, default = medium
  let intensity: "high" | "medium" | "low" | "minimal" = "medium";
  if (isEmergency) intensity = "minimal";
  else if (isHero) intensity = "high";
  else if (isDense) intensity = "low";

  // Compute color mood
  const mood: "green" | "muted" = isEmergency ? "muted" : "green";

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <AmbientCanvas intensity={intensity} mood={mood} />
    </div>
  );
}
