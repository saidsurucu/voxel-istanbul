import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface ApartmentsProps {
  isAsia: boolean;
}

const SCALE = 0.125;

// Detailed Palette with trim colors
const ISTANBUL_PALETTE = [
    { wall: '#fef3c7', trim: '#fffbeb', roof: '#b91c1c' }, // Cream
    { wall: '#ffedd5', trim: '#fff7ed', roof: '#991b1b' }, // Light Orange
    { wall: '#e5e5e5', trim: '#f5f5f5', roof: '#ef4444' }, // White
    { wall: '#d6d3d1', trim: '#e7e5e4', roof: '#7f1d1d' }, // Stone Grey
    { wall: '#fca5a5', trim: '#fecaca', roof: '#881337' }, // Rose
    { wall: '#d9f99d', trim: '#ecfccb', roof: '#9f1239' }, // Pale Lime
];

export const ApartmentBlock: React.FC<ApartmentsProps> = ({ isAsia }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    
    const Z_RANGE = 192; 
    const X_DEPTH = 144; 
    
    const startOffset = 96;
    const xOffset = isAsia ? startOffset : -startOffset; 
    const xDir = isAsia ? 1 : -1;

    // REDUCED DENSITY: Increased step from 24 to 38
    for (let zIndex = -Z_RANGE + 16; zIndex < Z_RANGE - 16; zIndex += 38) { 
      for (let xIndex = 64; xIndex < X_DEPTH - 10; xIndex += 38) { 
        
        // Random jitter
        const jx = Math.floor(Math.random() * 16);
        const jz = Math.floor(Math.random() * 16);
        const currentXIndex = xIndex + jx;
        const currentZIndex = zIndex + jz;
        
        const worldX = (xOffset + (currentXIndex * xDir)) * SCALE;
        const worldZ = currentZIndex * SCALE;

        // Exclude Bridge Area
        if (Math.abs(worldZ - (-5)) < 10.0) continue;

        // Terrain Height Calculation
        let terrainHeightVoxels = 2; 
        const slope = Math.pow((currentXIndex - 10) * 0.04, 1.2) * 5.0; 
        const largeNoise = Math.sin(currentZIndex * 0.02) * 8.0; 
        const smallNoise = Math.cos(currentXIndex * 0.1) * 3.0;
        terrainHeightVoxels = Math.floor(2 + slope + largeNoise + smallNoise);
        
        const surfaceY = terrainHeightVoxels * SCALE;

        // --- Building Architecture ---
        const palette = ISTANBUL_PALETTE[Math.floor(Math.random() * ISTANBUL_PALETTE.length)];
        const floors = 4 + Math.floor(Math.random() * 2); // 4-5 floors
        const floorH = 7; // Taller floors for detail
        const width = 14;
        const depth = 14;
        
        // 1. Stone Base with Entrance
        for(let bx=0; bx<width; bx++) {
            for(let bz=0; bz<depth; bz++) {
                 for(let by=0; by<5; by++) {
                     let color = "#57534e"; // Dark Stone
                     
                     // Entrance Door (Centered on front)
                     const isFront = (xDir === 1) ? (bx === 0) : (bx === width - 1); // Front depends on side
                     // Actually simpler: just put door on Z face for visibility
                     if (bz === Math.floor(depth/2) || bz === Math.floor(depth/2)+1) {
                         if ((isAsia && bx === 0) || (!isAsia && bx === width-1)) {
                             if (by < 4) color = "#451a03"; // Wood door
                         }
                     }
                     data.push({ position: [worldX + bx*SCALE, surfaceY + by*SCALE, worldZ + bz*SCALE], color });
                 }
            }
        }
        const baseTop = surfaceY + (5*SCALE);

        // 2. Upper Floors
        for(let f=0; f<floors; f++) {
            const fy = baseTop + (f * floorH * SCALE);
            
            // Balcony / Cumba
            const hasBalcony = f > 0 && Math.random() > 0.3;
            const balconyDepth = 2;
            
            // Expansion limits
            // Randomize balcony side: Front (facing water) usually
            let minX = 0, maxX = width, minZ = 0, maxZ = depth;
            
            if (hasBalcony) {
                if (isAsia) minX -= balconyDepth; // Expand towards water (left for Asia)
                else maxX += balconyDepth; // Expand towards water (right for Europe)
            }

            for(let lx=minX; lx<maxX; lx++) {
                for(let lz=minZ; lz<maxZ; lz++) {
                    // Hollow inside
                    if (lx>minX && lx<maxX-1 && lz>minZ && lz<maxZ-1) continue;
                    
                    const isBalconyPart = (lx < 0 || lx >= width);
                    
                    // Window Logic
                    // Regular spacing
                    const isWinX = (lx % 5 === 2 || lx % 5 === 3);
                    const isWinZ = (lz % 5 === 2 || lz % 5 === 3);
                    const isCorner = lx===minX || lx===maxX-1 || lz===minZ || lz===maxZ-1;
                    
                    let color = palette.wall;
                    
                    // Render voxel column for this floor
                    for(let y=0; y<floorH; y++) {
                        // Floor Cornice (Horizontal strip at bottom of floor)
                        if (y === 0) {
                             data.push({ position: [worldX + lx*SCALE, fy + y*SCALE, worldZ + lz*SCALE], color: palette.trim });
                             continue;
                        }
                        
                        // Balcony Railing
                        if (isBalconyPart && y < 2) {
                            // Iron bars look
                            if ((lx+lz+y)%2 === 0) data.push({ position: [worldX + lx*SCALE, fy + y*SCALE, worldZ + lz*SCALE], color: "#171717" });
                            continue;
                        } else if (isBalconyPart && y >= 2) {
                            continue; // Open air above balcony railing
                        }

                        // Windows
                        if (!isCorner && !isBalconyPart && (isWinX || isWinZ)) {
                            if (y > 1 && y < floorH - 1) {
                                // Frame
                                if (y === 2 || y === floorH - 2 || (isWinX && (lx%5===2)) || (isWinZ && (lz%5===2))) {
                                     color = palette.trim;
                                } else {
                                     color = "#1f2937"; // Dark Glass
                                }
                            }
                        }
                        
                        data.push({ 
                            position: [worldX + lx*SCALE, fy + y*SCALE, worldZ + lz*SCALE], 
                            color: color 
                        });
                    }
                }
            }
        }
        
        // 3. Detailed Roof
        const roofY = baseTop + (floors * floorH * SCALE);
        const roofH = 6;
        
        for(let r=0; r<roofH; r++) {
            const inset = r; 
            const rMinX = -1 + inset;
            const rMaxX = width + 1 - inset;
            const rMinZ = -1 + inset;
            const rMaxZ = depth + 1 - inset;
            
            for(let rx=rMinX; rx<rMaxX; rx++) {
                for(let rz=rMinZ; rz<rMaxZ; rz++) {
                    data.push({ 
                        position: [worldX + rx*SCALE, roofY + r*SCALE, worldZ + rz*SCALE], 
                        color: palette.roof 
                    });
                }
            }
        }

        // Chimney
        const chimX = Math.floor(width/2);
        const chimZ = Math.floor(depth/2);
        for(let cy=0; cy<roofH+2; cy++) {
            data.push({ position: [worldX + chimX*SCALE, roofY + cy*SCALE, worldZ + chimZ*SCALE], color: "#78350f" });
        }
      }
    }
    return data;
  }, [isAsia]);

  return <InstancedVoxelGroup data={voxelData} />;
};

export const Apartments: React.FC = () => {
    return (
        <>
            <ApartmentBlock isAsia={false} />
            <ApartmentBlock isAsia={true} />
        </>
    )
}