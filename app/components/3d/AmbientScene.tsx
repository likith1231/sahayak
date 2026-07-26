"use client";

import { Canvas } from "@react-three/fiber";
import { FloatingParticles } from "./FloatingParticles";
import { GlassOrb, OrbitRing, AbstractLeaf } from "./Shapes";

/**
 * AmbientScene — the canvas wrapper used across the app.
 * Each variant provides a different mood while sharing the same
 * soft lighting and transparent background.
 *
 * Variants:
 *   hero       — Landing hero: larger orb + particles + ring (most prominent)
 *   dashboard  — Small accent scene for the logged-in welcome section
 *   browse     — Lightweight decorative element for listings/category pages
 *   detail     — Subtle single-element accent for listing detail pages
 *   cart       — Warm-toned subtle element for cart page
 *   success    — Order confirmation: success-tinted orb + celebratory particles
 *   emergency  — Ultra-restrained, serious tone: slow, muted, minimal
 */

type SceneVariant = "hero" | "dashboard" | "browse" | "detail" | "cart" | "success" | "emergency";

interface AmbientSceneProps {
  variant: SceneVariant;
  className?: string;
  style?: React.CSSProperties;
}

function SceneContent({ variant }: { variant: SceneVariant }) {
  switch (variant) {
    case "hero":
      return (
        <>
          <GlassOrb position={[1.8, 0.2, -1]} scale={1.2} color="#2D6A4F" rotationSpeed={0.12} />
          <GlassOrb position={[-2.2, -0.5, -2]} scale={0.6} color="#D4A373" rotationSpeed={0.08} />
          <OrbitRing radius={2.2} color="#D4A373" opacity={0.12} speed={0.15} tilt={[0.5, 0, 0.3]} position={[1.8, 0.2, -1]} />
          <OrbitRing radius={1.2} color="#2D6A4F" opacity={0.08} speed={0.1} tilt={[0.8, 0.3, 0]} position={[-1, 0.8, -1.5]} />
          <AbstractLeaf position={[2.8, 0.8, -0.5]} scale={0.35} color="#40916C" speed={0.15} />
          <AbstractLeaf position={[-1.5, -0.3, 0]} scale={0.2} color="#D4A373" speed={0.1} />
          <FloatingParticles count={50} color="#2D6A4F" opacity={0.12} speed={0.25} spread={8} size={0.03} />
        </>
      );

    case "dashboard":
      return (
        <>
          <GlassOrb position={[0, 0, 0]} scale={0.6} color="#2D6A4F" rotationSpeed={0.1} />
          <OrbitRing radius={1} color="#D4A373" opacity={0.1} speed={0.12} tilt={[0.5, 0, 0.2]} />
          <FloatingParticles count={20} color="#2D6A4F" opacity={0.08} speed={0.2} spread={4} size={0.025} />
        </>
      );

    case "browse":
      return (
        <>
          <OrbitRing radius={1.8} color="#2D6A4F" opacity={0.08} speed={0.08} tilt={[0.6, 0, 0.1]} />
          <FloatingParticles count={25} color="#40916C" opacity={0.06} speed={0.15} spread={6} size={0.02} />
          <AbstractLeaf position={[1.2, 0.3, -0.5]} scale={0.18} color="#40916C" speed={0.08} />
        </>
      );

    case "detail":
      return (
        <>
          <GlassOrb position={[0, 0, -0.5]} scale={0.5} color="#40916C" rotationSpeed={0.08} />
          <FloatingParticles count={15} color="#2D6A4F" opacity={0.06} speed={0.15} spread={3} size={0.02} />
        </>
      );

    case "cart":
      return (
        <>
          <GlassOrb position={[0, 0, 0]} scale={0.5} color="#D4A373" rotationSpeed={0.1} />
          <OrbitRing radius={0.9} color="#D4A373" opacity={0.1} speed={0.1} tilt={[0.4, 0, 0.2]} />
          <FloatingParticles count={18} color="#D4A373" opacity={0.07} speed={0.15} spread={3.5} size={0.02} />
        </>
      );

    case "success":
      return (
        <>
          <GlassOrb position={[0, 0, 0]} scale={0.7} color="#16A34A" rotationSpeed={0.12} />
          <OrbitRing radius={1.2} color="#16A34A" opacity={0.12} speed={0.18} tilt={[0.3, 0, 0.2]} />
          <OrbitRing radius={1.5} color="#D4A373" opacity={0.06} speed={0.1} tilt={[0.7, 0.2, 0.1]} />
          <FloatingParticles count={30} color="#16A34A" opacity={0.1} speed={0.3} spread={4} size={0.025} />
        </>
      );

    case "emergency":
      return (
        <>
          <OrbitRing radius={1.4} tube={0.005} color="#6B7280" opacity={0.06} speed={0.05} tilt={[0.3, 0, 0.1]} />
          <FloatingParticles count={12} color="#6B7280" opacity={0.04} speed={0.08} spread={4} size={0.015} />
        </>
      );

    default:
      return null;
  }
}

export default function AmbientScene({ variant, className = "", style }: AmbientSceneProps) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ ...style }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 5]} intensity={0.3} color="#FEFAE0" />
        <SceneContent variant={variant} />
      </Canvas>
    </div>
  );
}
