import React, { useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Color, InstancedMesh, Object3D } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';
import { enhanceShaderLighting } from '../utils/enhanceShaderLighting';

const SCALE = 0.125;

// Constants extracted for shared use
// Increased Bridge Length from 64 to 96 (1.5x)
const BRIDGE_LENGTH = 96;
const DECK_Y = 8;
const BRIDGE_Z = -5;
// Increased Tower X position from 14 to 21 (1.5x)
const TOWER_X = 21;

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

  const cHeadlight = "#fef08a";
  const cTaillight = "#dc2626";

  const frontX = direction > 0 ? 0.25 : -0.25;
  const backX = direction > 0 ? -0.25 : 0.25;

  return (
    <group ref={groupRef} position={[initialX, DECK_Y + SCALE, BRIDGE_Z + laneZ]}>
      {/* Car Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5 * SCALE, 1 * SCALE, 3 * SCALE]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8} 
          metalness={0.1}
          onBeforeCompile={handleBeforeCompile}
        />
      </mesh>

      {/* Lights (Only visible/emissive at night) */}
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
    const colors = ["#f1f5f9", "#1e293b", "#ef4444", "#3b82f6", "#cbd5e1"]; 
    
    // Increased number of cars for longer bridge
    for (let i = 0; i < 36; i++) {
        const lane = Math.floor(Math.random() * 3); 
        const direction = Math.random() > 0.5 ? 1 : -1;
        const laneZ = (0.6 + (lane * 0.8)) * direction;
        
        const initialX = (Math.random() - 0.5) * BRIDGE_LENGTH;
        const speed = 2.0 + Math.random() * 2.0; 
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
        <Car key={car.id} {...car} isNight={isNight} />
      ))}
    </group>
  );
};

// --- Emissive Lights Component ---
const BridgeLightGroup: React.FC<{ data: VoxelData[], color: string, intensity: number }> = ({ data, color, intensity }) => {
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
                emissiveIntensity={intensity} 
                toneMapped={false} 
            />
        </instancedMesh>
    );
};

// --- Static Bridge Structure ---
interface BridgeProps {
  isNight: boolean;
}

