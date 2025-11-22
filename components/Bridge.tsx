import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

export const Bridge: React.FC = () => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    
    // Dimensions (World Units)
    const bridgeZ = -5; 
    const deckY = 8;
    const towerHeight = 22;
    const towerX = 12; // Pylons at +/- 12 (Matches new shoreline)
    
    // Colors
    const cSteel = "#64748b"; // Slate 500
    const cDarkSteel = "#475569"; // Slate 600
    const cRoad = "#334155"; // Slate 700
    const cLine = "#f8fafc"; // White
    const cCable = "#1e293b"; // Slate 800

    const push = (x: number, y: number, z: number, color: string) => {
        data.push({ position: [x, y, z], color });
    };

    // 1. TOWERS (Pylons)
    const createTower = (tx: number) => {
        // Two legs for H-frame
        const legDist = 2.5; // distance from center Z
        
        for (let zOffset of [-legDist, legDist]) {
            // Legs
            for (let y = 0; y < towerHeight; y += SCALE) {
                // Draw 3x3 voxel leg
                for (let dx = -SCALE; dx <= SCALE; dx+=SCALE) {
                    for (let dz = -SCALE; dz <= SCALE; dz+=SCALE) {
                        push(tx + dx, y, bridgeZ + zOffset + dz, cSteel);
                    }
                }
            }
        }

        // Crossbars (H-shape)
        const crossbarYLevels = [deckY - 2, deckY + 4, towerHeight - 2];
        crossbarYLevels.forEach(cy => {
            for (let z = bridgeZ - legDist; z <= bridgeZ + legDist; z += SCALE) {
                for (let y = cy; y < cy + 0.5; y += SCALE) {
                    push(tx, y, z, cDarkSteel);
                    push(tx + SCALE, y, z, cDarkSteel); // Thickness
                }
            }
        });
        
        // Top lights
        push(tx, towerHeight, bridgeZ - legDist, "#ef4444"); // Red beacon
        push(tx, towerHeight, bridgeZ + legDist, "#ef4444");
    };

    createTower(-towerX);
    createTower(towerX);

    // 2. DECK & TRUSS
    // Bridge spans from -32 to 32 to cover full landscape (Extended Road)
    for (let x = -32; x <= 32; x += SCALE) {
        // Deck Surface
        const deckWidth = 3.5; // +/- 1.75
        for (let z = -1.75; z <= 1.75; z += SCALE) {
            let color = cRoad;
            const zAbs = Math.abs(z);
            
            // Road Markings
            if (zAbs < 0.1) color = cLine; // Center line
            else if (Math.abs(zAbs - 0.85) < 0.05) color = cLine; // Lane dividers
            
            push(x, deckY, bridgeZ + z, color);
        }

        // Side Railings
        push(x, deckY + SCALE, bridgeZ - 1.75, cSteel);
        push(x, deckY + SCALE, bridgeZ + 1.75, cSteel);

        // Under-Truss (Zig-zag pattern)
        if (x % 1.0 < SCALE) { 
            for (let z = -1.6; z <= 1.6; z += 1.6) {
                 for (let y = deckY - 1; y < deckY; y += SCALE) {
                     push(x, y, bridgeZ + z, cDarkSteel);
                 }
            }
             // Bottom chords
            for (let z = -1.6; z <= 1.6; z += 1.6) {
                push(x, deckY - 1, bridgeZ + z, cDarkSteel);
            }
        }
        // Continuous bottom rails
        push(x, deckY - 1, bridgeZ - 1.6, cDarkSteel);
        push(x, deckY - 1, bridgeZ + 1.6, cDarkSteel);

        // 4. APPROACH VIADUCT PILLARS (New addition)
        // Add pillars on land sections (beyond towers) every ~6 units
        if (Math.abs(x) > towerX + 4 && Math.abs(x) % 6.0 < SCALE) {
            // Draw pillar downwards from deckY - 1 to ground (approx y=0)
            for (let py = 0; py < deckY - 1; py += SCALE) {
                // 2x2 thickness pillar
                for(let px=-SCALE; px<=0; px+=SCALE) {
                    for(let pz=-SCALE; pz<=0; pz+=SCALE) {
                         push(x + px, py, bridgeZ + pz, cDarkSteel);
                    }
                }
            }
        }
    }

    // 3. SUSPENSION CABLES
    // Main Span Parabola
    const cableStartH = towerHeight - 1;
    const sag = cableStartH - (deckY + 2); // Lowest point is slightly above deck
    
    for (let x = -towerX; x <= towerX; x += SCALE/2) { // Higher density for smooth curve
        const progress = x / towerX; // -1 to 1
        const y = (deckY + 2) + (progress * progress) * sag;
        
        // Two main cables
        push(x, y, bridgeZ - 1.8, cCable);
        push(x, y, bridgeZ + 1.8, cCable);

        // Vertical Suspenders
        if (Math.abs(x % 1.0) < SCALE/1.5) {
             for (let vy = deckY + SCALE; vy < y; vy += SCALE) {
                 push(x, vy, bridgeZ - 1.8, "#94a3b8"); 
                 push(x, vy, bridgeZ + 1.8, "#94a3b8");
             }
        }
    }

    // Back Spans (Tower to Land)
    const backSpanLen = 8;
    for (let i = 0; i < backSpanLen / SCALE; i++) {
         const dx = i * SCALE;
         const xLeft = -towerX - dx;
         const xRight = towerX + dx;
         
         const progress = i / (backSpanLen / SCALE);
         const y = cableStartH - (progress * (cableStartH - deckY));
         
         // Left side back cables
         push(xLeft, y, bridgeZ - 1.8, cCable);
         push(xLeft, y, bridgeZ + 1.8, cCable);
         
         // Right side back cables
         push(xRight, y, bridgeZ - 1.8, cCable);
         push(xRight, y, bridgeZ + 1.8, cCable);
    }

    return data;
  }, []);

  return <InstancedVoxelGroup data={voxelData} />;
};
