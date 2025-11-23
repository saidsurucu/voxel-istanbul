import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface YaliProps {
  isAsia: boolean;
}

const SCALE = 0.125;

// Refined Palettes for authentic Ottoman Yali look (Amcazade, Hekimbasi, etc.)
const PALETTES = [
  { name: 'Hekimbasi Red', wall: '#7f1d1d', board: '#991b1b', trim: '#fef2f2', roof: '#451a03' }, // Deep Red / Ochre
  { name: 'Koprulu Wood', wall: '#9a3412', board: '#c2410c', trim: '#fff7ed', roof: '#431407' }, // Natural Wood / Orange
  { name: 'Bosphorus White', wall: '#f1f5f9', board: '#e2e8f0', trim: '#ffffff', roof: '#334155' }, // White / Grey
  { name: 'Pasha Pink', wall: '#be185d', board: '#9d174d', trim: '#fff1f2', roof: '#881337' }, // Dark Pink
];

export const YaliTypeA: React.FC<YaliProps> = ({ isAsia }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    const Z_RANGE = 192; 
    const startOffset = 96; 
    
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const push = (x: number, y: number, z: number, c: string) => {
         data.push({ position: [x, y, z], color: c });
    };

    // Iterate along the shoreline
    for (let zIndex = -Z_RANGE + 10; zIndex < Z_RANGE - 10; zIndex += 40) {
        
        const currentZ = zIndex + Math.floor(seededRandom(zIndex) * 10);
        const seed = Math.abs(currentZ);

        // Maintain existing distribution (only 1/3rd are Type A)
        const variant = Math.floor(seededRandom(seed + 999) * 3);
        if (variant !== 0) continue; 

        const palette = PALETTES[Math.floor(seededRandom(seed) * PALETTES.length)];
        
        // Volume Preservation: Similar ranges to original
        const width = 18 + Math.floor(seededRandom(seed + 1) * 10); // ~20-28 voxels wide
        const depth = 16 + Math.floor(seededRandom(seed + 2) * 6);  // ~16-22 voxels deep
        const floors = 2 + (seededRandom(seed + 3) > 0.5 ? 1 : 0); // 2 or 3 floors
        
        const xOffset = isAsia ? startOffset : -startOffset;
        const xDir = isAsia ? 1 : -1;
        const dist = 4; // Distance from water edge
        
        const worldX = (xOffset + (dist * xDir)) * SCALE;
        const worldZ = currentZ * SCALE;

        // --- EXCLUSION ZONES ---
        if (Math.abs(worldZ - (-5)) < 5.0) continue; // Bridge
        const isMosqueLocation = !isAsia && worldZ > -6.0 && worldZ < 4.0;
        if (isMosqueLocation) continue;
        const isMaidensTower = isAsia && Math.abs(worldZ - 8.0) < 3.0;
        if (isMaidensTower) continue;

        const groundY = 2 * SCALE;

        // 1. QUAY (Rıhtım)
        // Stone platform extending slightly into water
        for(let qz = -width/2 - 2; qz <= width/2 + 2; qz++) {
             for(let qx = -1; qx <= 8; qx++) { 
                  const qPosX = worldX - (qx * xDir * SCALE);
                  // Light grey stone
                  push(qPosX, groundY, worldZ + qz*SCALE, '#e2e8f0');
             }
        }

        // 2. HOUSE BODY
        const floorH = 11; // 1.375 units high per floor

        for(let f = 0; f < floors; f++) {
             const isGround = f === 0;
             
             // Cumba (Overhang) Logic:
             // Ground floor is recessed. Upper floors project outwards towards the sea.
             let currentWidth = width;
             let currentDepth = depth;
             let xShift = 0; 
             
             if (!isGround) {
                 currentWidth += 2; // Wider upper floors
                 currentDepth += 4; // Deeper (significantly towards water)
                 xShift = -4; // Project towards water
             }

             const yBase = groundY + SCALE + (f * floorH * SCALE);

             for (let y = 0; y < floorH; y++) {
                 // Floor Cornice/Trim
                 const isCornice = (y === 0);
                 
                 const minZ = -Math.floor(currentWidth/2);
                 const maxZ = Math.floor(currentWidth/2);

                 // Loop through local volume
                 for (let x = 0; x < currentDepth; x++) {
                     for (let z = minZ; z <= maxZ; z++) {
                         
                         // Hollow Interior
                         if (x > 0 && x < currentDepth - 1 && z > minZ && z < maxZ && y > 0 && y < floorH - 1) continue;

                         // World Position
                         // xShift moves the "0" point outwards for upper floors
                         const localX = x + xShift;
                         const px = worldX + (localX * xDir * SCALE);
                         const py = yBase + (y * SCALE);
                         const pz = worldZ + (z * SCALE);

                         let color = palette.wall;

                         const isFront = (x === 0); // Facing water
                         const isBack = (x === currentDepth - 1);
                         const isSide = (z === minZ || z === maxZ);

                         // -- TEXTURE & DETAILS --

                         // 1. Horizontal Siding (Simulating Wood Planks)
                         // Every 2nd voxel row is slightly darker/different to show lines
                         if (y % 2 === 0 && !isCornice) color = palette.board;

                         // 2. Windows (Sash Style)
                         // Tall rectangular windows with trim
                         if ((isFront || isSide || isBack) && !isCornice) {
                             // Window vertical range
                             if (y >= 3 && y <= floorH - 3) {
                                 // Rhythm depends on face
                                 // Side windows based on X, Front/Back based on Z
                                 const rhythm = (isFront || isBack) ? z : x;
                                 
                                 // Pattern: Wall(1), Window(2), Wall(1) -> Mod 4
                                 const mod = Math.abs(rhythm) % 4;
                                 
                                 // Window is 2 voxels wide
                                 if (mod === 1 || mod === 2) {
                                     // Check for window frame/sash
                                     const isFrame = (y===3 || y===floorH-3) || (mod===1 && y%3===0);
                                     
                                     if (isFrame) {
                                         color = palette.trim;
                                     } else {
                                         color = '#1e293b'; // Dark Glass
                                     }
                                 }
                             }
                         }

                         // 3. Floor Trim / Cornice
                         if (isCornice) color = palette.trim;

                         push(px, py, pz, color);
                     }
                 }
             }

             // --- ELIBOGRUNDE (Diagonal Supports) ---
             // If upper floor, add diagonal braces connecting overhang to the wall below
             if (!isGround) {
                 const minZ = -Math.floor(currentWidth/2);
                 const maxZ = Math.floor(currentWidth/2);
                 
                 // Iterate along the front face
                 for(let z = minZ; z <= maxZ; z+=4) { 
                      // Draw stepped diagonal from Wall (x=0) to Overhang start (x=-4)
                      // Y goes from yBase - 4 to yBase
                      
                      for(let s = 0; s < 4; s++) {
                          const dx = -s; // 0, -1, -2, -3
                          const dy = s;  // 0, 1, 2, 3
                          
                          const sx = worldX + (dx * xDir * SCALE); 
                          const sy = yBase - (4*SCALE) + (dy * SCALE);
                          const sz = worldZ + (z * SCALE);
                          
                          push(sx, sy, sz, palette.trim);
                          
                          // Thickness (2 voxels wide)
                          push(sx, sy, worldZ + (z+1)*SCALE, palette.trim);
                      }
                 }
             }
        }

        // 3. ROOF (Wide Hipped Roof)
        const roofY = groundY + SCALE + (floors * floorH * SCALE);
        const topWidth = width + 2; 
        const topDepth = depth + 4; // Match upper floor depth
        const overhang = 3; // Eaves
        
        // Roof layers
        const roofLayers = 7;
        for(let h=0; h<roofLayers; h++) {
            const inset = h;
            // Calculate roof footprint at this height
            // Relative to upper floor "box"
            const rMinX = -4 - overhang + inset; // Start at overhang edge
            const rMaxX = topDepth - 4 + overhang - inset;
            const rMinZ = -Math.floor(topWidth/2) - overhang + inset;
            const rMaxZ = Math.floor(topWidth/2) + overhang - inset;
            
            for(let rx=rMinX; rx<=rMaxX; rx++) {
                for(let rz=rMinZ; rz<=rMaxZ; rz++) {
                    // Hollow Optimization
                    // FIX: Don't hollow out the top layer, so the roof is closed
                    const isTop = (h === roofLayers - 1);
                    if (!isTop && rx>rMinX && rx<rMaxX && rz>rMinZ && rz<rMaxZ) continue;
                    
                    const px = worldX + (rx * xDir * SCALE);
                    const py = roofY + (h * SCALE);
                    const pz = worldZ + (rz * SCALE);
                    
                    push(px, py, pz, palette.roof);
                }
            }
        }
    }
    return data;
  }, [isAsia]);

  return <InstancedVoxelGroup data={voxelData} />;
};