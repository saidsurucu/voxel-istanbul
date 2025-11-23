import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface ApartmentsProps {
  isAsia: boolean;
  isNight: boolean;
}

const SCALE = 0.125;

// Authentic Istanbul Apartment Colors (Pastels + Concrete)
// Updated: All roofs are now shades of Red as requested.
const PALETTES = [
    { wall: '#fdf4e3', trim: '#ffffff', roof: '#b91c1c' }, // Cream / Red Roof
    { wall: '#ffedd5', trim: '#fff7ed', roof: '#991b1b' }, // Apricot / Dark Red
    { wall: '#e2e8f0', trim: '#f8fafc', roof: '#ef4444' }, // Cool Grey / Bright Red
    { wall: '#f1f5f9', trim: '#ffffff', roof: '#dc2626' }, // White / Standard Red
    { wall: '#dcfce7', trim: '#f0fdf4', roof: '#b91c1c' }, // Pale Mint / Red Roof
    { wall: '#fae8ff', trim: '#fdf4ff', roof: '#991b1b' }, // Pale Lilac / Dark Red Roof
    { wall: '#f5f5f4', trim: '#e7e5e4', roof: '#ef4444' }, // Warm Grey / Bright Red Roof
];

const AWNING_COLORS = ['#dc2626', '#16a34a', '#2563eb', '#d97706']; // Red, Green, Blue, Orange

// Lights Component for Apartments (Dimmer than Yalis)
const ApartmentLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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
                emissiveIntensity={0.6} // Reduced intensity for apartment ambient look
                toneMapped={false} 
            />
        </instancedMesh>
    );
};

