import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { VoxelData } from '../types';

interface InstancedVoxelGroupProps {
  data: VoxelData[];
  scale?: number;
}

// Default scale updated to 0.125 for high detail
export const InstancedVoxelGroup: React.FC<InstancedVoxelGroupProps> = ({ data, scale = 0.125 }) => {
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

  // If no data, render nothing
  if (data.length === 0) return null;

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, data.length]}
      frustumCulled={true}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        roughness={0.8} 
        metalness={0.1}
      />
    </instancedMesh>
  );
};

export const VoxelGroup: React.FC<{ children: React.ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }> = ({ children, position = [0,0,0], rotation = [0,0,0] }) => {
  return <group position={position} rotation={rotation}>{children}</group>;
};