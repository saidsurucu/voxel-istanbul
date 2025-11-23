import React, { useMemo, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Color } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';
import { enhanceShaderLighting } from '../utils/enhanceShaderLighting';

const SCALE = 0.125;

// Constants extracted for shared use
const BRIDGE_LENGTH = 64;
const DECK_Y = 8;
const BRIDGE_Z = -5;
const TOWER_X = 14;

// --- Car Component ---
interface CarProps {
  initialX: number;
  laneZ: number;
  direction: number; // 1 or -1
  speed: number;
  color: string;
  isNight: boolean;
}

const Car: React.FC<CarProps> = ({ initialX, laneZ, direction, speed, color, isNight }) => {
  const groupRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Move car
    groupRef.current.position.x += speed * direction * delta * 2.0;

    // Wrap around logic
    const limit = BRIDGE_LENGTH / 2 + 2;
    if (groupRef.current.position.x > limit) {
      groupRef.current.position.x = -limit;
    } else if (groupRef.current.position.x < -limit) {
      groupRef.current.position.x = limit;
    }
  });

  // Material setup to match scene lighting
  const handleBeforeCompile = useCallback((shader: any) => {
    enhanceShaderLighting(shader, {
      aoColor: new Color('#0f172a'),
      hemisphereColor: new Color('#334155'),
      irradianceColor: new Color('#f1f5f9'),
      radianceColor: new Color('#e0f2fe'),
      aoPower: 4.0,
      sunIntensity: 1.2,
      hardcodeValues: false
    });
  }, []);

  // Dimensions
  // Body: 5 voxels long (0.625), 3 voxels wide (0.375), 1 voxel high (0.125)
  // Positioned at deckY + SCALE (which is the voxel layer just above deck)
  // We center the group on the lane.

  const cHeadlight = "#fef08a";
  const cTaillight = "#dc2626";

  // Determine front and back based on direction
  // Direction 1 (+X): Front is +X side.
  // Direction -1 (-X): Front is -X side.
  const frontX = direction > 0 ? 0.25 : -0.25;
  const backX = direction > 0 ? -0.25 : 0.25;

  return (
    <group ref={groupRef} position={[initialX, DECK_Y + SCALE, BRIDGE_Z + laneZ]}>
      {/* Car Body (Simplified as one box for performance/smoothness) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5 * SCALE, 1 * SCALE, 3 * SCALE]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8} 
          metalness={0.1}
          onBeforeCompile={handleBeforeCompile}
        />
      </mesh>

      {/* Lights (Only visible/emissive at night, but geometry always there) */}
      {isNight && (
        <>
          {/* Headlights (Front) */}
          <mesh position={[frontX, 0, -0.1]}>
             <boxGeometry args={[SCALE, SCALE, SCALE]} />
             <meshStandardMaterial color={cHeadlight} emissive={cHeadlight} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <mesh position={[frontX, 0, 0.1]}>
             <boxGeometry args={[SCALE, SCALE, SCALE]} />
             <meshStandardMaterial color={cHeadlight} emissive={cHeadlight} emissiveIntensity={2} toneMapped={false} />
          </mesh>

          {/* Taillights (Back) */}
          <mesh position={[backX, 0, -0.1]}>
             <boxGeometry args={[SCALE, SCALE, SCALE]} />
             <meshStandardMaterial color={cTaillight} emissive={cTaillight} emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh position={[backX, 0, 0.1]}>
             <boxGeometry args={[SCALE, SCALE, SCALE]} />
             <meshStandardMaterial color={cTaillight} emissive={cTaillight} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
};

// --- Traffic Controller ---
const Traffic: React.FC<{ isNight: boolean }> = ({ isNight }) => {
  const cars = useMemo(() => {
    const generatedCars = [];
    const colors = ["#f1f5f9", "#1e293b", "#ef4444", "#3b82f6", "#cbd5e1"]; // White, Black, Red, Blue, Grey
    
    // Generate static set of cars
    // Lanes: 0, 1, 2 for each direction
    // Direction 1: z > 0 (Right side of bridge looking +X?) - Let's use logic from original file
    // Original: const laneZ = (0.6 + (lane * 0.8)) * direction;
    // Direction determines side.
    
    for (let i = 0; i < 24; i++) {
        const lane = Math.floor(Math.random() * 3); // 0, 1, 2
        const direction = Math.random() > 0.5 ? 1 : -1;
        const laneZ = (0.6 + (lane * 0.8)) * direction;
        
        // Random Position along bridge
        const initialX = (Math.random() - 0.5) * BRIDGE_LENGTH;
        const speed = 2.0 + Math.random() * 2.0; // Random speed
        const color = colors[Math.floor(Math.random() * colors.length)];

        generatedCars.push({
            id: i,
            initialX,
            laneZ,
            direction,
            speed,
            color
        });
    }
    return generatedCars;
  }, []);

  return (
    <group>
      {cars.map(car => (
        <Car 
           key={car.id} 
           {...car} 
           isNight={isNight} 
        />
      ))}
    </group>
  );
};

// --- Static Bridge Structure ---
interface BridgeProps {
  isNight: boolean;
}

export const Bridge: React.FC<BridgeProps> = ({ isNight }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    
    // --- DIMENSIONS ---
    const towerH = 28;      // Height of towers
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

    const push = (x: number, y: number, z: number, color: string) => {
        data.push({ position: [x, y, z], color });
    };

    // 1. TOWERS (The Majestic Pylons)
    const createTower = (tx: number) => {
        const legOffset = 2.0; 

        // Concrete Base
        for (let y = -2; y < 1; y += SCALE) {
             for (let dx = -0.5; dx <= 0.5; dx += SCALE) {
                 for (let dz = -3; dz <= 3; dz += SCALE) {
                     push(tx + dx, y, BRIDGE_Z + dz, cConcrete);
                 }
             }
        }

        // Steel Legs
        for (let zOffset of [-legOffset, legOffset]) {
            for (let y = 1; y < towerH; y += SCALE) {
                for (let dx = -SCALE; dx <= SCALE; dx+=SCALE) {
                    for (let dz = -SCALE; dz <= SCALE; dz+=SCALE) {
                        push(tx + dx, y, BRIDGE_Z + zOffset + dz, cSteel);
                    }
                }
            }
        }

        // Cross Bracing
        const braceLevels = [DECK_Y + 2, DECK_Y + 8, DECK_Y + 14, towerH - 2];
        braceLevels.forEach(yLevel => {
            for (let z = BRIDGE_Z - legOffset; z <= BRIDGE_Z + legOffset; z += SCALE) {
                push(tx, yLevel, z, cDarkSteel);
                push(tx, yLevel - SCALE, z, cDarkSteel);
            }
        });

        // Diagonal Bracing
        const makeX = (yBottom: number, yTop: number) => {
             const h = yTop - yBottom;
             const w = legOffset * 2;
             const steps = 30;
             for(let i=0; i<steps; i++) {
                 const t = i/steps;
                 const y = yBottom + t * h;
                 const z1 = BRIDGE_Z - legOffset + t * w; 
                 const z2 = BRIDGE_Z + legOffset - t * w; 
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
            push(tx, towerH + SCALE, BRIDGE_Z - legOffset, cRedLight);
            push(tx, towerH + SCALE, BRIDGE_Z + legOffset, cRedLight);
        }
    };

    createTower(-TOWER_X);
    createTower(TOWER_X);

    // 2. DECK
    for (let x = -BRIDGE_LENGTH/2; x <= BRIDGE_LENGTH/2; x += SCALE) {
        
        if (Math.abs(Math.abs(x) - TOWER_X) < 0.5) continue;

        // -- TRUSS STRUCTURE --
        const trussDepth = 1.0;
        const trussY = DECK_Y - trussDepth;
        push(x, trussY, BRIDGE_Z - deckWidth/2 + 0.5, cDarkSteel);
        push(x, trussY, BRIDGE_Z + deckWidth/2 - 0.5, cDarkSteel);
        
        if (Math.floor(x) === x) {
             for(let y=trussY; y<DECK_Y; y+=SCALE) {
                 push(x, y, BRIDGE_Z - deckWidth/2 + 0.5, cDarkSteel);
                 push(x, y, BRIDGE_Z + deckWidth/2 - 0.5, cDarkSteel);
             }
             for(let z = -deckWidth/2; z <= deckWidth/2; z+=SCALE) {
                 if (Math.random() > 0.5) push(x, trussY, BRIDGE_Z + z, cDarkSteel);
             }
        }

        // -- ROAD DECK --
        for (let z = -deckWidth/2; z <= deckWidth/2; z += SCALE) {
            const zRel = z; 
            
            // Side Walkways
            if (Math.abs(zRel) > deckWidth/2 - 0.6) {
                push(x, DECK_Y, BRIDGE_Z + z, cConcrete); 
                if (Math.abs(zRel) > deckWidth/2 - 0.2) {
                    push(x, DECK_Y + SCALE, BRIDGE_Z + z, cSteel);
                }
                continue;
            }

            // Median Strip
            if (Math.abs(zRel) < 0.2) {
                push(x, DECK_Y + SCALE/2, BRIDGE_Z + z, cConcrete);
                // Lamp posts
                if (Math.abs(x % 8.0) < SCALE) {
                    for(let h=0; h<3; h++) push(x, DECK_Y + 0.5 + h*SCALE, BRIDGE_Z + z, cSteel);
                    if (isNight) {
                         push(x, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, "#fef3c7");
                         push(x+SCALE, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, "#fef3c7");
                         push(x-SCALE, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, "#fef3c7");
                    }
                }
                continue;
            }

            // Asphalt Lanes
            let surfaceColor = cAsphalt;
            const isLaneLine = Math.abs(Math.abs(zRel) - 1.2) < 0.1;
            if (isLaneLine && Math.abs(x % 2.0) < 1.0) {
                 surfaceColor = cLine;
            }
            push(x, DECK_Y, BRIDGE_Z + z, surfaceColor);
        }
    }

    // 3. SUSPENSION CABLES
    const cableStartH = towerH - 1;
    const sag = cableStartH - (DECK_Y + 3); 
    const cableZ = BRIDGE_Z - deckWidth/2 + 0.2; 
    const cableZ2 = BRIDGE_Z + deckWidth/2 - 0.2;

    for (let x = -TOWER_X; x <= TOWER_X; x += SCALE/2) { 
        const progress = x / TOWER_X; 
        const y = (DECK_Y + 3) + (progress * progress) * sag;
        
        const cableColor = isNight ? cLedBlue : cCable;

        // Main Cables
        push(x, y, cableZ, cableColor);
        push(x, y, cableZ2, cableColor);

        // Vertical Suspenders
        if (Math.abs(x % 1.5) < SCALE/1.5) {
             for (let vy = DECK_Y + SCALE; vy < y; vy += SCALE) {
                 let vColor = cCable;
                 if (isNight) {
                     vColor = (vy > (y + DECK_Y)/2) ? cLedPurple : cLedBlue;
                 }
                 push(x, vy, cableZ, vColor); 
                 push(x, vy, cableZ2, vColor);
             }
        }
    }

    // Back Spans
    const backSpanLen = 12;
    for (let i = 0; i < backSpanLen / SCALE; i++) {
         const dx = i * SCALE;
         const xLeft = -TOWER_X - dx;
         const xRight = TOWER_X + dx;
         const progress = i / (backSpanLen / SCALE);
         const y = cableStartH - (progress * (cableStartH - DECK_Y));
         const cableColor = isNight ? cLedBlue : cCable;
         push(xLeft, y, cableZ, cableColor);
         push(xLeft, y, cableZ2, cableColor);
         push(xRight, y, cableZ, cableColor);
         push(xRight, y, cableZ2, cableColor);
    }

    return data;
  }, [isNight]);

  return (
    <group>
        {/* Static Structure */}
        <InstancedVoxelGroup 
            data={voxelData} 
            castShadow={true} 
        />
        
        {/* Animated Traffic */}
        <Traffic isNight={isNight} />
    </group>
  );
};
