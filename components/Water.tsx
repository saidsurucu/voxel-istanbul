import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';

export const WaterBody: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  
  // High Res Grid for 0.125 scale
  const SCALE = 0.125;
  const rows = 192; // Width approx 24 units
  const cols = 480; // Length approx 60 units
  const count = rows * cols;

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (let x = 0; x < rows; x++) {
      for (let z = 0; z < cols; z++) {
        // Center the grid
        const posX = (x - rows/2) * SCALE;
        const posZ = (z - cols/2) * SCALE;
        
        dummy.position.set(posX, -1, posZ);
        dummy.scale.set(SCALE, SCALE, SCALE);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame((state) => {
    if (!meshRef.current) return;
    let i = 0;
    const time = state.clock.getElapsedTime();

    for (let x = 0; x < rows; x++) {
      for (let z = 0; z < cols; z++) {
        const posX = (x - rows/2) * SCALE;
        const posZ = (z - cols/2) * SCALE;
        
        // Detailed Wave Math
        const y = Math.sin(posX / 2 + time * 0.8) * 0.1 
                + Math.cos(posZ / 1.5 + time * 0.5) * 0.1 
                + Math.sin((posX + posZ) * 2 + time) * 0.02 // fine detail
                - 0.3;
        
        dummy.position.set(posX, y, posZ);
        dummy.scale.set(SCALE, SCALE, SCALE);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        
        // Bosphorus Turquoise Gradient
        const isCrest = y > -0.25;
        const isTrough = y < -0.35;
        let colorHex = '#0ea5e9'; // Mid
        if (isCrest) colorHex = '#7dd3fc'; // Foam/Light
        if (isTrough) colorHex = '#1e3a8a'; // Deep
        
        meshRef.current.setColorAt(i, new Color(colorHex));
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.1} metalness={0.3} />
    </instancedMesh>
  );
};