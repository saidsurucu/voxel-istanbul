import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface YaliProps {
  isAsia: boolean;
}

const SCALE = 0.125;

// Yali Color Palettes
const PALETTES = [
  { name: 'Red Ochre', wall: '#9f1239', trim: '#fff7ed', roof: '#451a03' }, // Aşı boyası
  { name: 'Bosphorus White', wall: '#f8fafc', trim: '#cbd5e1', roof: '#be123c' }, // Beyaz
  { name: 'Dark Walnut', wall: '#451a03', trim: '#a8a29e', roof: '#171717' }, // Ahşap
  { name: 'Pastel Green', wall: '#dcfce7', trim: '#166534', roof: '#b91c1c' }, // Yeşil
  { name: 'Cream', wall: '#fff7ed', trim: '#78350f', roof: '#7f1d1d' }, // Krem
];

export const WaterfrontMansions: React.FC<YaliProps> = ({ isAsia }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    const Z_RANGE = 192; 
    const startOffset = 96; // Water edge
    
    // Random seed helper
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Iterate along the shoreline
    for (let zIndex = -Z_RANGE + 10; zIndex < Z_RANGE - 10; zIndex += 40) {
        
        const currentZ = zIndex + Math.floor(seededRandom(zIndex) * 10);
        const seed = Math.abs(currentZ);
        const palette = PALETTES[Math.floor(seededRandom(seed) * PALETTES.length)];
        const width = 16 + Math.floor(seededRandom(seed + 1) * 12);
        const depth = 14 + Math.floor(seededRandom(seed + 2) * 8);
        const floors = 2 + (seededRandom(seed + 3) > 0.6 ? 1 : 0);
        
        const xOffset = isAsia ? startOffset : -startOffset;
        const xDir = isAsia ? 1 : -1;
        const dist = 4; // Distance from water edge
        
        const worldX = (xOffset + (dist * xDir)) * SCALE;
        const worldZ = currentZ * SCALE;

        // --- RESTRICTIONS ---
        if (Math.abs(worldZ - (-5)) < 5.0) continue; // Bridge
        const isMosqueLocation = !isAsia && worldZ > -6.0 && worldZ < 4.0;
        if (isMosqueLocation) continue;
        const isMaidensTower = isAsia && Math.abs(worldZ - 8.0) < 3.0;
        if (isMaidensTower) continue;

        // --- TERRAIN HEIGHT ---
        // Set to 2 voxels to match the new low coastal height
        const terrainHeightVoxels = 2; 
        const groundY = terrainHeightVoxels * SCALE;

        // --- BUILD YALI ---
        
        // 1. QUAY (Rıhtım)
        for(let qz = -width/2 - 2; qz <= width/2 + 2; qz++) {
             for(let qx = 1; qx <= 6; qx++) { // Extended quay to water
                  const qPosX = worldX - (qx * xDir * SCALE);
                  data.push({
                      position: [qPosX, groundY, worldZ + qz*SCALE],
                      color: '#cbd5e1' // Concrete
                  });
             }
        }

        // 2. HOUSE BODY
        const floorH = 10;
        
        for(let f = 0; f < floors; f++) {
             let currentWidth = width;
             let currentDepth = depth;
             let xShift = 0;
             
             // Cumba expansion
             if (f > 0) {
                 currentWidth += 2; 
                 currentDepth += 3; 
                 xShift = -3 * xDir; 
             }

             for (let y = 0; y < floorH; y++) {
                 for (let x = 0; x < currentDepth; x++) {
                     for (let z = -currentWidth/2; z < currentWidth/2; z++) {
                         
                         if (x > 0 && x < currentDepth -1 && Math.abs(z) < currentWidth/2 - 1 && y > 0 && y < floorH-1) continue;
                         
                         const px = worldX + (x * xDir * SCALE) + (xShift * SCALE);
                         const py = groundY + SCALE + (f * floorH * SCALE) + (y * SCALE);
                         const pz = worldZ + (z * SCALE);
                         
                         const isCorner = x === 0 || x === currentDepth -1 || Math.abs(z) === Math.floor(currentWidth/2);
                         const isWindowLevel = y > 2 && y < floorH - 2;
                         const isWindowPos = (z % 4 === 0) || (x % 4 === 0);
                         
                         let color = palette.wall;
                         
                         if (!isCorner && isWindowLevel && isWindowPos) {
                             color = '#1e293b'; 
                         } else if (!isCorner && (y === 2 || y === floorH - 2)) {
                             color = palette.trim; 
                         } else if (isCorner) {
                             color = palette.trim; 
                         }

                         data.push({ position: [px, py, pz], color });
                     }
                 }
             }
             
             // Supports
             if (f === 0 && floors > 1) {
                 for(let z = -width/2; z < width/2; z+=4) {
                     const sx = worldX + (-1 * xDir * SCALE);
                     const sy = groundY + SCALE + (floorH * SCALE) - (2*SCALE);
                     const sz = worldZ + (z * SCALE);
                     data.push({ position: [sx, sy, sz], color: palette.trim });
                     data.push({ position: [sx - (1*xDir*SCALE), sy + SCALE, sz], color: palette.trim });
                 }
             }
        }

        // 3. ROOF
        const roofOverhang = 3;
        const topFloorWidth = width + 2; 
        const topFloorDepth = depth + 3; 
        const roofStartH = floors * floorH;
        const roofBaseX = worldX + (-3 * xDir * SCALE); 
        
        for (let h = 0; h < 8; h++) {
             const shrink = h;
             const rw = (topFloorWidth/2) + roofOverhang - shrink;
             const minZ = -rw;
             const maxZ = rw;
             const minX = -roofOverhang + shrink;
             const maxX = topFloorDepth + roofOverhang - shrink;
             
             for(let rx = minX; rx <= maxX; rx++) {
                 for(let rz = minZ; rz <= maxZ; rz++) {
                     const isEdge = rx === minX || rx === maxX || rz === minZ || rz === maxZ;
                     if (!isEdge && h < 6) continue; 
                     
                     const px = roofBaseX + (rx * xDir * SCALE);
                     const py = groundY + SCALE + (roofStartH * SCALE) + (h * SCALE);
                     const pz = worldZ + (rz * SCALE);
                     
                     data.push({ position: [px, py, pz], color: palette.roof });
                 }
             }
        }
    }
    return data;
  }, [isAsia]);

  return <InstancedVoxelGroup data={voxelData} />;
};