import React, { useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { enhanceShaderLighting } from '../utils/enhanceShaderLighting';

interface WaterProps {
  isNight: boolean;
}

export const WaterBody: React.FC<WaterProps> = ({ isNight }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  
  // High Res Grid
  const SCALE = 0.125;
  const rows = 192; 
  const cols = 480; 
  const count = rows * cols;

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (let x = 0; x < rows; x++) {
      for (let z = 0; z < cols; z++) {
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

    // Dynamic colors based on time
    // Night: Deep Midnight Blue instead of black
    const deepColor = isNight ? '#172554' : '#0369a1'; 
    // Night: Slightly lighter Royal Blue for wave crests
    const surfColor = isNight ? '#1e3a8a' : '#0ea5e9'; 

    for (let x = 0; x < rows; x++) {
      for (let z = 0; z < cols; z++) {
        const posX = (x - rows/2) * SCALE;
        const posZ = (z - cols/2) * SCALE;
        
        // Gentle waves
        const y = Math.sin(posX / 2 + time * 0.6) * 0.08 
                + Math.cos(posZ / 1.5 + time * 0.4) * 0.08 
                - 0.3;
        
        dummy.position.set(posX, y, posZ);
        dummy.scale.set(SCALE, SCALE, SCALE);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        
        // Apply color logic
        let colorHex = surfColor;
        if (y < -0.35) colorHex = deepColor;
        
        meshRef.current.setColorAt(i, new Color(colorHex));
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  const handleBeforeCompile = useCallback((shader: any) => {
     // Different settings for water to make it look more fluid/reflective
     enhanceShaderLighting(shader, {
        aoColor: new Color('#000000'),
        hemisphereColor: new Color(isNight ? '#1e1b4b' : '#0ea5e9'), // Blueish ambient
        irradianceColor: new Color('#ffffff'),
        radianceColor: new Color(isNight ? '#1e293b' : '#e0f2fe'),
        
        aoPower: 1.0,
        roughnessPower: 3.0, // Higher roughness power -> glossier where smooth
        sunIntensity: 1.5,
        radianceIntensity: 2.0, // Stronger sky reflections
        
        hardcodeValues: false
     });
  }, [isNight]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      {/* 
         Material Update:
         - Removed envMapIntensity as we removed the HDRI.
         - Lowered metalness significantly (from 0.8 to 0.1) to prevent water appearing black due to lack of reflections.
         - Color set to white to allow instance colors to show through freely.
         - Added onBeforeCompile via enhance-shader-lighting
      */}
      <meshStandardMaterial 
        roughness={0.2} 
        metalness={0.1} 
        color="#ffffff" 
        onBeforeCompile={handleBeforeCompile}
        key={isNight ? 'night' : 'day'}
      />
    </instancedMesh>
  );
};