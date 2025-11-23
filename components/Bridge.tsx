import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

interface BridgeProps {
  isNight: boolean;
}

export const Bridge: React.FC<BridgeProps> = ({ isNight }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    
    // --- DIMENSIONS ---
    const towerX = 14;      // Distance of towers from center
    const towerH = 28;      // Height of towers
    const deckY = 8;        // Height of road deck
    const bridgeZ = -5;     // Z-position of the bridge
    const deckWidth = 4.5;  // Width of the deck

    // --- PALETTE ---
    const cSteel = "#94a3b8";      // Slate 400
    const cDarkSteel = "#475569";  // Slate 600
    const cConcrete = "#cbd5e1";   // Slate 300
    const cAsphalt = "#1e293b";    // Slate 800
    const cLine = "#f8fafc";       // White
    const cCable = "#cbd5e1";      // Light Grey
    const cRedLight = "#ef4444";   // Beacon Red
    
    // Night Colors (High brightness for Bloom)
    const cLedBlue = "#3b82f6";    // Bright Blue
    const cLedPurple = "#a855f7";  // Bright Purple
    const cHeadlight = "#fef08a";  // Yellow-200
    const cTaillight = "#dc2626";  // Red-600

    const push = (x: number, y: number, z: number, color: string) => {
        data.push({ position: [x, y, z], color });
    };

    // 1. TOWERS (The Majestic Pylons)
    // Modeled after the 15 July Martyrs Bridge (Steel H-frame with cross bracing)
    const createTower = (tx: number) => {
        const legOffset = 2.0; // Distance of legs from bridge center line

        // Concrete Base (in water)
        for (let y = -2; y < 1; y += SCALE) {
             for (let dx = -0.5; dx <= 0.5; dx += SCALE) {
                 for (let dz = -3; dz <= 3; dz += SCALE) {
                     push(tx + dx, y, bridgeZ + dz, cConcrete);
                 }
             }
        }

        // Steel Legs
        for (let zOffset of [-legOffset, legOffset]) {
            for (let y = 1; y < towerH; y += SCALE) {
                // Taper logic: slightly wider at bottom? keeping it straight for voxel clarity
                // 3x3 voxel leg
                for (let dx = -SCALE; dx <= SCALE; dx+=SCALE) {
                    for (let dz = -SCALE; dz <= SCALE; dz+=SCALE) {
                        push(tx + dx, y, bridgeZ + zOffset + dz, cSteel);
                    }
                }
            }
        }

        // Cross Bracing (Zig-Zag / X Pattern)
        const braceLevels = [deckY + 2, deckY + 8, deckY + 14, towerH - 2];
        
        // Horizontal Bars
        braceLevels.forEach(yLevel => {
            for (let z = bridgeZ - legOffset; z <= bridgeZ + legOffset; z += SCALE) {
                // Thickness
                push(tx, yLevel, z, cDarkSteel);
                push(tx, yLevel - SCALE, z, cDarkSteel);
            }
        });

        // Diagonal Bracing (X-Shape between levels)
        const makeX = (yBottom: number, yTop: number) => {
             const h = yTop - yBottom;
             const w = legOffset * 2;
             const steps = 30;
             for(let i=0; i<steps; i++) {
                 const t = i/steps;
                 const y = yBottom + t * h;
                 const z1 = bridgeZ - legOffset + t * w; // /
                 const z2 = bridgeZ + legOffset - t * w; // \
                 
                 if (Math.abs(tx) > 0) {
                    push(tx, y, z1, cDarkSteel);
                    push(tx, y, z2, cDarkSteel);
                 }
             }
        };

        makeX(braceLevels[0], braceLevels[1]);
        makeX(braceLevels[1], braceLevels[2]);

        // Top Beacons
        if (isNight) {
            push(tx, towerH + SCALE, bridgeZ - legOffset, cRedLight);
            push(tx, towerH + SCALE, bridgeZ + legOffset, cRedLight);
        }
    };

    createTower(-towerX);
    createTower(towerX);

    // 2. DECK & TRAFFIC
    // Spans essentially infinity (or at least wide enough to cover view)
    const bridgeLength = 64; 
    
    for (let x = -bridgeLength/2; x <= bridgeLength/2; x += SCALE) {
        
        // Skip space occupied by towers
        if (Math.abs(Math.abs(x) - towerX) < 0.5) continue;

        // -- TRUSS STRUCTURE (Underneath) --
        // A box truss design
        const trussDepth = 1.0;
        const trussY = deckY - trussDepth;
        
        // Bottom chords
        push(x, trussY, bridgeZ - deckWidth/2 + 0.5, cDarkSteel);
        push(x, trussY, bridgeZ + deckWidth/2 - 0.5, cDarkSteel);
        
        // Diagonals (every unit)
        if (Math.floor(x) === x) {
             // Vertical structs
             for(let y=trussY; y<deckY; y+=SCALE) {
                 push(x, y, bridgeZ - deckWidth/2 + 0.5, cDarkSteel);
                 push(x, y, bridgeZ + deckWidth/2 - 0.5, cDarkSteel);
             }
             // Cross brace underneath
             for(let z = -deckWidth/2; z <= deckWidth/2; z+=SCALE) {
                 if (Math.random() > 0.5) push(x, trussY, bridgeZ + z, cDarkSteel);
             }
        }

        // -- ROAD DECK --
        for (let z = -deckWidth/2; z <= deckWidth/2; z += SCALE) {
            const zRel = z; // Relative to bridge center Z
            
            // Side Walkways (Outer edges)
            if (Math.abs(zRel) > deckWidth/2 - 0.6) {
                push(x, deckY, bridgeZ + z, cConcrete); // Light grey walkway
                // Railing
                if (Math.abs(zRel) > deckWidth/2 - 0.2) {
                    push(x, deckY + SCALE, bridgeZ + z, cSteel);
                }
                continue;
            }

            // Median Strip
            if (Math.abs(zRel) < 0.2) {
                push(x, deckY + SCALE/2, bridgeZ + z, cConcrete); // Raised median
                // Lamp posts on median (Every 8 units)
                if (Math.abs(x % 8.0) < SCALE) {
                    for(let h=0; h<3; h++) push(x, deckY + 0.5 + h*SCALE, bridgeZ + z, cSteel);
                    // Light
                    if (isNight) {
                         push(x, deckY + 0.5 + 3*SCALE, bridgeZ + z, "#fef3c7");
                         // glow around
                         push(x+SCALE, deckY + 0.5 + 3*SCALE, bridgeZ + z, "#fef3c7");
                         push(x-SCALE, deckY + 0.5 + 3*SCALE, bridgeZ + z, "#fef3c7");
                    }
                }
                continue;
            }

            // Asphalt Lanes
            let surfaceColor = cAsphalt;
            
            // Lane Markings (White dashes)
            // Lanes at approx +/- 1.0 and +/- 2.0
            const isLaneLine = Math.abs(Math.abs(zRel) - 1.2) < 0.1;
            if (isLaneLine && Math.abs(x % 2.0) < 1.0) {
                 surfaceColor = cLine;
            }

            push(x, deckY, bridgeZ + z, surfaceColor);
        }

        // -- TRAFFIC --
        // Random placement of cars
        // 5% chance per voxel column to have a car start? Too dense.
        // Let's use a noise function or simple random blocks
        
        if (Math.abs(x) % 3.0 < SCALE) { // Regular spacing potential
            if (Math.random() > 0.3) {
                // Determine lane
                const lane = Math.floor(Math.random() * 3); // 0, 1, 2
                // Direction determines side
                const direction = Math.random() > 0.5 ? 1 : -1; 
                
                // z position based on lane and direction
                // Median is 0. Lanes are at ~0.6, ~1.4, ~2.2 approx
                const laneZ = (0.6 + (lane * 0.8)) * direction;
                
                // Draw Car
                const carColor = Math.random() > 0.5 ? "#f1f5f9" : (Math.random() > 0.5 ? "#1e293b" : "#ef4444"); // White, Black, or Red car
                
                // Car Body (3 long, 2 wide)
                for(let cx=-0.25; cx<=0.25; cx+=SCALE) {
                    for(let cz=-0.125; cz<=0.125; cz+=SCALE) {
                        push(x+cx, deckY + SCALE, bridgeZ + laneZ + cz, carColor);
                    }
                }

                // Lights
                if (isNight) {
                    // Headlights (Front) or Taillights (Back)
                    // Assume traffic flows: Positive X -> Right Side (z > 0)? No, usually right hand traffic.
                    // If moving +X, should be on Z > 0 (Right side if looking +X).
                    // So Z > 0 moves +X. Z < 0 moves -X.
                    
                    const movingPositive = laneZ > 0;
                    const frontX = movingPositive ? x + 0.25 : x - 0.25;
                    const backX = movingPositive ? x - 0.25 : x + 0.25;

                    // Front Lights (Yellow/White)
                    push(frontX, deckY + SCALE, bridgeZ + laneZ - 0.1, cHeadlight);
                    push(frontX, deckY + SCALE, bridgeZ + laneZ + 0.1, cHeadlight);

                    // Back Lights (Red)
                    push(backX, deckY + SCALE, bridgeZ + laneZ - 0.1, cTaillight);
                    push(backX, deckY + SCALE, bridgeZ + laneZ + 0.1, cTaillight);
                }
            }
        }
    }

    // 3. SUSPENSION CABLES
    // Main Parabola
    const cableStartH = towerH - 1;
    const sag = cableStartH - (deckY + 3); 
    const cableZ = bridgeZ - deckWidth/2 + 0.2; // Edge of deck
    const cableZ2 = bridgeZ + deckWidth/2 - 0.2;

    for (let x = -towerX; x <= towerX; x += SCALE/2) { 
        const progress = x / towerX; // -1 to 1
        const y = (deckY + 3) + (progress * progress) * sag;
        
        const cableColor = isNight ? cLedBlue : cCable;

        // Main Cables
        push(x, y, cableZ, cableColor);
        push(x, y, cableZ2, cableColor);

        // Vertical Suspenders
        // Every 1 unit
        if (Math.abs(x % 1.5) < SCALE/1.5) {
             for (let vy = deckY + SCALE; vy < y; vy += SCALE) {
                 // Night: LED Vertical Lines
                 // Pattern: alternating colors or shimmering? 
                 // Let's do a gradient: Purple at top, Blue at bottom
                 let vColor = cCable;
                 if (isNight) {
                     vColor = (vy > (y + deckY)/2) ? cLedPurple : cLedBlue;
                 }
                 
                 push(x, vy, cableZ, vColor); 
                 push(x, vy, cableZ2, vColor);
             }
        }
    }

    // Back Spans (Anchorages)
    // Simple straight lines down to "land"
    const backSpanLen = 12;
    for (let i = 0; i < backSpanLen / SCALE; i++) {
         const dx = i * SCALE;
         const xLeft = -towerX - dx;
         const xRight = towerX + dx;
         
         const progress = i / (backSpanLen / SCALE);
         const y = cableStartH - (progress * (cableStartH - deckY));
         
         const cableColor = isNight ? cLedBlue : cCable;

         push(xLeft, y, cableZ, cableColor);
         push(xLeft, y, cableZ2, cableColor);
         
         push(xRight, y, cableZ, cableColor);
         push(xRight, y, cableZ2, cableColor);
    }

    return data;
  }, [isNight]);

  return (
    <InstancedVoxelGroup 
        data={voxelData} 
        castShadow={true} 
    />
  );
};