export const ApartmentBlock: React.FC<ApartmentsProps> = ({ isAsia, isNight }) => {
  const { opaque, glass } = useMemo(() => {
    const opaque: VoxelData[] = [];
    const glass: VoxelData[] = [];
    
    // helper functions
    const push = (x: number, y: number, z: number, c: string) => opaque.push({position: [x, y, z], color: c});
    const pushGlass = (x: number, y: number, z: number, c: string) => glass.push({position: [x, y, z], color: c});

    // Seeded Random Helper for deterministic generation
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    // Bounds
    const Z_RANGE = 192; 
    const X_DEPTH = 144; 
    const startOffset = 96;
    const xOffset = isAsia ? startOffset : -startOffset; 
    const xDir = isAsia ? 1 : -1;

    // Use a larger step to allow for wider/denser buildings without overlap
    for (let zIndex = -Z_RANGE + 12; zIndex < Z_RANGE - 12; zIndex += 36) { 
      for (let xIndex = 64; xIndex < X_DEPTH - 10; xIndex += 36) { 
        
        // Initialize seed for this building block
        let seed = Math.abs(zIndex * 10000 + xIndex);
        const rand = () => {
            seed += 1337; 
            return seededRandom(seed);
        };

        // Random placement jitter (Deterministic now)
        const jx = Math.floor(rand() * 8);
        const jz = Math.floor(rand() * 8);
        
        const currentXIndex = xIndex + jx;
        const currentZIndex = zIndex + jz;
        
        const worldX = (xOffset + (currentXIndex * xDir)) * SCALE;
        const worldZ = currentZIndex * SCALE;

        // Bridge Exclusion Zone
        if (Math.abs(worldZ - (-5)) < 12.0) continue;

        // Terrain Height
        const slope = Math.pow((currentXIndex - 10) * 0.04, 1.2) * 5.0; 
        const largeNoise = Math.sin(currentZIndex * 0.02) * 8.0; 
        const smallNoise = Math.cos(currentXIndex * 0.1) * 3.0;
        const terrainH = Math.floor(2 + slope + largeNoise + smallNoise);
        const surfaceY = terrainH * SCALE;

        // --- BUILDING GENERATION ---
        
        const palette = PALETTES[Math.floor(rand() * PALETTES.length)];
        const width = 14 + Math.floor(rand() * 5); // 14-19 voxels
        const depth = 14 + Math.floor(rand() * 5); // 14-19 voxels
        
        // Height: 4 to 8 floors
        const floors = 4 + Math.floor(rand() * 5); 
        const floorH = 7; // Height of one floor in voxels
        
        const hasShop = rand() > 0.4;
        const awningColor = AWNING_COLORS[Math.floor(rand() * AWNING_COLORS.length)];
        
        // "Çatı Dubleks" (Penthouse Terrace) - Top floor is smaller
        const hasTerrace = floors > 5 && rand() > 0.3;

        for(let f=0; f<floors; f++) {
            const isGround = f === 0;
            const isTop = f === floors - 1;
            
            const fy = surfaceY + (f * floorH * SCALE);
            
            // Inset for Terrace
            const inset = (isTop && hasTerrace) ? 3 : 0; 
            
            // Loop Voxels for Floor
            for (let vx = inset; vx < width - inset; vx++) {
                for (let vz = inset; vz < depth - inset; vz++) {
                    
                    // Optimization: Only render shell
                    const isEdge = vx === inset || vx === width - inset - 1 || vz === inset || vz === depth - inset - 1;
                    if (!isEdge) {
                        // Render roof floor for terrace
                        if (isTop && hasTerrace) {
                             // This is the interior floor of the top level
                        } else {
                             // Just ceilings/floors for other levels to prevent light leaking
                             if (isTop) push(worldX + vx*SCALE, fy + (floorH)*SCALE, worldZ + vz*SCALE, palette.roof);
                             continue;
                        }
                    }

                    // Wall Construction
                    for (let vy = 0; vy < floorH; vy++) {
                         const px = worldX + vx*SCALE;
                         const py = fy + vy*SCALE;
                         const pz = worldZ + vz*SCALE;

                         // --- GROUND FLOOR SHOP ---
                         if (isGround && hasShop) {
                             if (vy === floorH - 1) {
                                 // Awning (Striped)
                                 const stripe = (vx + vz) % 2 === 0;
                                 push(px, py, pz, stripe ? awningColor : '#ffffff');
                                 // Overhang for awning
                                 const isFront = (isAsia && vx === 0) || (!isAsia && vx === width-1); // Assume facing "in" or "out" roughly
                                 if (isFront || vz===0 || vz===depth-1) {
                                     // Stick out awning
                                     const nx = (vx===0)?-1:(vx===width-1)?1:0;
                                     const nz = (vz===0)?-1:(vz===depth-1)?1:0;
                                     if (nx!==0 || nz!==0) {
                                         push(px + nx*SCALE, py - SCALE, pz + nz*SCALE, stripe ? awningColor : '#ffffff');
                                         push(px + nx*SCALE * 2, py - 2*SCALE, pz + nz*SCALE * 2, stripe ? awningColor : '#ffffff');
                                     }
                                 }
                             } else if (vy > 0 && vy < floorH - 1) {
                                 // Shop Window
                                 if ((vx+vz)%4 !== 0) {
                                     if (isNight) pushGlass(px, py, pz, '#fdfce7'); // Fully lit shops
                                     else push(px, py, pz, '#334155');
                                 }
                                 else push(px, py, pz, '#94a3b8'); // Frame
                             } else {
                                 push(px, py, pz, '#475569'); // Base/Top
                             }
                             continue;
                         }

                         // --- RESIDENTIAL FLOORS ---
                         const isWindow = (vy > 1 && vy < floorH - 2) && 
                                          (vx % 4 > 1 || vz % 4 > 1) && 
                                          isEdge; // Simplified window pattern

                         if (isWindow && isEdge) {
                             // AC Unit Logic (Stable Random)
                             const acSeed = seed + vx*100 + vy*10 + vz;
                             const hasAC = seededRandom(acSeed) > 0.96;
                             
                             if (hasAC && vy === 2) {
                                 push(px, py, pz, '#ffffff');
                                 // Protrude
                                 const nx = (vx===inset)?-1:(vx===width-inset-1)?1:0;
                                 const nz = (vz===inset)?-1:(vz===depth-inset-1)?1:0;
                                 push(px + nx*SCALE, py, pz + nz*SCALE, '#ffffff');
                             } else {
                                 if (isNight) {
                                     // All windows lit at night
                                     pushGlass(px, py, pz, '#fef3c7'); 
                                 } else {
                                     push(px, py, pz, '#1e293b');
                                 }
                             }
                         } else {
                             // Trim/Lintels
                             if (vy === 0 || vy === floorH - 1) push(px, py, pz, palette.trim);
                             else push(px, py, pz, palette.wall);
                         }
                    }
                }
            }

            // --- BALCONIES ---
            // Only on middle floors
            if (!isGround && (!isTop || !hasTerrace)) {
                 // Render Balconies (Deterministic)
                 if (rand() > 0.3) {
                     let bxStart=0, bxEnd=0, bzStart=0, bzEnd=0;
                     let dx=0, dz=0;

                     if (rand() > 0.5) {
                         // Z-long balcony
                         bzStart = inset + 2; bzEnd = depth - inset - 2;
                         dx = (isAsia) ? 1 : -1; 
                         bxStart = (dx === 1) ? width-inset-1 : inset;
                         bxEnd = bxStart;
                     } else {
                         // X-long balcony
                         bxStart = inset + 2; bxEnd = width - inset - 2;
                         dz = (rand() > 0.5) ? 1 : -1;
                         bzStart = (dz === 1) ? depth-inset-1 : inset;
                         bzEnd = bzStart;
                     }
                     
                     if (dx !== 0) { // X-Facing
                         for(let bz=bzStart; bz<=bzEnd; bz++) {
                              if (bz % 6 > 3) continue; // Gaps between balconies
                              const px = worldX + (bxStart + dx)*SCALE;
                              const py = fy;
                              const pz = worldZ + bz*SCALE;
                              // Floor
                              push(px, py, pz, palette.trim);
                              // Railing
                              push(px, py + SCALE, pz, '#171717');
                              push(px + dx*SCALE, py + SCALE, pz, '#171717'); // Outer edge
                         }
                     }
                 }
            }
        }

        // --- ROOF ELEMENTS ---
        const roofY = surfaceY + (floors * floorH * SCALE);
        const rInset = (hasTerrace) ? 3 : 0;
        
        // Roof Surface
        for(let rx=rInset; rx<width-rInset; rx++) {
             for(let rz=rInset; rz<depth-rInset; rz++) {
                 push(worldX + rx*SCALE, roofY, worldZ + rz*SCALE, palette.roof);
             }
        }

        // Terrace Railing if applicable
        if (hasTerrace) {
            for(let rx=rInset; rx<width-rInset; rx++) {
                push(worldX + rx*SCALE, roofY, worldZ + rInset*SCALE, '#475569');
                push(worldX + rx*SCALE, roofY, worldZ + (depth-rInset-1)*SCALE, '#475569');
            }
            for(let rz=rInset; rz<depth-rInset; rz++) {
                push(worldX + rInset*SCALE, roofY, worldZ + rz*SCALE, '#475569');
                push(worldX + (width-rInset-1)*SCALE, roofY, worldZ + rz*SCALE, '#475569');
            }
        }

        // Water Tanks (Silver/Blue cylinders)
        const tankX = rInset + 2 + Math.floor(rand()*(width-rInset*2-4));
        const tankZ = rInset + 2 + Math.floor(rand()*(depth-rInset*2-4));
        for(let ty=0; ty<3; ty++) {
            push(worldX + tankX*SCALE, roofY + (ty+1)*SCALE, worldZ + tankZ*SCALE, '#94a3b8');
            push(worldX + (tankX+1)*SCALE, roofY + (ty+1)*SCALE, worldZ + tankZ*SCALE, '#94a3b8');
            push(worldX + tankX*SCALE, roofY + (ty+1)*SCALE, worldZ + (tankZ+1)*SCALE, '#94a3b8');
            push(worldX + (tankX+1)*SCALE, roofY + (ty+1)*SCALE, worldZ + (tankZ+1)*SCALE, '#94a3b8');
        }

        // Satellite Dishes
        if (rand() > 0.5) {
             const dx = rInset + Math.floor(rand()*(width-rInset*2));
             const dz = rInset + Math.floor(rand()*(depth-rInset*2));
             push(worldX + dx*SCALE, roofY + SCALE, worldZ + dz*SCALE, '#ffffff');
             push(worldX + dx*SCALE, roofY + 2*SCALE, worldZ + (dz+1)*SCALE, '#ffffff'); // Dish face
        }
      }
    }
    return { opaque, glass };
  }, [isAsia, isNight]);

  return (
    <>
        <InstancedVoxelGroup data={opaque} />
        {glass.length > 0 && <ApartmentLights data={glass} color="#fef3c7" />}
    </>
  );
};

export const Apartments: React.FC<{isNight: boolean}> = ({ isNight }) => {
    return (
        <>
            <ApartmentBlock isAsia={false} isNight={isNight} />
            <ApartmentBlock isAsia={true} isNight={isNight} />
        </>
    )
}