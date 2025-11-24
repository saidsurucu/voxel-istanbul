
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

// High-intensity emissive mesh for night lights (Ferry Windows)
const FerryLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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
                emissiveIntensity={3} 
                toneMapped={false} 
            />
        </instancedMesh>
    );
};

interface FerryProps {
  isNight: boolean;
}

export const Ferry: React.FC<FerryProps> = ({ isNight }) => {
  const ferryRef = useRef<Group>(null);
  
  const { opaque, glass } = useMemo(() => {
      const opaque: VoxelData[] = [];
      const glass: VoxelData[] = [];
      
      // PALETTE based on Reference Image (Caddebostan Ferry)
      const cGreen = "#15803d";  // Dark Green Hull (Waterline)
      const cWhite = "#f8fafc";  // Superstructure
      const cDeck = "#cbd5e1";   // Light Grey Deck floor
      const cWindow = "#1e293b"; // Dark Windows (Day)
      const cNightGlass = "#fef08a"; // Yellow Light (Night)
      const cYellow = "#facc15"; // Masts / Trim / Railings
      const cOrange = "#ea580c"; // Lifebuoys
      const cBlack = "#0f172a";  // Funnel Top / Radar
      const cRed = "#dc2626";    // Funnel Logo / Flag

      const length = 64; // 8 units long (approx 50-60m scale relative to yalis)
      const widthMax = 16; // 2 units wide
      
      // Helper to push voxels
      const pushOpaque = (x:number, y:number, z:number, c:string) => {
          opaque.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };
      const pushGlass = (x:number, y:number, z:number, c:string) => {
          glass.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };

      for(let z=0; z<length; z++) {
          // Center Z to 0
          const zPos = z - length/2;
          const zNorm = zPos / (length/2);
          
          // Shape: Classic Ferry Taper (Pointed bow/stern, wide middle)
          let width = widthMax;
          // Sharper taper at ends
          if (Math.abs(zNorm) > 0.6) {
              width = widthMax * (1 - Math.pow((Math.abs(zNorm) - 0.6) * 2.5, 1.5)); 
          }
          if (width < 2) width = 2; // Minimum width at tip
          
          const wInt = Math.floor(width);
          const halfW = Math.floor(wInt/2);

          for(let x=-halfW; x<=halfW; x++) {
              
              // 1. GREEN HULL (Waterline & Bottom)
              // Layers 0-1
              pushOpaque(x, 0, zPos, cGreen);
              pushOpaque(x, 1, zPos, cGreen);

              // 2. WHITE MAIN HULL / LOWER DECK
              // Layers 2-5
              if (x === -halfW || x === halfW) {
                   // Outer Hull Wall
                   pushOpaque(x, 2, zPos, cWhite);
                   pushOpaque(x, 3, zPos, cWhite); // Name area
                   pushOpaque(x, 4, zPos, cWhite); 
                   pushOpaque(x, 5, zPos, cWhite);
              } else {
                   // Interior Floor (Deck)
                   if (x%2===0 && z%2===0) pushOpaque(x, 2, zPos, cDeck); 
                   // Ceiling of lower deck
                   pushOpaque(x, 6, zPos, cWhite);
              }

              // 3. PASSENGER CABIN (Middle Layer)
              // Layers 6-10
              // Outer Wall of cabin
              if (x === -halfW || x === halfW) {
                   // Render wall 6-10
                   for(let y=6; y<=10; y++) {
                        let isWindow = false;
                        let finalColor = cWhite;
                        
                        // Window Logic
                        if (y>=8 && y<=9 && (z%4!==0)) {
                            isWindow = true;
                        }
                        
                        // Lifebuoys on railing (Layer 7) - overrides window/wall
                        if (y===7 && z%12===0 && Math.abs(zNorm) < 0.6) {
                            finalColor = cOrange;
                            isWindow = false;
                        }

                        if (isWindow) {
                            if (isNight) pushGlass(x, y, zPos, cNightGlass);
                            else pushOpaque(x, y, zPos, cWindow);
                        } else {
                            pushOpaque(x, y, zPos, finalColor);
                        }
                   }
              } else {
                   // Roof of main cabin (Floor of upper deck)
                   pushOpaque(x, 11, zPos, cWhite); 
              }

              // 4. UPPER DECK & BRIDGE
              // Layers 12-16
              // Slightly inset from the main hull width to create a walkway
              const upperInset = 2;
              
              // Only draw if within inset width
              if (Math.abs(x) <= halfW - upperInset) {
                   
                   const isBridge = zPos > 14; // Front part is bridge
                   const isOpenDeck = zPos < -10; // Back part is open
                   
                   if (Math.abs(x) === halfW - upperInset) {
                        // Upper Deck Railing / Wall
                        if (isOpenDeck) {
                             // Open deck railing
                             pushOpaque(x, 12, zPos, cYellow); 
                        } else {
                             // Enclosed Upper Cabin Wall
                             for(let y=12; y<=16; y++) {
                                 let col = cWhite;
                                 let isWindow = false;
                                 
                                 // Windows
                                 if (y>=13 && y<=14 && (z%3!==0)) {
                                     isWindow = true;
                                 }

                                 if (isWindow) {
                                     if (isNight) pushGlass(x, y, zPos, cNightGlass);
                                     else pushOpaque(x, y, zPos, cWindow);
                                 } else {
                                     pushOpaque(x, y, zPos, col);
                                 }
                             }
                        }
                   } else {
                        // Inside Upper Area
                        if (isOpenDeck) {
                             pushOpaque(x, 11, zPos, cDeck); // Floor
                             // Benches?
                             if (x===0 && z%4===0) pushOpaque(x, 12, zPos, cOrange);
                        } else {
                             // Roof of Upper Cabin
                             pushOpaque(x, 17, zPos, cWhite);
                             
                             // Rear Wall of Cabin (Closing the open deck)
                             if (zPos === -10) {
                                  for(let y=12; y<=16; y++) {
                                      // Solid wall to ensure no gaps
                                      pushOpaque(x, y, zPos, cWhite);
                                  }
                             }
                        }
                   }
              }
          }
      }

      // DETAILS & SUPERSTRUCTURE

      // 1. SMOKESTACK (Funnel)
      // Center, approx z=0
      for(let y=17; y<25; y++) {
           let col = cWhite;
           if (y > 22) col = cBlack; // Black top rim
           
           // 4x4 block rounded
           for(let sx=-2; sx<=2; sx++) {
               for(let sz=-2; sz<=2; sz++) {
                   if (Math.abs(sx)+Math.abs(sz) < 4) {
                       // Red Logo Band
                       if (y>=19 && y<=21 && (sx===2 || sx===-2)) pushOpaque(sx, y, sz, cRed);
                       else pushOpaque(sx, y, sz, col);
                   }
               }
           }
      }

      // 2. MASTS (Yellow)
      const addMast = (mz: number, height: number) => {
           for(let y=17; y<17+height; y++) {
               pushOpaque(0, y, mz, cYellow);
               // Crossbars
               if (y === 17+height-4) {
                   pushOpaque(-1, y, mz, cYellow);
                   pushOpaque(1, y, mz, cYellow);
               }
           }
      };
      addMast(20, 20); // Fore Mast (Tall)
      addMast(-10, 12); // Aft Mast (Shorter) - Moved from -12 to -10 to connect with hull

      // 3. RADAR / BRIDGE DETAILS
      pushOpaque(0, 18, 24, cBlack); 
      pushOpaque(-1, 18, 24, cBlack);
      pushOpaque(1, 18, 24, cBlack);

      // 4. TURKISH FLAG (Stern)
      const flagZ = -length/2 + 3;
      for(let y=5; y<16; y++) pushOpaque(0, y, flagZ, "#94a3b8"); // Pole
      // Red Flag with simple white dot
      for(let fy=12; fy<15; fy++) {
          for(let fz=1; fz<5; fz++) {
               pushOpaque(0, fy, flagZ - fz, cRed);
               if (fy===13 && fz===2) pushOpaque(0, fy, flagZ - fz, cWhite);
          }
      }
      
      // 5. NAME "CADDEBOSTAN" (Abstract black strip on bow)
      pushOpaque(3, 6, length/2 - 6, cBlack);
      pushOpaque(4, 6, length/2 - 7, cBlack);
      pushOpaque(-3, 6, length/2 - 6, cBlack);
      pushOpaque(-4, 6, length/2 - 7, cBlack);

      return { opaque, glass };
  }, [isNight]);

  // Animation Loop
  useFrame((state) => {
    if (ferryRef.current) {
      const t = state.clock.getElapsedTime();
      
      // TRAFFIC LANE UPDATE:
      // Path stays between X = 4.5 and X = 7.5
      // Maiden's Tower moved to X = 14, so we have more space.
      
      const speed = 0.08;
      
      // Long Loop on Asian Side
      const z = Math.sin(t * speed) * 20;
      
      // Moved X base further out to 6.0 (from 3.5) for wider strait
      const xBase = 6.0;
      const xVar = Math.cos(t * speed * 2) * 1.5; 
      const x = xBase + xVar; 
      
      ferryRef.current.position.z = z;
      ferryRef.current.position.x = x;
      
      // Calculate tangent for rotation
      const dz = 20 * speed * Math.cos(t * speed);
      const dx = -1.5 * speed * 2 * Math.sin(t * speed * 2);
      
      ferryRef.current.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group ref={ferryRef} scale={[0.64, 0.64, 0.64]}>
        <InstancedVoxelGroup data={opaque} />
        
        {/* Night Window Glow - rendered separately for effect */}
        {glass.length > 0 && (
           <FerryLights data={glass} color="#facc15" />
        )}

        {/* Interior Lights (Attached to group so they move with the ship) */}
        {isNight && (
          <>
             <pointLight position={[0, 8 * SCALE, 15 * SCALE]} color="#facc15" intensity={2} distance={10} decay={2} />
             <pointLight position={[0, 8 * SCALE, -5 * SCALE]} color="#facc15" intensity={2} distance={10} decay={2} />
          </>
        )}
    </group>
  );
};