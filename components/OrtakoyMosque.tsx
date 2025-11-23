import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

// High-intensity emissive mesh for night lights (Mosque Windows)
const MosqueLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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

interface OrtakoyMosqueProps {
  isNight: boolean;
}

export const OrtakoyMosque: React.FC<OrtakoyMosqueProps> = ({ isNight }) => {
    const { opaque, glass } = useMemo(() => {
        const opaque: VoxelData[] = [];
        const glass: VoxelData[] = [];
        
        // Lift the mosque slightly to sit on its plaza properly
        const baseY = 3 * SCALE; 
        
        // Dimensions (Voxels)
        const width = 25; 
        const depth = 25;
        const height = 24; // Main walls height

        // Palette
        const cWall = "#f8fafc";      
        const cShadow = "#cbd5e1";    
        const cTrim = "#e2e8f0";      
        const cGlass = "#1e293b";     
        const cGlassLight = "#94a3b8"; 
        const cFrame = "#f1f5f9";     
        const cRoof = "#bfdbfe";      
        const cGold = "#fbbf24";
        const cNightGlass = "#fef08a"; // Frosted Glass (Yellow-200) for night glow

        const push = (x: number, y: number, z: number, c: string) => {
            opaque.push({ position: [x * SCALE, baseY + y * SCALE, z * SCALE], color: c });
        };

        const pushGlass = (x: number, y: number, z: number, c: string) => {
            glass.push({ position: [x * SCALE, baseY + y * SCALE, z * SCALE], color: c });
        };

        // --- Helper: Check if voxel is part of a Window Shaft ---
        // used to drill holes through the thick walls at night
        const isWindowShaft = (x: number, y: number, z: number) => {
            if (y < 5 || y > 20) return false;

            const cx = 12; 
            const cz = 12;
            const dx = Math.abs(x - cx);
            const dz = Math.abs(z - cz);

            const inWallX = (z < 5 || z > 19); // In a wall running along X
            const inWallZ = (x < 5 || x > 19); // In a wall running along Z

            const checkProfile = (dist: number, yLvl: number) => {
                // Center Window: dist <= 1
                if (dist <= 1) {
                    if (yLvl < 18) return true;
                    return (dist**2 + (yLvl-18)**2 <= 2.5);
                }
                // Side Window: dist 3..5
                if (dist >= 3 && dist <= 5) {
                    const localD = Math.abs(dist - 4);
                    if (yLvl < 17) return true;
                    return (localD**2 + (yLvl-17)**2 <= 2.5);
                }
                return false;
            };

            if (inWallX && checkProfile(dx, y)) return true;
            if (inWallZ && checkProfile(dz, y)) return true;

            return false;
        };

        // 1. MAIN PRAYER HALL (HARIM)
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                
                // Hollow Interior Optimization
                if (x > 4 && x < width - 5 && z > 4 && z < depth - 5) continue;

                for (let y = 0; y < height; y++) {
                    
                    // LIGHTING / WINDOW LOGIC
                    if (isWindowShaft(x, y, z)) {
                        if (isNight) {
                            // At night, fill window shafts with "Frosted Glass"
                            // castShadow=false on the group will let light pass through
                            pushGlass(x, y, z, cNightGlass);
                            continue; 
                        }
                    }

                    // --- CORNER PILASTERS ---
                    const isCorner = (x < 5 || x >= width - 5) && (z < 5 || z >= depth - 5);
                    
                    if (isCorner) {
                        let color = cWall;
                        if (y % 5 === 0 || y % 5 === 1) color = cShadow;
                        if (x === 4 || x === width - 5 || z === 4 || z === depth - 5) color = cShadow;
                        push(x, y, z, color);
                        continue;
                    }

                    // --- FACADES (Outer Shell Only) ---
                    const isFacadeX = (z === 0 || z === depth - 1);
                    const isFacadeZ = (x === 0 || x === width - 1);

                    if (isFacadeX || isFacadeZ) {
                         const cx = (width-1)/2;
                         const cz = (depth-1)/2;
                         const d = isFacadeX ? Math.abs(x - cx) : Math.abs(z - cz);
                         
                         let px = 0, pz = 0;
                         if (isFacadeX) pz = (z === 0) ? -1 : 1;
                         if (isFacadeZ) px = (x === 0) ? -1 : 1;

                         // Pilasters
                         if (d === 7) {
                             push(x, y, z, cWall);
                             let pColor = cWall;
                             if (y >= height - 3) pColor = cTrim;
                             else if (y < 4) pColor = cShadow;
                             else if (y % 4 === 0) pColor = cShadow;
                             push(x + px, y, z + pz, pColor);
                             continue;
                         }

                         // Windows (Surface Rendering for Day)
                         // Note: Night rendering is handled by isWindowShaft above.
                         const wBottom = 5;
                         const wTop = 20;
                         
                         if (y >= wBottom && y <= wTop && d < 7) {
                             const isGap = d === 2;
                             if (isGap) {
                                 push(x, y, z, cTrim);
                                 push(x + px * 0.5, y, z + pz * 0.5, cTrim);
                                 continue;
                             }
                             if (d === 6) {
                                 push(x, y, z, cWall);
                                 continue;
                             }
                             
                             // We are in a window area (d=0,1 or d=3,4,5)
                             // If !isNight, draw glass.
                             if (!isNight) {
                                 const isCenter = d <= 1;
                                 const springY = isCenter ? 18 : 17;
                                 const localD = isCenter ? d : Math.abs(d - 4);
                                 let isWindow = false;

                                 if (y < springY) isWindow = true;
                                 else {
                                     const dy = y - springY;
                                     if (localD**2 + dy**2 <= 2.5) isWindow = true;
                                 }

                                 if (isWindow) {
                                     const isHorz = (y - wBottom) % 4 === 0;
                                     const isVert = (localD === 0);
                                     if ((isHorz && !isVert) || (isVert && isHorz)) {
                                         push(x, y, z, cFrame);
                                     } else {
                                         push(x, y, z, y < 13 ? cGlassLight : cGlass);
                                     }
                                 } else {
                                     push(x, y, z, cWall);
                                 }
                                 continue;
                             }
                         }
                    }

                    // Default Wall
                    let color = cWall;
                    if (y < 4) color = cShadow;
                    if (y === height - 1) color = cTrim;
                    push(x, y, z, color);
                }
            }
        }

        // 2. SULTAN'S PAVILION
        const pWidth = width + 2;
        const pDepth = 8;
        const pHeight = 14; 

        for(let x = -1; x <= width; x++) {
            for(let z = -pDepth; z < 0; z++) {
                const isOuter = (x === -1 || x === width || z === -pDepth);
                
                for(let y=0; y < pHeight; y++) {
                    if (!isOuter && y < pHeight - 1) continue;

                    let color = cWall;
                    if (isOuter && y > 4 && y < pHeight - 2) {
                        if ((Math.abs(x)+Math.abs(z)) % 4 === 0) {
                            if (isNight) {
                                // Pavilion Windows at Night
                                pushGlass(x, y, z, cNightGlass);
                                continue;
                            }
                            color = y < 8 ? cGlassLight : cGlass;
                        }
                    }
                    if (y === pHeight - 1) color = cRoof;
                    push(x, y, z, color);
                }
            }
        }

        // 3. MINARETS (Same as before)
        const minaretLocs = [{ mx: -4, mz: -4 }, { mx: width - 1, mz: -4 }];
        minaretLocs.forEach(({mx, mz}) => {
             const balconyY = 40; 
             for(let y=0; y<14; y++) {
                 for(let dx=0; dx<5; dx++) for(let dz=0; dz<5; dz++) {
                     let color = cWall;
                     if (y===13) color = cTrim; else if (y===0) color = cShadow;
                     push(mx+dx, y, mz+dz, color);
                 }
             }
             for(let y=14; y<balconyY; y++) {
                 for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) {
                     push(mx+sx, y, mz+sz, cWall);
                 }
             }
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                 if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                 push(mx+bx, balconyY-2, mz+bz, cShadow);
                 push(mx+bx, balconyY-1, mz+bz, cShadow);
             }
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                  if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                  push(mx+bx, balconyY, mz+bz, cTrim);
             }
             for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                  if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                  const isEdge = bx===0 || bx===4 || bz===0 || bz===4 || (bx===1 && (bz===0||bz===4)) || (bx===3 && (bz===0||bz===4)) || (bz===1 && (bx===0||bx===4)) || (bz===3 && (bx===0||bx===4));
                  if(isEdge) {
                       if ((bx+bz)%2 !== 0) push(mx+bx, balconyY+1, mz+bz, cTrim);
                       push(mx+bx, balconyY+2, mz+bz, cTrim);
                  }
             }
             for(let y=balconyY+1; y<balconyY+6; y++) {
                 for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) {
                     push(mx+sx, y, mz+sz, cWall);
                 }
             }
             const capH = 15; 
             const capBase = balconyY+6;
             for(let y=0; y<capH; y++) {
                 if (y===0) {
                     for(let bx=0; bx<5; bx++) for(let bz=0; bz<5; bz++) {
                         if((bx===0||bx===4) && (bz===0||bz===4)) continue;
                         push(mx+bx, capBase+y, mz+bz, cRoof);
                     }
                     continue;
                 }
                 if (y < 6) {
                     for(let sx=1; sx<=3; sx++) for(let sz=1; sz<=3; sz++) push(mx+sx, capBase+y, mz+sz, cRoof);
                 } else if (y < 11) {
                     push(mx+2, capBase+y, mz+2, cRoof); push(mx+1, capBase+y, mz+2, cRoof); push(mx+3, capBase+y, mz+2, cRoof); push(mx+2, capBase+y, mz+1, cRoof); push(mx+2, capBase+y, mz+3, cRoof);
                 } else {
                     push(mx+2, capBase+y, mz+2, cRoof);
                 }
             }
             push(mx+2, capBase+capH, mz+2, cGold); 
             push(mx+2, capBase+capH+1, mz+2, cGold); 
             push(mx+2, capBase+capH+2, mz+2, cGold);
        });

        // 4. ROOF (Turrets & Dome)
        const cx = (width-1)/2;
        const cz = (depth-1)/2;
        const roofY = height;

        const turretLocs = [[0,0], [width-5,0], [0,depth-5], [width-5,depth-5]];
        turretLocs.forEach(([tx, tz]) => {
            for(let y=0; y<4; y++) {
                for(let dx=0; dx<5; dx++) for(let dz=0; dz<5; dz++) {
                    if((dx===0||dx===4) && (dz===0||dz===4)) continue;
                    push(tx+dx, roofY+y, tz+dz, cWall);
                }
            }
            for(let dx=1; dx<4; dx++) for(let dz=1; dz<4; dz++) {
                push(tx+dx, roofY+4, tz+dz, cRoof);
                push(tx+dx, roofY+5, tz+dz, cRoof);
            }
            push(tx+2, roofY+6, tz+2, cGold);
        });

        const drumR = 10;
        for(let y=0; y<5; y++) {
             for(let x=0; x<width; x++) {
                 for(let z=0; z<depth; z++) {
                     const dx = x - cx;
                     const dz = z - cz;
                     const dist = Math.sqrt(dx*dx + dz*dz);
                     if(dist < drumR && dist > drumR - 1.5) {
                         if (y > 1 && y < 4) {
                             const angle = Math.atan2(dz, dx);
                             if (Math.cos(angle * 8) > 0.5) {
                                 if (isNight) {
                                     pushGlass(x, roofY+y, z, cNightGlass);
                                     continue; 
                                 }
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

        const domeStart = roofY + 5;
        const domeHeight = 13; 
        let maxDomeY = 0;
        for(let y=0; y<domeHeight; y++) {
            const term = 100 - (y * 0.9)**2;
            if (term < 0) break;
            maxDomeY = y;
            const r = Math.sqrt(term); 
            for(let x=0; x<width; x++) {
                for(let z=0; z<depth; z++) {
                    const dx = x - cx;
                    const dz = z - cz;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    const thickness = (r < 7.5) ? 999 : 1.5;
                    if(dist <= r && dist >= r - thickness) {
                         const angle = Math.atan2(dz, dx);
                         const isRib = Math.cos(angle * 16) > 0.6;
                         push(x, domeStart+y, z, isRib ? cTrim : cRoof);
                    }
                }
            }
        }
        push(cx, domeStart+maxDomeY+1, cz, cGold);
        push(cx, domeStart+maxDomeY+2, cz, cGold);
        push(cx, domeStart+maxDomeY+3, cz, cGold);

        return { opaque, glass };
    }, [isNight]);

    return (
        <group position={[-13.5, 0, -2]}>
            {/* Opaque Structure */}
            <InstancedVoxelGroup data={opaque} />
            
            {/* Night Window Glow - rendered with specialized emissive component */}
            {glass.length > 0 && (
                <MosqueLights data={glass} color="#fef08a" />
            )}
            
            {isNight && (
                <>
                    {/* Main Hall Light (Lower, very intense) */}
                    <pointLight 
                        position={[12.5 * SCALE, 8 * SCALE, 12.5 * SCALE]} 
                        color="#facc15" 
                        intensity={10} 
                        distance={60} 
                        decay={1.0} 
                        castShadow
                    />
                    
                    {/* Dome Light (Upper, illuminates drum windows) */}
                    <pointLight 
                        position={[12.5 * SCALE, 22 * SCALE, 12.5 * SCALE]} 
                        color="#facc15" 
                        intensity={6} 
                        distance={40} 
                        decay={1.0} 
                    />

                    {/* Pavilion Light */}
                    <pointLight 
                        position={[12.5 * SCALE, 6 * SCALE, -4 * SCALE]} 
                        color="#facc15" 
                        intensity={3} 
                        distance={20} 
                        decay={1.5} 
                    />
                </>
            )}
        </group>
    );
}