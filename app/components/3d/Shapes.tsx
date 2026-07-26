"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GlassOrb — a refined, softly glowing translucent sphere with gentle rotation.
 * Used as a subtle accent on pages. Muted tones from the palette.
 */
interface GlassOrbProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  rotationSpeed?: number;
  opacity?: number;
}

export function GlassOrb({
  position = [0, 0, 0],
  scale = 1,
  color = "#2D6A4F",
  rotationSpeed = 0.15,
  opacity = 0.12,
}: GlassOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * rotationSpeed * 0.3;
    meshRef.current.rotation.y = t * rotationSpeed;
    // Gentle float
    meshRef.current.position.y = position[1] + Math.sin(t * 0.4) * 0.08;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <icosahedronGeometry args={[1, 1]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.1}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * OrbitRing — a thin torus that slowly rotates, like a planetary ring.
 * Adds depth and movement without drawing focus.
 */
interface OrbitRingProps {
  radius?: number;
  tube?: number;
  color?: string;
  opacity?: number;
  speed?: number;
  tilt?: [number, number, number];
  position?: [number, number, number];
}

export function OrbitRing({
  radius = 2,
  tube = 0.008,
  color = "#D4A373",
  opacity = 0.2,
  speed = 0.2,
  tilt = [0.4, 0, 0.2],
  position = [0, 0, 0],
}: OrbitRingProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = tilt[0] + t * speed * 0.1;
    meshRef.current.rotation.y = tilt[1] + t * speed;
    meshRef.current.rotation.z = tilt[2];
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[radius, tube, 16, 64]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}

/**
 * AbstractLeaf — a low-poly organic shape suggesting a leaf or petal.
 * Uses a flattened dodecahedron with gentle rotation.
 */
interface AbstractLeafProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}

export function AbstractLeaf({
  position = [1.5, 0.5, -0.5],
  scale = 0.3,
  color = "#40916C",
  speed = 0.2,
}: AbstractLeafProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * speed;
    meshRef.current.rotation.z = Math.sin(t * 0.3) * 0.1;
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.06;
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale * 0.3, scale * 0.8]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.15}
        roughness={0.3}
        metalness={0.05}
        clearcoat={0.5}
      />
    </mesh>
  );
}
