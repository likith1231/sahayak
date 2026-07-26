"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FloatingParticles } from "./FloatingParticles";
import { GlassOrb, OrbitRing, AbstractLeaf } from "./Shapes";

/**
 * AmbientCanvas — the actual Three.js canvas for the persistent background.
 *
 * This is dynamically imported by AmbientBackground (ssr: false).
 * Renders a highly refined, deliberately minimal 3D scene with just a 
 * couple elements placed to avoid visual noise.
 */

interface AmbientCanvasProps {
  intensity: "high" | "medium" | "low" | "minimal";
  mood: "green" | "muted";
}

// Configuration per intensity level - deliberately scaled down
const CONFIG = {
  high: {
    particles: 10,
    particleSpeed: 0.05,
    particleOpacity: 0.12,
    particleSpread: 12,
    orbScale: 1.1,
    orbOpacity: 0.08,
    canvasOpacity: 1,
  },
  medium: {
    particles: 6,
    particleSpeed: 0.03,
    particleOpacity: 0.08,
    particleSpread: 12,
    orbScale: 0.9,
    orbOpacity: 0.06,
    canvasOpacity: 0.85,
  },
  low: {
    particles: 3,
    particleSpeed: 0.02,
    particleOpacity: 0.05,
    particleSpread: 12,
    orbScale: 0.7,
    orbOpacity: 0.04,
    canvasOpacity: 0.65,
  },
  minimal: {
    particles: 0,
    particleSpeed: 0.01,
    particleOpacity: 0,
    particleSpread: 12,
    orbScale: 0.5,
    orbOpacity: 0.02,
    canvasOpacity: 0.45,
  },
};

// Color palettes per mood
const COLORS = {
  green: {
    orb1: "#2D6A4F",
    particles: "#2D6A4F",
    light: "#FEFAE0",
    glowOuter: "#1B4332",
  },
  muted: {
    orb1: "#6B7280",
    particles: "#6B7280",
    light: "#E5E7EB",
    glowOuter: "#4B5563",
  },
};

/**
 * SoftGlow — a large, slowly pulsing sphere that provides ambient depth in a corner.
 */
function SoftGlow({ color, position, baseScale = 2, pulseSpeed = 0.3 }: {
  color: string;
  position: [number, number, number];
  baseScale?: number;
  pulseSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const s = baseScale + Math.sin(t * pulseSpeed) * 0.1; // Very subtle pulse
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.03} />
    </mesh>
  );
}

export default function AmbientCanvas({ intensity, mood }: AmbientCanvasProps) {
  const cfg = CONFIG[intensity];
  const clr = COLORS[mood];

  return (
    <div style={{ width: "100%", height: "100%", opacity: cfg.canvasOpacity }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 3, 5]} intensity={0.2} color={clr.light} />

        {/* 1. Large soft glow in the bottom-left corner */}
        <SoftGlow color={clr.glowOuter} position={[-4, -3, -4]} baseScale={4.5} pulseSpeed={0.05} />

        {/* 2. One subtle drifting shape in the top-right corner */}
        <GlassOrb
          position={[3.5, 2.0, -3]}
          scale={cfg.orbScale}
          color={clr.orb1}
          rotationSpeed={0.03}
          opacity={cfg.orbOpacity}
        />

        {/* 3. Extremely sparse floating particles (barely noticeable) */}
        {cfg.particles > 0 && (
          <FloatingParticles
            count={cfg.particles}
            color={clr.particles}
            opacity={cfg.particleOpacity}
            speed={cfg.particleSpeed}
            spread={cfg.particleSpread}
            size={0.03}
          />
        )}
      </Canvas>
    </div>
  );
}
