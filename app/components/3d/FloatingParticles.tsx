"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FloatingParticlesProps {
  count?: number;
  color?: string;
  opacity?: number;
  speed?: number;
  spread?: number;
  size?: number;
}

export function FloatingParticles({
  count = 40,
  color = "#2D6A4F",
  opacity = 0.15,
  speed = 0.3,
  spread = 6,
  size = 0.04,
}: FloatingParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  const particles = useMemo(() => {
    const temp: { position: THREE.Vector3; velocity: THREE.Vector3; phase: number }[] = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread * 0.6,
          (Math.random() - 0.5) * 2
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.002 * speed,
          (Math.random() - 0.5) * 0.002 * speed,
          (Math.random() - 0.5) * 0.001 * speed
        ),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count, spread, speed]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      p.position.add(p.velocity);
      // Gentle sine drift
      const drift = Math.sin(t * 0.5 + p.phase) * 0.003;
      p.position.y += drift;
      // Wrap around boundaries
      if (Math.abs(p.position.x) > spread / 2) p.velocity.x *= -1;
      if (Math.abs(p.position.y) > (spread * 0.6) / 2) p.velocity.y *= -1;
      if (Math.abs(p.position.z) > 1) p.velocity.z *= -1;

      dummy.position.copy(p.position);
      const scale = 0.5 + Math.sin(t * 0.8 + p.phase) * 0.3;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[size, 8, 6]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </instancedMesh>
  );
}
