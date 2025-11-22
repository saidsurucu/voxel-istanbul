import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

export const OrtakoyMosque: React.FC = () => {
    const voxelData = useMemo(() => {
        const data: VoxelData[] = [];
        // Lift the mosque slightly to sit on its plaza properly
        const baseY = 3 * SCALE; 
        
        // Dimensions (Voxels)
        const width = 25; 
        const depth = 25;
        const height = 24; // Main walls height

        // Palette - Matching the reference (White Stone/Marble, Lead, Dark Glass)
        const cWall = "#f8fafc";      // Main clean white stone
        const cShadow = "#cbd5e1";    // Recessed stone / Shading
        const cTrim = "#e2e8f0";      // Decorative trim
        const cGlass = "#1e293b";     // Dark Windows (Upper)
        const cGlassLight = "#94a3b8"; // Lighter Windows (Lower) - Slate 400
        const cFrame = "#f1f5f9";     // Window frames (White)
        const cRoof = "#bfdbfe";      // Lead domes (Light Blue as requested)
        const cGold = "#fbbf24";      // Finials

        const push = (x: number, y: number, z: number, c: string) => {
            data.push({ position: [x * SCALE, baseY + y * SCALE, z * SCALE], color: c });
        };

        // 1. MAIN PRAYER HALL (HARIM)
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                
                // Hollow Interior Optimization
                if (x > 4 && x < width - 5 && z > 4 && z < depth - 5) continue;

                for (let y = 0; y < height; y++) {
                    
                    // --- CORNER PILASTERS (Heavy Structural Corners) ---
                    const isCorner = (x < 5 || x >= width - 5) && (z < 5 || z >= depth - 5);
                    
                    if (isCorner) {
                        // Rustication (Horizontal grooves) on corners
                        let color = cWall;
                        if (y % 5 === 0 || y % 5 === 1) color = cShadow;
                        
                        // Vertical indent for definition
                        if (x === 4 || x === width - 5 || z === 4 || z === depth - 5) {
                            color = cShadow;
                        }

                        push(x, y, z, color);
                        continue;
                    }

                    // --- FACADES (Central Bays) ---
                    // Check if we are on the outer shell
                    const isFacadeX = (z === 0 || z === depth - 1);
                    const isFacadeZ = (x === 0 || x === width - 1);

                    if (isFacadeX || isFacadeZ) {
                         const cx = (width-1)/2;
                         const cz = (depth-1)/2;
                         
                         // Distance from center of the face
                         const d = isFacadeX ? Math.abs(x - cx) : Math.abs(z - cz);
                         
                         // Determine outward direction for protrusions
                         let px = 0, pz = 0;
                         if (isFacadeX) pz = (z === 0) ? -1 : 1;
                         if (isFacadeZ) px = (x === 0) ? -1 : 1;

                         // --- PROTRUDING PILASTERS (Flanking the window bay) ---
                         // Located at d=7 (Transition from corner block to window bay)
                         if (d === 7) {
                             // Main wall layer
                             push(x, y, z, cWall);
                             
                             // Protrusion layer (Relief)
                             let pColor = cWall;
                             if (y >= height - 3) pColor = cTrim; // Capital
                             else if (y < 4) pColor = cShadow;    // Base
                             else if (y % 4 === 0) pColor = cShadow; // Fluting/Rustication details
                             
                             push(x + px, y, z + pz, pColor);
                             continue;
                         }

                         // --- MAIN WINDOWS (d < 7) ---
                         // Replaced single large window with 3 narrower windows side-by-side
                         // Available width: d=0 to d=6 (13 voxels total width)
                         
                         const wBottom = 5;
                         const wTop = 20;
                         
                         if (y >= wBottom && y <= wTop) {
                             
                             // Window Layout:
                             // Center Window: d=0,1 (Width 3: -1..1)
                             // Mullion Gap: d=2
                             // Side Window: d=3,4,5 (Width 3: 3..5)
                             // Outer Jamb: d=6

                             const isCenter = d <= 1;
                             const isGap = d === 2;
                             const isSide = d >= 3 && d <= 5;
                             
                             // Make center window slightly taller/grander
                             const springY = isCenter ? 18 : 17;

                             if (isGap) {
                                 // Mullion/Pier between windows
                                 push(x, y, z, cTrim);
                                 // Slight protrusion for detail
                                 push(x + px * 0.5, y, z + pz * 0.5, cTrim);
                                 continue;
                             }
                             
                             if (d === 6) {
                                 // Outer wall jamb
                                 push(x, y, z, cWall);
                                 continue;
                             }

                             if (isCenter || isSide) {
                                 let isWindow = false;
                                 
                                 // Calculate local width coordinate for the arch
                                 // Center window center is at d=0. Side window center is at d=4.
                                 const localD = isCenter ? d : Math.abs(d - 4);
                                 
                                 if (y < springY) {
                                     // Straight part
                                     isWindow = true;
                                 } else {
                                     // Arch part
                                     const dy = y - springY;
                                     // Radius approx 1.5 (Width 3)
                                     if (localD**2 + dy**2 <= 2.5) isWindow = true;
                                 }

                                 if (isWindow) {
                                     // Grid / Frame details
                                     const isHorz = (y - wBottom) % 4 === 0;
                                     const isVert = (localD === 0); // Center mullion in window
                                     
                                     if ((isHorz && !isVert) || (isVert && isHorz)) {
                                         push(x, y, z, cFrame);
                                     } else {
                                         // Lower half lighter
                                         push(x, y, z, y < 13 ? cGlassLight : cGlass);
                                     }
                                 } else {
                                     // Spandrel (Wall above arch)
                                     push(x, y, z, cWall);
                                 }
                                 continue;
                             }
                         }
                         
                         // If not caught by window logic (e.g. below wBottom or above wTop)
                         // Fall through to default wall
                    }

                    // Default Wall
                    let color = cWall;
                    
                    // Base / Plinth
                    if (y < 4) color = cShadow;
                    
                    // Top Cornice
                    if (y === height - 1) color = cTrim;

                    push(x, y, z, color);
                }
            }
        }

        // 2. SULTAN'S PAVILION (Hünkar Kasrı)
        // Extends to the "Front" (Z-)
        const pWidth = width + 2;
        const pDepth = 8;
        const pHeight = 14; // Lower than main mosque

        for(let x = -1; x <= width; x++) {
            for(let z = -pDepth; z < 0; z++) {
                // Only draw shell
                const isOuter = (x === -1 || x === width || z === -pDepth);
                
                for(let y=0; y < pHeight; y++) {
                    // Interior check
                    if (!isOuter && y < pHeight - 1) continue;

                    let color = cWall;

                    // Windows on Pavilion
                    if (isOuter && y > 4 && y < pHeight - 2) {
                        // Simple rectangular windows
                        if ((Math.abs(x)+Math.abs(z)) % 4 === 0) {
                            // Pavilion windows are lower, apply light glass to lower part as well (y < 8)
                            color = y < 8 ? cGlassLight : cGlass;
                        }
                    }
                    
                    // Roof
                    if (y === pHeight - 1) color = cRoof;

                    push(x, y, z, color);
                }
            }
        }


        // 3. MINARETS
        // Increased Thickness: Base 5x5, Shaft 3x3
        const minaretLocs = [
            { mx: -4, mz: -4 }, 
            { mx: width - 1, mz: -4 }
        ];

        minaretLocs.forEach(({mx, mz}) => {
             const balconyY = 40; 

             // A. BASE (Kürsü) - Square Plinth 5x5
             for(let y=0; y<14; y++) {
                 for(let dx=0; dx<5; dx++) for(let dz=0; dz<5; dz++) {
                     let color = cWall;
                     // Base cornice
                     if (y===13) color = cTrim;
                     else if (y===0) color = cShadow;
                     push(mx+dx, y, mz+dz, color);
                 }
             }
             
             // B. SHAFT (Gövde) - 3x3 Core
             for(let y=14; y<balconyY; y++) {
                 for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) {
                     push(mx+sx, y, mz+sz, cWall);
                 }
             }

             // C. BALCONY (Şerefe)
             // Wider 5x5 balcony for 3x3 shaft
             
             // Support Corbels
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                 // Rounded corners
                 if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                 push(mx+bx, balconyY-2, mz+bz, cShadow);
                 push(mx+bx, balconyY-1, mz+bz, cShadow);
             }

             // Balcony Floor (y=40)
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                  if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                  push(mx+bx, balconyY, mz+bz, cTrim);
             }

             // Balcony Railing
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                  if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                  
                  // Ring perimeter
                  const isEdge = bx===0 || bx===4 || bz===0 || bz===4 || 
                                 (bx===1 && (bz===0||bz===4)) ||
                                 (bx===3 && (bz===0||bz===4)) ||
                                 (bz===1 && (bx===0||bx===4)) ||
                                 (bz===3 && (bx===0||bx===4));
                                 
                  if(isEdge) {
                       // Posts
                       if ((bx+bz)%2 !== 0) push(mx+bx, balconyY+1, mz+bz, cTrim);
                       // Handrail
                       push(mx+bx, balconyY+2, mz+bz, cTrim);
                  }
             }

             // D. UPPER SHAFT (Petek) - 3x3
             const petekStart = balconyY+1;
             const petekEnd = petekStart + 5;
             for(let y=petekStart; y<petekEnd; y++) {
                 for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) {
                     push(mx+sx, y, mz+sz, cWall);
                 }
             }

             // E. CAP (Külah) - Lead Cone (Thicker/Taller)
             const capH = 15; 
             const capBase = petekEnd;
             
             for(let y=0; y<capH; y++) {
                 // Eaves flare at bottom
                 if (y===0) {
                     for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                         if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                         push(mx+bx, capBase+y, mz+bz, cRoof);
                     }
                     continue;
                 }
                 
                 // Tapering body
                 if (y < 6) {
                     // 3x3 Section
                     for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) {
                         push(mx+sx, capBase+y, mz+sz, cRoof);
                     }
                 } else if (y < 11) {
                     // Cross Section (Rounded 3x3)
                     push(mx+2, capBase+y, mz+2, cRoof);
                     push(mx+1, capBase+y, mz+2, cRoof);
                     push(mx+3, capBase+y, mz+2, cRoof);
                     push(mx+2, capBase+y, mz+1, cRoof);
                     push(mx+2, capBase+y, mz+3, cRoof);
                 } else {
                     // Tip 1x1
                     push(mx+2, capBase+y, mz+2, cRoof);
                 }
             }
             
             // F. FINIAL (Alem)
             const alemY = capBase + capH;
             push(mx+2, alemY, mz+2, cGold); 
             push(mx+2, alemY+1, mz+2, cGold); 
             push(mx+2, alemY+2, mz+2, cGold);
        });


        // 4. ROOF STRUCTURES (Turrets & Dome)
        const cx = (width-1)/2;
        const cz = (depth-1)/2;
        const roofY = height;

        // A. Corner Turrets (Weight Towers)
        const turretLocs = [
            [0,0], [width-5,0], [0,depth-5], [width-5,depth-5]
        ];
        
        turretLocs.forEach(([tx, tz]) => {
            // Base
            for(let y=0; y<4; y++) {
                for(let dx=0; dx<5; dx++) for(let dz=0; dz<5; dz++) {
                    // Octagonal-ish trim
                    if((dx===0||dx===4) && (dz===0||dz===4)) continue;
                    push(tx+dx, roofY+y, tz+dz, cWall);
                }
            }
            // Turret Dome
            for(let dx=1; dx<4; dx++) for(let dz=1; dz<4; dz++) {
                push(tx+dx, roofY+4, tz+dz, cRoof);
                push(tx+dx, roofY+5, tz+dz, cRoof);
            }
            // Turret Finial
            push(tx+2, roofY+6, tz+2, cGold);
        });

        // B. Main Drum (Octagonal)
        const drumR = 10;
        for(let y=0; y<5; y++) {
             for(let x=0; x<width; x++) {
                 for(let z=0; z<depth; z++) {
                     const dx = x - cx;
                     const dz = z - cz;
                     const dist = Math.sqrt(dx*dx + dz*dz);
                     
                     if(dist < drumR && dist > drumR - 1.5) {
                         // Drum Windows/Detail
                         if (y > 1 && y < 4) {
                             // Simple windows around drum
                             const angle = Math.atan2(dz, dx);
                             const segs = 8;
                             if (Math.cos(angle * segs) > 0.5) {
                                 push(x, roofY+y, z, cGlass);
                             } else {
                                 push(x, roofY+y, z, cWall);
                             }
                         } else {
                             push(x, roofY+y, z, cWall);
                         }
                     }
                 }
             }
        }

        // C. Main Dome (Ribbed)
        const domeStart = roofY + 5;
        const domeHeight = 13; 
        let maxDomeY = 0;
        
        for(let y=0; y<domeHeight; y++) {
            const term = 100 - (y * 0.9)**2;
            if (term < 0) break;
            maxDomeY = y;

            // Sphere radius at this height
            const r = Math.sqrt(term); 
            
            for(let x=0; x<width; x++) {
                for(let z=0; z<depth; z++) {
                    const dx = x - cx;
                    const dz = z - cz;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    const thickness = (r < 7.5) ? 999 : 1.5;

                    if(dist <= r && dist >= r - thickness) {
                         // Ribbed Pattern
                         const angle = Math.atan2(dz, dx);
                         const ribs = 16; 
                         const isRib = Math.cos(angle * ribs) > 0.6;
                         push(x, domeStart+y, z, isRib ? cTrim : cRoof);
                    }
                }
            }
        }
        
        // Main Finial
        const finialBase = domeStart + maxDomeY + 1;
        
        push(cx, finialBase, cz, cGold);
        push(cx, finialBase+1, cz, cGold);
        push(cx, finialBase+2, cz, cGold);

        return data;
    }, []);

    return <group position={[-13.5, 0, -2]}><InstancedVoxelGroup data={voxelData} /></group>;
}