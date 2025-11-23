import React, { useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { VoxelData } from '../types';
import { enhanceShaderLighting } from '../utils/enhanceShaderLighting';

interface InstancedVoxelGroupProps {
  data: VoxelData[];
  scale?: number;
  transparent?: boolean;
  opacity?: number;
  castShadow?: boolean;
}

// Default scale updated to 0.125 for high detail
export const InstancedVoxelGroup: React.FC<InstancedVoxelGroupProps> = ({ 
  data, 
  scale = 0.125, 
  transparent = false, 
  opacity = 1,
  castShadow = false
}) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    // Iterate through data and set position/color for each instance
    data.forEach((voxel, i) => {
      dummy.position.set(voxel.position[0], voxel.position[1], voxel.position[2]);
      dummy.scale.set(scale, scale, scale); // Set global voxel scale here
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new Color(voxel.color));
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [data, scale, dummy]);

  const handleBeforeCompile = useCallback((shader: any) => {
    enhanceShaderLighting(shader, {
      aoColor: new Color('#0f172a'),      // Deep dark blue for occlusion
      hemisphereColor: new Color('#334155'), // Slate for ambient shadows
      irradianceColor: new Color('#f1f5f9'), // Bright white/grey for general irradiance
      radianceColor: new Color('#e0f2fe'),   // Sky blue for reflections
      
      aoPower: 4.0,           // Stronger AO effect
      aoSmoothing: 0.5,       // Smoother transition
      roughnessPower: 1.0,    // Standard roughness
      sunIntensity: 1.2,      // Boost sun light slightly
      smoothingPower: 0.25,
      
      hardcodeValues: false   // Use uniforms
    });
  }, []);

  // If no data, render nothing
  if (data.length === 0) return null;

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, data.length]}
      frustumCulled={true}
      castShadow={castShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        roughness={0.8} 
        metalness={0.1}
        transparent={transparent}
        opacity={opacity}
        onBeforeCompile={handleBeforeCompile}
      />
    </instancedMesh>
  );
};

export const VoxelGroup: React.FC<{ children: React.ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }> = ({ children, position = [0,0,0], rotation = [0,0,0] }) => {
  return <group position={position} rotation={rotation}>{children}</group>;
};