
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

// Emissive Lights for the boat cabin
const BoatLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        data.forEach((voxel, i) => {
            dummy.position.set(voxel.position[0], voxel.position[1], voxel.position[2]);
            dummy.scale.set(SCALE, SCALE, SCALE);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);

    if (data.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
                color={color} 
                emissive={color} 
                emissiveIntensity={2.5} 
                toneMapped={false} 
            />
        </instancedMesh>
    );
};

interface FishingBoatProps {
  isNight: boolean;
}

export const FishingBoat: React.FC<FishingBoatProps> = ({ isNight }) => {
  const groupRef = useRef<Group>(null);
  
  const { opaque, glass } = useMemo(() => {
      const opaque: VoxelData[] = [];
      const glass: VoxelData[] = [];
      
      const push = (x: number, y: number, z: number, c: string) => {
          opaque.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };
      const pushGlass = (x: number, y: number, z: number, c: string) => {
          glass.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };

      // Palette
      const cHullWhite = "#f8fafc";
      const cHullRed = "#dc2626"; // Waterline strip
      const cDeck = "#d97706";    // Wood
      const cCabin = "#f1f5f9";
      const cWindow = "#1e293b";
      const cNightGlass = "#facc15";
      const cNet = "#064e3b";     // Dark Green Nets
      const cMast = "#f59e0b";    // Amber/Wood
      const cFlagRed = "#ef4444";
      const cFlagWhite = "#ffffff";

      const length = 26; // ~3.25 units
      const widthMax = 8; // ~1 unit
      
      for(let z=0; z<length; z++) {
          const zPos = z - length/2;
          const zNorm = zPos / (length/2); // -1 to 1

          // Shape: Pointed bow (positive z), Square stern (negative z)
          let currentWidth = widthMax;
          
          // Bow taper
          if (zPos > 5) {
              const taper = (zPos - 5) / (length/2 - 5);
              currentWidth = widthMax * (1 - Math.pow(taper, 1.5));
          }
          if (currentWidth < 2) currentWidth = 1;

          const wInt = Math.floor(currentWidth);
          const halfW = Math.floor(wInt/2);

          for(let x=-halfW; x<=halfW; x++) {
              
              // 1. HULL
              // Bottom Layer (Red Waterline)
              push(x, 0, zPos, cHullRed);
              
              // White Sides
              if (x === -halfW || x === halfW || zPos === Math.floor(length/2)-1) {
                  push(x, 1, zPos, cHullWhite);
                  push(x, 2, zPos, cHullWhite);
                  push(x, 3, zPos, cHullWhite); // Gunwale
              } else {
                  // Deck Floor
                  if (zPos < length/2 - 2) { // Don't fill very tip
                       push(x, 1, zPos, cDeck);
                  } else {
                       push(x, 1, zPos, cHullWhite); // Bow cover
                  }
              }
          }
      }

      // 2. CABIN (Wheelhouse)
      // Located slightly forward of center
      const cabinZ = 2;
      const cabinW = 4;
      const cabinL = 5; 
      
      for(let y=2; y<8; y++) {
          for(let cx=-Math.floor(cabinW/2); cx<=Math.floor(cabinW/2); cx++) {
              for(let cz=cabinZ; cz<cabinZ+cabinL; cz++) {
                  const isWall = cx===-Math.floor(cabinW/2) || cx===Math.floor(cabinW/2) || cz===cabinZ || cz===cabinZ+cabinL-1;
                  
                  if (isWall) {
                      let col = cCabin;
                      let isWin = false;
                      
                      // Windows
                      if (y >= 4 && y <= 5) {
                          // Front Window
                          if (cz === cabinZ+cabinL-1 && Math.abs(cx) < 2) isWin = true;
                          // Side Windows
                          if (Math.abs(cx) === Math.floor(cabinW/2) && (cz-cabinZ)%2 !== 0) isWin = true;
                          // Rear Window
                          if (cz === cabinZ && Math.abs(cx) < 1) isWin = true;
                      }

                      if (isWin) {
                          if (isNight) pushGlass(cx, y, cz, cNightGlass);
                          else push(cx, y, cz, cWindow);
                      } else {
                          push(cx, y, cz, col);
                      }
                  } else if (y === 7) {
                      // Roof
                      push(cx, y, cz, cHullRed); // Red roof for cabin
                  }
              }
          }
      }

      // 3. DETAILS

      // Fishing Nets (Pile on rear deck)
      for(let nx=-2; nx<=2; nx++) {
          for(let nz=-8; nz<-4; nz++) {
               if (Math.random() > 0.3) {
                   push(nx, 2, nz, cNet);
                   if (Math.random() > 0.6) push(nx, 3, nz, cNet);
               }
          }
      }
      
      // Crates (Orange)
      push(0, 2, -2, "#ea580c");
      push(1, 2, -2, "#ea580c");
      push(0, 3, -2, "#ea580c");

      // Mast (Behind Cabin)
      const mastZ = 1;
      for(let my=2; my<14; my++) {
          push(0, my, mastZ, cMast);
      }
      // Crossbar
      push(-1, 10, mastZ, cMast);
      push(1, 10, mastZ, cMast);

      // Flag Pole (Stern)
      const flagZ = -12;
      for(let fy=2; fy<8; fy++) push(0, fy, flagZ, "#94a3b8");
      
      // Turkish Flag (Static)
      for(let fy=6; fy<8; fy++) {
          for(let fz=1; fz<4; fz++) {
              let col = cFlagRed;
              if (fy===7 && fz===2) col = cFlagWhite; // Star/Crescent simplified
              push(0, fy, flagZ - fz, col);
          }
      }

      return { opaque, glass };
  }, [isNight]);

  // Animation Loop
  useFrame((state) => {
      if (!groupRef.current) return;
      const t = state.clock.getElapsedTime();
      
      // TRAFFIC LANE UPDATE:
      // Moved to Far West Channel (X < -6) to avoid Tanker
      
      const speed = 0.08; 
      
      // Path parameters
      const zRadius = 22;  
      const xRadius = 2;   
      // Modified from -14 to -11 to prevent collision with Ortakoy Mosque (located at ~-16.5)
      const xCenter = -11;  
      
      // Current position
      const currT = t + 100;
      const z = Math.sin(currT * speed) * zRadius;
      const x = xCenter + Math.cos(currT * speed) * xRadius; 

      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
      
      // Rotation (Tangent)
      const dx = -speed * Math.sin(currT * speed) * xRadius;
      const dz = speed * Math.cos(currT * speed) * zRadius;
      
      groupRef.current.rotation.y = Math.atan2(dx, dz);

      // Bobbing on waves
      const waveY = Math.sin(x * 0.5 + t * 1.5) * 0.1 + Math.sin(z * 0.3 + t) * 0.1;
      groupRef.current.position.y = waveY;

      // Pitch/Roll (gentle)
      groupRef.current.rotation.x = Math.sin(t * 1.2) * 0.05; 
      groupRef.current.rotation.z = Math.cos(t * 0.8) * 0.05; 
  });

  return (
    <group ref={groupRef}>
        <InstancedVoxelGroup data={opaque} />
        {glass.length > 0 && <BoatLights data={glass} color="#facc15" />}
        
        {isNight && (
            // Small light on the mast
            <pointLight position={[0, 1.5, 0.5]} intensity={1} distance={8} color="#fbbf24" decay={2} />
        )}
    </group>
  );
};
