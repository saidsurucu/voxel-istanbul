import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

export const Ferry: React.FC = () => {
  const ferryRef = useRef<Group>(null);
  
  const voxelData = useMemo(() => {
      const data: VoxelData[] = [];
      
      // PALETTE based on Reference Image (Caddebostan Ferry)
      const cGreen = "#15803d";  // Dark Green Hull (Waterline)
      const cWhite = "#f8fafc";  // Superstructure
      const cDeck = "#cbd5e1";   // Light Grey Deck floor
      const cWindow = "#1e293b"; // Dark Windows
      const cYellow = "#facc15"; // Masts / Trim / Railings
      const cOrange = "#ea580c"; // Lifebuoys
      const cBlack = "#0f172a";  // Funnel Top / Radar
      const cRed = "#dc2626";    // Funnel Logo / Flag

      const length = 64; // 8 units long (approx 50-60m scale relative to yalis)
      const widthMax = 16; // 2 units wide
      
      // Helper to push voxels
      const push = (x:number, y:number, z:number, c:string) => {
          data.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
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
              push(x, 0, zPos, cGreen);
              push(x, 1, zPos, cGreen);

              // 2. WHITE MAIN HULL / LOWER DECK
              // Layers 2-5
              if (x === -halfW || x === halfW) {
                   // Outer Hull Wall
                   push(x, 2, zPos, cWhite);
                   push(x, 3, zPos, cWhite); // Name area
                   push(x, 4, zPos, cWhite); 
                   push(x, 5, zPos, cWhite);
              } else {
                   // Interior Floor (Deck)
                   if (x%2===0 && z%2===0) push(x, 2, zPos, cDeck); 
                   // Ceiling of lower deck
                   push(x, 6, zPos, cWhite);
              }

              // 3. PASSENGER CABIN (Middle Layer)
              // Layers 6-10
              // Outer Wall of cabin
              if (x === -halfW || x === halfW) {
                   // Render wall 6-10
                   for(let y=6; y<=10; y++) {
                        let finalColor = cWhite;
                        if (y>=8 && y<=9 && (z%4!==0)) finalColor = cWindow;
                        
                        // Lifebuoys on railing (Layer 7)
                        if (y===7 && z%12===0 && Math.abs(zNorm) < 0.6) finalColor = cOrange;

                        push(x, y, zPos, finalColor);
                   }
              } else {
                   // Roof of main cabin (Floor of upper deck)
                   push(x, 11, zPos, cWhite); 
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
                             push(x, 12, zPos, cYellow); 
                        } else {
                             // Enclosed Upper Cabin Wall
                             for(let y=12; y<=16; y++) {
                                 let col = cWhite;
                                 // Windows
                                 if (y>=13 && y<=14 && (z%3!==0)) col = cWindow;
                                 push(x, y, zPos, col);
                             }
                        }
                   } else {
                        // Inside Upper Area
                        if (isOpenDeck) {
                             push(x, 11, zPos, cDeck); // Floor
                             // Benches?
                             if (x===0 && z%4===0) push(x, 12, zPos, cOrange);
                        } else {
                             // Roof of Upper Cabin
                             push(x, 17, zPos, cWhite);
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
                       if (y>=19 && y<=21 && (sx===2 || sx===-2)) push(sx, y, sz, cRed);
                       else push(sx, y, sz, col);
                   }
               }
           }
      }

      // 2. MASTS (Yellow)
      const addMast = (mz: number, height: number) => {
           for(let y=17; y<17+height; y++) {
               push(0, y, mz, cYellow);
               // Crossbars
               if (y === 17+height-4) {
                   push(-1, y, mz, cYellow);
                   push(1, y, mz, cYellow);
               }
           }
      };
      addMast(20, 20); // Fore Mast (Tall)
      addMast(-12, 12); // Aft Mast (Shorter)

      // 3. RADAR / BRIDGE DETAILS
      push(0, 18, 24, cBlack); 
      push(-1, 18, 24, cBlack);
      push(1, 18, 24, cBlack);

      // 4. TURKISH FLAG (Stern)
      const flagZ = -length/2 + 3;
      for(let y=5; y<16; y++) push(0, y, flagZ, "#94a3b8"); // Pole
      // Red Flag with simple white dot
      for(let fy=12; fy<15; fy++) {
          for(let fz=1; fz<5; fz++) {
               push(0, fy, flagZ - fz, cRed);
               if (fy===13 && fz===2) push(0, fy, flagZ - fz, cWhite);
          }
      }
      
      // 5. NAME "CADDEBOSTAN" (Abstract black strip on bow)
      push(3, 6, length/2 - 6, cBlack);
      push(4, 6, length/2 - 7, cBlack);
      push(-3, 6, length/2 - 6, cBlack);
      push(-4, 6, length/2 - 7, cBlack);

      return data;
  }, []);

  // Animation Loop
  useFrame((state) => {
    if (ferryRef.current) {
      const t = state.clock.getElapsedTime();
      // Figure-8 / Oval path in the middle of Bosphorus
      // Path: Z varies largely (approx -30 to 30), X varies slightly (-5 to 5) to simulate crossing/turning
      
      const speed = 0.08;
      // Parametric path
      const z = Math.sin(t * speed) * 25;
      // Reduced amplitude to avoid collision with Maiden's Tower (at x=8)
      const x = Math.cos(t * speed * 2) * 4.5; 
      
      ferryRef.current.position.z = z;
      ferryRef.current.position.x = x;
      
      // Calculate tangent for rotation
      const dz = 25 * speed * Math.cos(t * speed);
      // Derivative of 4.5 * cos(2wt) is -9 * sin(2wt)
      const dx = -9 * speed * Math.sin(t * speed * 2);
      
      ferryRef.current.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group ref={ferryRef} scale={[0.64, 0.64, 0.64]}>
        <InstancedVoxelGroup data={voxelData} />
    </group>
  );
};
