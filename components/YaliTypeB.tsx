import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface YaliProps {
  isAsia: boolean;
  isNight: boolean;
}

const SCALE = 0.125;

// Emissive Lights Component
const YaliLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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
                emissiveIntensity={2.0} 
                toneMapped={false} 
            />
        </instancedMesh>
    );
};

export const YaliTypeB: React.FC<YaliProps> = ({ isAsia, isNight }) => {
  const { opaque, glass } = useMemo(() => {
    const opaque: VoxelData[] = [];
    const glass: VoxelData[] = [];

    const Z_RANGE = 192; 
    const startOffset = 144; // Updated to 144 from 96
    
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const push = (x: number, y: number, z: number, c: string) => {
         opaque.push({ position: [x, y, z], color: c });
    };

    const pushGlass = (x: number, y: number, z: number, c: string) => {
         glass.push({ position: [x, y, z], color: c });
    };

    // --- WHITE PALACE AESTHETIC (Matching Reference Image) ---
    const cWall = '#f1f5f9';   // Slate 100 (White-ish wall)
    const cTrim = '#ffffff';   // Pure White (Pilasters, Cornices, Railings)
    const cWin  = '#1e293b';   // Slate 800 (Dark Glass)
    const cNightGlass = '#fef08a'; // Warm yellow light
    const cRoof = '#94a3b8';   // Slate 400 (Lead/Flat roof surface)
    const cQuay = '#f8fafc';   // Slate 50 (Marble Quay)

    for (let zIndex = -Z_RANGE + 10; zIndex < Z_RANGE - 10; zIndex += 40) {
        
        const currentZ = zIndex + Math.floor(seededRandom(zIndex) * 10);
        const seed = Math.abs(currentZ);

        // Only render Variant 1 (Replacing original Type B logic entirely)
        const variant = Math.floor(seededRandom(seed + 999) * 3);
        if (variant !== 1) continue; 

        // Dimensions (Preserving "Volume" as requested, but styled differently)
        const width = 20 + Math.floor(seededRandom(seed + 1) * 6); 
        const depth = 14 + Math.floor(seededRandom(seed + 2) * 4);
        const floors = 2 + (seededRandom(seed + 3) > 0.7 ? 1 : 0); // Mostly 2 tall floors
        
        const xOffset = isAsia ? startOffset : -startOffset;
        const xDir = isAsia ? 1 : -1;
        const dist = 5; // Set back slightly to allow for the quay
        
        const worldX = (xOffset + (dist * xDir)) * SCALE;
        const worldZ = currentZ * SCALE;

        // Exclusions
        if (Math.abs(worldZ - (-5)) < 5.0) continue; 
        const isMosqueLocation = !isAsia && worldZ > -6.0 && worldZ < 4.0;
        if (isMosqueLocation) continue;
        const isMaidensTower = isAsia && Math.abs(worldZ - 8.0) < 3.0;
        if (isMaidensTower) continue;

        const groundY = 2 * SCALE;

        // 1. QUAY (Rıhtım) - Wide Marble Platform
        for(let qz = -Math.floor(width/2) - 4; qz <= Math.floor(width/2) + 4; qz++) {
             for(let qx = -3; qx <= 6; qx++) { 
                  const qPosX = worldX - (qx * xDir * SCALE);
                  push(qPosX, groundY, worldZ + qz*SCALE, cQuay);
             }
        }

        // 2. BUILDING MASS
        const floorH = 10; // Tall floors (1.25 units)
        const centerSpan = Math.floor(width / 2.5); // Central projection width

        for(let f = 0; f < floors; f++) {
             const yBase = groundY + SCALE + (f * floorH * SCALE);
             
             for (let y = 0; y < floorH; y++) {
                 
                 for (let z = -Math.floor(width/2); z <= Math.floor(width/2); z++) {
                     // Risalit Logic: Center projects out towards water by 2 voxels
                     const isCenter = Math.abs(z) < centerSpan/2;
                     const projection = isCenter ? 2 : 0;
                     
                     // Iterate X (Depth)
                     // x ranges from -projection (Front) to depth (Back)
                     for(let x = -projection; x < depth; x++) {
                         
                         // Optimization: Skip interior voxels
                         if (x > -projection && x < depth - 1 && Math.abs(z) < Math.floor(width/2) - 1 && y > 0 && y < floorH-1) continue;

                         const px = worldX + (x * xDir * SCALE);
                         const py = yBase + (y * SCALE);
                         const pz = worldZ + (z * SCALE);

                         let color = cWall;
                         let isWindow = false;

                         // --- FACADE DETAILING ---
                         const isFront = (x === -projection);
                         const isBack = (x === depth - 1);
                         const isSide = (Math.abs(z) === Math.floor(width/2));
                         // Check if this is the side wall of the central projection
                         const isProjectionSide = isCenter && (x < 0) && (Math.abs(z) === Math.floor((centerSpan-1)/2));

                         const isVisibleFace = isFront || isBack || isSide || isProjectionSide;

                         if (isVisibleFace) {
                             // 1. Cornices (Floor separation)
                             if (y === 0 || y === floorH - 1) {
                                 color = cTrim;
                             }
                             // 2. Windows (Tall, rectangular)
                             else if (y > 2 && y < floorH - 2) {
                                 // Regular rhythm: Window on 1,2 of every 4
                                 // Shifted so corners aren't windows
                                 if ((z + 100) % 4 === 1 || (z + 100) % 4 === 2) {
                                      isWindow = true;
                                 }
                             }
                             // 3. Pilasters / Vertical Elements
                             else if ((z + 100) % 4 === 0) {
                                 // Subtle vertical striping
                                 color = cTrim;
                             }
                         }

                         if (isWindow) {
                             if (isNight) {
                                 pushGlass(px, py, pz, cNightGlass);
                             } else {
                                 push(px, py, pz, cWin);
                             }
                         } else {
                             push(px, py, pz, color);
                         }
                     }
                 }
             }
        }

        // 3. ROOF (Flat with Balustrade)
        const roofY = groundY + SCALE + (floors * floorH * SCALE);
        
        // Roof Surface & Parapet
        for(let z = -Math.floor(width/2); z <= Math.floor(width/2); z++) {
            const isCenter = Math.abs(z) < centerSpan/2;
            const projection = isCenter ? 2 : 0;
            
            for(let x = -projection; x < depth; x++) {
                const px = worldX + (x * xDir * SCALE);
                const pz = worldZ + (z * SCALE);
                
                // Flat Roof Floor
                push(px, roofY, pz, cRoof);

                // Balustrade Logic (Perimeter)
                const isFrontEdge = (x === -projection);
                const isBackEdge = (x === depth - 1);
                const isSideEdge = (Math.abs(z) === Math.floor(width/2));
                // Inner corner where projection meets main wing
                const isInnerCorner = (!isCenter && x === 0 && (Math.abs(z) === Math.floor(centerSpan/2))); 

                if (isFrontEdge || isBackEdge || isSideEdge || isInnerCorner) {
                    // Base of railing
                    push(px, roofY + SCALE, pz, cTrim);
                    
                    // Balusters (Vertical posts) - Checkerboard pattern
                    if ((x+z)%2 === 0) {
                        push(px, roofY + 2*SCALE, pz, cTrim);
                    }
                    
                    // Top Rail
                    push(px, roofY + 3*SCALE, pz, cTrim);
                }
            }
        }
    }
    return { opaque, glass };
  }, [isAsia, isNight]);

  return (
    <>
      <InstancedVoxelGroup data={opaque} />
      {glass.length > 0 && <YaliLights data={glass} color="#fef08a" />}
    </>
  );
};