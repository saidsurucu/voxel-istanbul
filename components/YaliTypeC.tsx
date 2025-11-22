import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface YaliProps {
  isAsia: boolean;
}

const SCALE = 0.125;

export const YaliTypeC: React.FC<YaliProps> = ({ isAsia }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    const Z_RANGE = 192; 
    const startOffset = 96; // Water edge
    
    // Helper for deterministic randomness
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const push = (x: number, y: number, z: number, c: string) => {
        data.push({ position: [x, y, z], color: c });
    };

    // Iterate along the shoreline
    // Spacing is 40 voxels to ensure they don't overlap given the fixed size
    for (let zIndex = -Z_RANGE + 10; zIndex < Z_RANGE - 10; zIndex += 40) {
        
        const currentZ = zIndex + Math.floor(seededRandom(zIndex) * 10);
        const seed = Math.abs(currentZ);

        // --- VARIANT SELECTION (Type C) ---
        // Only render this specific ornate type in 1 out of 3 slots (preserving mix)
        const variant = Math.floor(seededRandom(seed + 999) * 3);
        if (variant !== 2) continue; 

        // --- CONFIGURATION FOR ORNATE MANSION ---
        // "Yusuf Ziya Pasha" Style: Tall, Turrets, White, Ornate
        // Volume constraints: Width ~21, Depth ~15, 3 Floors + Roof
        const width = 21; 
        const depth = 15; 
        const floors = 3;
        const floorH = 9;
        
        const xOffset = isAsia ? startOffset : -startOffset;
        const xDir = isAsia ? 1 : -1;
        const dist = 5; // Slightly further back from water edge to allow for quay
        
        const worldX = (xOffset + (dist * xDir)) * SCALE;
        const worldZ = currentZ * SCALE;

        // --- RESTRICTIONS ---
        if (Math.abs(worldZ - (-5)) < 6.0) continue; // Bridge
        const isMosqueLocation = !isAsia && worldZ > -6.0 && worldZ < 4.0;
        if (isMosqueLocation) continue;
        const isMaidensTower = isAsia && Math.abs(worldZ - 8.0) < 3.0;
        if (isMaidensTower) continue;

        // --- TERRAIN ---
        const groundY = 2 * SCALE;

        // COLORS (Reference Image Style)
        const cWall = "#f8fafc";      // White/Cream
        const cTrim = "#e2e8f0";      // Light detailed trim
        const cWindow = "#1e293b";    // Dark windows
        const cRoof = "#9f1239";      // Red/Burgundy Tile Roof
        const cBase = "#f1f5f9";      // Stone base
        const cGold = "#d97706";      // Finial gold

        // 1. QUAY (Rıhtım) - Front of house promenade
        for(let qz = -width/2 - 4; qz <= width/2 + 4; qz++) {
             for(let qx = 1; qx <= 8; qx++) { 
                  const qPosX = worldX - (qx * xDir * SCALE);
                  push(qPosX, groundY, worldZ + qz*SCALE, cTrim);
             }
        }

        // 2. MAIN STRUCTURE LOOP
        for(let f = 0; f < floors; f++) {
            const yBase = groundY + SCALE + (f * floorH * SCALE);
            
            // Floor Shape Logic
            // Ground Floor: Rectangular Base
            // Upper Floors: Cumba (Projections)
            
            for(let ly = 0; ly < floorH; ly++) {
                for(let lz = -Math.floor(width/2); lz <= Math.floor(width/2); lz++) {
                    // Z-Symmetry Logic
                    const zAbs = Math.abs(lz);
                    const isCenter = zAbs <= 3;
                    
                    // X-Depth Calculation
                    // House faces water. Water direction is -xDir relative to house center anchor.
                    // Local Front is minX. Back is maxX.
                    
                    let localDepth = depth;
                    let localXOffset = 0;

                    // Cumba / Projection Logic
                    if (f > 0) {
                        if (isCenter) {
                             // Center projects OUT towards water
                             localXOffset = -2; 
                             localDepth += 1;
                        } else if (zAbs > 7) {
                             // Side Towers project slightly
                             localXOffset = -1;
                        }
                    }

                    for(let lx = localXOffset; lx < depth; lx++) {
                        // Culling (Hollow Inside for performance)
                        if (lx > localXOffset && lx < depth-1 && lz > -Math.floor(width/2) && lz < Math.floor(width/2) && ly > 0 && ly < floorH-1) continue;

                        const px = worldX + (lx * xDir * SCALE);
                        const py = yBase + (ly * SCALE);
                        const pz = worldZ + (lz * SCALE);
                        
                        let color = (f===0) ? cBase : cWall;

                        // --- DETAILS ---
                        const isFront = (lx === localXOffset);
                        const isSide = (Math.abs(lz) === Math.floor(width/2));
                        
                        // Cornices / Trim between floors
                        if (ly === 0 || ly === floorH - 1) {
                            color = cTrim;
                        }
                        
                        // Windows
                        // Regular spacing: e.g., every 3 voxels
                        if ((isFront || isSide) && ly > 2 && ly < floorH - 2) {
                             // Pattern: Wall, Window, Window, Wall
                             const winPattern = (lz + 100) % 4; 
                             if (winPattern === 1 || winPattern === 2) {
                                 color = cWindow;
                             } else {
                                 // Pilaster/Column between windows
                                 color = cWall; 
                             }
                        }
                        
                        // Entrance Door (Ground Floor, Center)
                        if (f === 0 && isFront && isCenter && ly < 6) {
                             color = "#451a03"; // Dark Wood Door
                        }

                        push(px, py, pz, color);
                    }
                }
            }
        }

        // 3. ROOF & TOWERS (The Distinctive Part)
        const roofY = groundY + SCALE + (floors * floorH * SCALE);
        
        // A. Main Roof (Hipped)
        for(let h=0; h<8; h++) {
             const shrink = h;
             for(let lx = -2 + shrink; lx < depth + 2 - shrink; lx++) {
                 for(let lz = -Math.floor(width/2) - 2 + shrink; lz <= Math.floor(width/2) + 2 - shrink; lz++) {
                     
                     // Skip corners where towers will be
                     const isTowerZone = (Math.abs(lz) > Math.floor(width/2) - 3) && (lx < 3);
                     if (isTowerZone) continue;

                     const px = worldX + (lx * xDir * SCALE);
                     const py = roofY + (h * SCALE);
                     const pz = worldZ + (lz * SCALE);
                     push(px, py, pz, cRoof);
                 }
             }
        }

        // B. The Two Towers (Corner Turrets)
        // Located at the front corners (Water facing)
        const towerHeight = 14; // Taller than roof
        // Z locations for the two towers
        const towerZLocs = [-Math.floor(width/2) + 2, Math.floor(width/2) - 2];
        
        towerZLocs.forEach(tz => {
            const tx = -2; // Front edge
            
            // Tower Base building up from top floor ceiling
            for(let ty=0; ty<towerHeight; ty++) {
                // 5x5 Tower
                for(let dx=-2; dx<=2; dx++) {
                    for(let dz=-2; dz<=2; dz++) {
                        const px = worldX + ((tx+dx) * xDir * SCALE);
                        const py = roofY + (ty * SCALE);
                        const pz = worldZ + ((tz+dz) * SCALE);
                        
                        let col = cWall;
                        
                        // Windows in tower
                        if (ty > 2 && ty < 8) {
                            if (Math.abs(dx)===2 || Math.abs(dz)===2) {
                                // Corners are solid
                                if ((Math.abs(dx)+Math.abs(dz)) < 4) {
                                    // Center of face is window
                                    col = cWindow;
                                }
                            }
                        }
                        
                        // Tower Roof (Spire)
                        if (ty >= 8) {
                             // Pyramidal/Conical reduction
                             const reduction = (ty - 8);
                             if (Math.abs(dx) > (2 - reduction/2) || Math.abs(dz) > (2 - reduction/2)) continue;
                             col = cRoof;
                        }

                        push(px, py, pz, col);
                    }
                }
            }
            // Finial
            push(worldX + (tx * xDir * SCALE), roofY + (towerHeight * SCALE), worldZ + (tz * SCALE), cGold);
        });

        // C. Center Gable (Triangular front)
        const gableW = 7;
        const gableH = 6;
        for(let gy=0; gy<gableH; gy++) {
             const span = gableW - gy; // Triangle
             for(let gz = -Math.floor(span/2); gz <= Math.floor(span/2); gz++) {
                  // Gable wall
                  const px = worldX + (-3 * xDir * SCALE); 
                  const py = roofY + (gy * SCALE);
                  const pz = worldZ + (gz * SCALE);
                  push(px, py, pz, cWall);
                  
                  // Gable Roof edge
                  push(px + (1*xDir*SCALE), py+SCALE, pz, cRoof);
             }
        }
    } 

    return data;
  }, [isAsia]);

  return <InstancedVoxelGroup data={voxelData} />;
};