export const Bridge: React.FC<BridgeProps> = ({ isNight }) => {
  // Separate Structural voxels from Light voxels
  const { structure, redLights, blueLights, purpleLights, yellowLights } = useMemo(() => {
    const structure: VoxelData[] = [];
    const redLights: VoxelData[] = [];
    const blueLights: VoxelData[] = [];
    const purpleLights: VoxelData[] = [];
    const yellowLights: VoxelData[] = [];
    
    // --- DIMENSIONS ---
    const towerH = 28;      
    const deckWidth = 4.5;  

    // --- PALETTE ---
    const cSteel = "#94a3b8";      
    const cDarkSteel = "#475569";  
    const cConcrete = "#cbd5e1";   
    const cAsphalt = "#1e293b";    
    const cLine = "#f8fafc";       
    const cCable = "#cbd5e1";      
    
    const cRedLight = "#ef4444";   
    const cLedBlue = "#3b82f6";    
    const cLedPurple = "#a855f7";  
    const cLampNight = "#fef3c7";

    const pushStructure = (x: number, y: number, z: number, color: string) => {
        structure.push({ position: [x, y, z], color });
    };

    const pushLight = (x: number, y: number, z: number, color: string, type: 'red'|'blue'|'purple'|'yellow') => {
        const v: VoxelData = { position: [x, y, z], color };
        if (type === 'red') redLights.push(v);
        else if (type === 'blue') blueLights.push(v);
        else if (type === 'purple') purpleLights.push(v);
        else if (type === 'yellow') yellowLights.push(v);
    };

    // 1. TOWERS (The Majestic Pylons)
    const createTower = (tx: number) => {
        const legOffset = 2.0; 

        // Concrete Base
        for (let y = -2; y < 1; y += SCALE) {
             for (let dx = -0.5; dx <= 0.5; dx += SCALE) {
                 for (let dz = -3; dz <= 3; dz += SCALE) {
                     pushStructure(tx + dx, y, BRIDGE_Z + dz, cConcrete);
                 }
             }
        }

        // Steel Legs
        for (let zOffset of [-legOffset, legOffset]) {
            for (let y = 1; y < towerH; y += SCALE) {
                for (let dx = -SCALE; dx <= SCALE; dx+=SCALE) {
                    for (let dz = -SCALE; dz <= SCALE; dz+=SCALE) {
                        pushStructure(tx + dx, y, BRIDGE_Z + zOffset + dz, cSteel);
                    }
                }
            }
        }

        // Cross Bracing
        const braceLevels = [DECK_Y + 2, DECK_Y + 8, DECK_Y + 14, towerH - 2];
        braceLevels.forEach(yLevel => {
            for (let z = BRIDGE_Z - legOffset; z <= BRIDGE_Z + legOffset; z += SCALE) {
                pushStructure(tx, yLevel, z, cDarkSteel);
                pushStructure(tx, yLevel - SCALE, z, cDarkSteel);
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
                    pushStructure(tx, y, z1, cDarkSteel);
                    pushStructure(tx, y, z2, cDarkSteel);
                 }
             }
        };

        makeX(braceLevels[0], braceLevels[1]);
        makeX(braceLevels[1], braceLevels[2]);

        // Top Beacons
        if (isNight) {
            pushLight(tx, towerH + SCALE, BRIDGE_Z - legOffset, cRedLight, 'red');
            pushLight(tx, towerH + SCALE, BRIDGE_Z + legOffset, cRedLight, 'red');
        }
    };

    createTower(-TOWER_X);
    createTower(TOWER_X);

    // 2. DECK
    for (let x = -BRIDGE_LENGTH/2; x <= BRIDGE_LENGTH/2; x += SCALE) {
        
        // -- TRUSS STRUCTURE --
        const trussDepth = 1.0;
        const trussY = DECK_Y - trussDepth;
        pushStructure(x, trussY, BRIDGE_Z - deckWidth/2 + 0.5, cDarkSteel);
        pushStructure(x, trussY, BRIDGE_Z + deckWidth/2 - 0.5, cDarkSteel);
        
        if (Math.floor(x) === x) {
             for(let y=trussY; y<DECK_Y; y+=SCALE) {
                 pushStructure(x, y, BRIDGE_Z - deckWidth/2 + 0.5, cDarkSteel);
                 pushStructure(x, y, BRIDGE_Z + deckWidth/2 - 0.5, cDarkSteel);
             }
             for(let z = -deckWidth/2; z <= deckWidth/2; z+=SCALE) {
                 if (Math.random() > 0.5) pushStructure(x, trussY, BRIDGE_Z + z, cDarkSteel);
             }
        }

        // -- ROAD DECK --
        for (let z = -deckWidth/2; z <= deckWidth/2; z += SCALE) {
            const zRel = z; 
            
            // Side Walkways
            if (Math.abs(zRel) > deckWidth/2 - 0.6) {
                pushStructure(x, DECK_Y, BRIDGE_Z + z, cConcrete); 
                if (Math.abs(zRel) > deckWidth/2 - 0.2) {
                    pushStructure(x, DECK_Y + SCALE, BRIDGE_Z + z, cSteel);
                }
                continue;
            }

            // Median Strip
            if (Math.abs(zRel) < 0.2) {
                pushStructure(x, DECK_Y + SCALE/2, BRIDGE_Z + z, cConcrete);
                // Lamp posts
                if (Math.abs(x % 8.0) < SCALE) {
                    for(let h=0; h<3; h++) pushStructure(x, DECK_Y + 0.5 + h*SCALE, BRIDGE_Z + z, cSteel);
                    if (isNight) {
                         pushLight(x, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, cLampNight, 'yellow');
                         pushLight(x+SCALE, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, cLampNight, 'yellow');
                         pushLight(x-SCALE, DECK_Y + 0.5 + 3*SCALE, BRIDGE_Z + z, cLampNight, 'yellow');
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
            pushStructure(x, DECK_Y, BRIDGE_Z + z, surfaceColor);
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
        
        // Main Cables
        if (isNight) {
            pushLight(x, y, cableZ, cLedBlue, 'blue');
            pushLight(x, y, cableZ2, cLedBlue, 'blue');
        } else {
            pushStructure(x, y, cableZ, cCable);
            pushStructure(x, y, cableZ2, cCable);
        }

        // Vertical Suspenders
        if (Math.abs(x % 1.5) < SCALE/1.5) {
             for (let vy = DECK_Y + SCALE; vy < y; vy += SCALE) {
                 if (isNight) {
                     // Gradient effect logic: Upper half purple, lower half blue
                     const isPurple = (vy > (y + DECK_Y)/2);
                     if (isPurple) {
                         pushLight(x, vy, cableZ, cLedPurple, 'purple');
                         pushLight(x, vy, cableZ2, cLedPurple, 'purple');
                     } else {
                         pushLight(x, vy, cableZ, cLedBlue, 'blue');
                         pushLight(x, vy, cableZ2, cLedBlue, 'blue');
                     }
                 } else {
                     pushStructure(x, vy, cableZ, cCable); 
                     pushStructure(x, vy, cableZ2, cCable);
                 }
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
         
         if (isNight) {
             pushLight(xLeft, y, cableZ, cLedBlue, 'blue');
             pushLight(xLeft, y, cableZ2, cLedBlue, 'blue');
             pushLight(xRight, y, cableZ, cLedBlue, 'blue');
             pushLight(xRight, y, cableZ2, cLedBlue, 'blue');
         } else {
             pushStructure(xLeft, y, cableZ, cCable);
             pushStructure(xLeft, y, cableZ2, cCable);
             pushStructure(xRight, y, cableZ, cCable);
             pushStructure(xRight, y, cableZ2, cCable);
         }
    }

    return { structure, redLights, blueLights, purpleLights, yellowLights };
  }, [isNight]);

  return (
    <group>
        {/* Static Structure */}
        <InstancedVoxelGroup 
            data={structure} 
            castShadow={false} 
        />
        
        {/* Emissive Night Lights */}
        {isNight && (
            <>
                <BridgeLightGroup data={redLights} color="#ef4444" intensity={3} />
                <BridgeLightGroup data={blueLights} color="#3b82f6" intensity={2.5} />
                <BridgeLightGroup data={purpleLights} color="#a855f7" intensity={2.5} />
                <BridgeLightGroup data={yellowLights} color="#fef3c7" intensity={2} />
            </>
        )}

        {/* Animated Traffic */}
        <Traffic isNight={isNight} />
    </group>
  );
};