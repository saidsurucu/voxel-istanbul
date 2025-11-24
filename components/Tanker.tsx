
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

// Emissive Lights for the Tanker (Bridge/Mast)
const TankerLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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

interface TankerProps {
  isNight: boolean;
}

export const Tanker: React.FC<TankerProps> = ({ isNight }) => {
  const groupRef = useRef<Group>(null);
  
  const { opaque, glass } = useMemo(() => {
      const opaque: VoxelData[] = [];
      const glass: VoxelData[] = [];
      
      const push = (x: number, y: number, z: number, c: string) => {
          opaque.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };
      const pushGlass = (x: number, y: number, z: number, c: string) => {
          glass.push({position: [x*SCALE, y*SCALE, z*SCALE], color: c});
      };

      // Palette based on "Aether" Tanker image
      const cRed = "#9f1239";     // Deep Red (Waterline/Bottom)
      const cBlack = "#0f172a";   // Black Hull
      const cDeck = "#78350f";    // Rusty Red/Brown Deck
      const cPipes = "#94a3b8";   // Silver Pipes
      const cWhite = "#f1f5f9";   // Bridge/Superstructure
      const cWindow = "#1e293b";
      const cNightGlass = "#facc15";
      const cCrane = "#fbbf24";   // Yellow Cranes

      // Dimensions (Voxels)
      const length = 160; // 20 units long (Huge)
      const widthMax = 22; // ~2.75 units wide
      const hullHeight = 12;

      for(let z=0; z<length; z++) {
          const zPos = z - length/2;
          const zNorm = zPos / (length/2); // -1 to 1

          // Shape: Long parallel midbody, tapered bow, blunt stern
          let currentWidth = widthMax;
          
          // Bow Taper (Front 20%)
          if (zPos > length/2 - 32) {
              const taper = (zPos - (length/2 - 32)) / 32;
              currentWidth = widthMax * (1 - Math.pow(taper, 2));
          }
          // Stern Taper (Back 10%)
          else if (zPos < -length/2 + 16) {
              const taper = ((-length/2 + 16) - zPos) / 16;
              currentWidth = widthMax * (1 - Math.pow(taper, 3) * 0.5); // Blunt
          }

          if (currentWidth < 2) currentWidth = 2;
          const halfW = Math.floor(currentWidth/2);

          for(let x=-halfW; x<=halfW; x++) {
              // 1. HULL
              // Waterline / Underwater (Red)
              push(x, 0, zPos, cRed);
              push(x, 1, zPos, cRed);
              push(x, 2, zPos, cRed);
              
              // Top Hull (Black)
              // Hollow logic: Include stern face (-length/2) to close gap
              const isOuter = x === -halfW || x === halfW || zPos === Math.floor(length/2)-1 || zPos === -Math.floor(length/2);
              
              // Fill deck level
              push(x, hullHeight, zPos, cDeck);

              // Sides
              if (isOuter) {
                  for(let y=3; y<=hullHeight; y++) {
                      push(x, y, zPos, cBlack);
                      // Ship name placeholder?
                      if (zPos === length/2 - 10 && y === hullHeight-2 && Math.abs(x)>halfW-1) {
                          push(x, y, zPos, cWhite); 
                      }
                  }
              }
          }
      }

      // 2. PIPES & DECK DETAILS
      // Running along the center
      for(let z=-length/2 + 25; z < length/2 - 20; z+=4) {
          // Central Pipe spine
          push(0, hullHeight+1, z, cPipes);
          push(0, hullHeight+1, z+1, cPipes);
          
          // Cross pipes
          if (z % 16 === 0) {
              for(let px=-6; px<=6; px++) push(px, hullHeight+1, z, cPipes);
          }
      }

      // 3. SUPERSTRUCTURE (Bridge at the Stern)
      const bridgeZStart = -length/2 + 2;
      const bridgeLength = 20;
      const bridgeWidth = 18;
      
      for(let y=hullHeight+1; y<hullHeight+14; y++) {
          for(let bz=bridgeZStart; bz<bridgeZStart+bridgeLength; bz++) {
              for(let bx=-bridgeWidth/2; bx<=bridgeWidth/2; bx++) {
                  
                  // Taper the tower slightly
                  const yRel = y - (hullHeight+1);
                  const currentBW = bridgeWidth - (yRel * 0.5);
                  if (Math.abs(bx) > currentBW/2) continue;

                  // Close top (Roof)
                  const isRoof = yRel === 12;
                  const isWall = Math.abs(bx) >= currentBW/2 - 1 || bz === bridgeZStart || bz === bridgeZStart+bridgeLength-1 || isRoof;
                  
                  // Wings of the bridge (Flying Bridge)
                  const isWing = yRel === 8 && Math.abs(bx) > currentBW/2 - 4 && Math.abs(bx) < currentBW/2 + 3;
                  
                  if (isWall || isWing) {
                       let col = cWhite;
                       let isWin = false;

                       // Windows on top floor
                       if (yRel === 8 && !isRoof) {
                           if (bz === bridgeZStart+bridgeLength-1 || Math.abs(bx) > currentBW/2 - 1) {
                               isWin = true;
                           }
                           // Wing floor
                           if (Math.abs(bx) > currentBW/2) col = cWhite; 
                       }
                       
                       // Funnel integration (Rear)
                       if (bz < bridgeZStart + 6 && Math.abs(bx) < 4 && yRel > 6) {
                           col = cRed; // Funnel color
                           isWin = false;
                       }

                       if (isWin) {
                           if (isNight) pushGlass(bx, y, bz, cNightGlass);
                           else push(bx, y, bz, cWindow);
                       } else {
                           push(bx, y, bz, col);
                       }
                  } else if (yRel > 9 && bz < bridgeZStart + 6 && Math.abs(bx) < 4) {
                       // Funnel Top
                       push(bx, y, bz, cRed); 
                  }
              }
          }
      }

      // 4. CRANE / MAST (Midship)
      const mastZ = 0;
      for(let y=hullHeight; y<hullHeight+12; y++) {
          push(0, y, mastZ, cCrane);
      }
      // Boom
      for(let z=0; z<8; z++) push(0, hullHeight+10, mastZ+z, cCrane);

      return { opaque, glass };
  }, [isNight]);

  // Animation Loop - Slow, heavy movement straight down the channel
  useFrame((state) => {
      if (!groupRef.current) return;
      const t = state.clock.getElapsedTime();
      
      const speed = 2.0; 
      const pathLength = 160; 
      
      // Linear Movement along Z
      // Wrap around from -80 to 80
      let z = ((t * speed) % pathLength) - (pathLength/2);
      
      // Position: Centered in the widened European channel at X = -5
      groupRef.current.position.set(-5, 0, -z); 
      
      // FIX: Rotate 180 degrees so it faces the direction of travel (Negative Z)
      groupRef.current.rotation.y = Math.PI;

      // Slight roll
      groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.02;
      // Slight pitch
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.01;
  });

  return (
    <group ref={groupRef}>
        <InstancedVoxelGroup data={opaque} />
        {glass.length > 0 && <TankerLights data={glass} color="#facc15" />}
        
        {isNight && (
            <>
                {/* Mast Light */}
                <pointLight position={[0, 4, 0]} intensity={1} distance={20} color="#fbbf24" decay={2} />
                {/* Stern Light */}
                <pointLight position={[0, 4, -10]} intensity={1} distance={20} color="#ffffff" decay={2} />
            </>
        )}
    </group>
  );
};
