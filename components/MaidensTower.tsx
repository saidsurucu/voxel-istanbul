import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

// --- High Fidelity Waving Flag Component ---
const WavingFlag: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  
  // High Resolution for the flag content (Micro-voxels)
  const F_SCALE = 0.025; // Very small voxels for detail
  const WIDTH_VOXELS = 60; // 1.5 units width
  const HEIGHT_VOXELS = 40; // 1.0 unit height
  
  // Precompute Flag Texture (Crescent & Star)
  const flagData = useMemo(() => {
      const data: {x: number, y: number, color: string, baseZ: number}[] = [];
      const RED = "#E30A17";
      const WHITE = "#FFFFFF";

      for(let x = 0; x < WIDTH_VOXELS; x++) {
          for(let y = 0; y < HEIGHT_VOXELS; y++) {
              // Normalized coordinates (0 to 1)
              const u = x / WIDTH_VOXELS;
              const v = y / HEIGHT_VOXELS;
              
              // Aspect Ratio Adjustment for geometry
              const aspect = WIDTH_VOXELS / HEIGHT_VOXELS;
              const px = u * aspect;
              const py = v;

              let isWhite = false;

              // --- Turkish Flag Geometry Math ---
              
              // 1. Outer Crescent (White Circle)
              const outerCx = 0.45 * aspect;
              const outerCy = 0.5;
              const outerR = 0.25;
              const dOuter = Math.sqrt((px - outerCx)**2 + (py - outerCy)**2);

              // 2. Inner Crescent (Red Circle intersection)
              const innerCx = 0.53 * aspect;
              const innerCy = 0.5;
              const innerR = 0.20;
              const dInner = Math.sqrt((px - innerCx)**2 + (py - innerCy)**2);

              if (dOuter < outerR && dInner >= innerR) {
                  isWhite = true;
              }

              // 3. Star (Simplified as a small circle/diamond for voxel clarity)
              const starCx = 0.72 * aspect;
              const starCy = 0.5;
              const starR = 0.08; // Radius
              const dStar = Math.sqrt((px - starCx)**2 + (py - starCy)**2);
              
              if (dStar < starR) {
                  isWhite = true; 
              }

              data.push({
                  x: x * F_SCALE,
                  y: y * F_SCALE,
                  baseZ: 0,
                  color: isWhite ? WHITE : RED
              });
          }
      }
      return data;
  }, []);

  // Set colors once
  useLayoutEffect(() => {
    if (meshRef.current) {
       flagData.forEach((d, i) => {
           meshRef.current!.setColorAt(i, new Color(d.color));
       });
       if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [flagData]);

  // Animate Wave
  useFrame(({ clock }) => {
      if (!meshRef.current) return;
      const t = clock.elapsedTime * 4.0; // Wind speed
      
      let i = 0;
      flagData.forEach((d) => {
          // Wind Simulation
          // x is distance from the pole (flag attached at x=0)
          const dist = d.x;
          
          // Wave amplitude increases with distance from pole
          const amplitude = 0.05 + (dist * 0.2); 
          
          // Sine wave moving along X
          const waveZ = Math.sin(dist * 8.0 - t) * amplitude;
          
          // Secondary flutter
          const flutter = Math.sin(dist * 20.0 - t * 2.0) * (amplitude * 0.2);

          dummy.position.set(d.x, d.y, waveZ + flutter);
          dummy.scale.set(F_SCALE, F_SCALE, F_SCALE);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i++, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={position}>
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, flagData.length]}
            frustumCulled={false}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial roughness={0.5} metalness={0.1} />
        </instancedMesh>
    </group>
  );
};

// --- Emissive Lights Component for Tower Windows ---
const TowerLights: React.FC<{ data: VoxelData[], color: string }> = ({ data, color }) => {
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


// --- Main Tower Component ---
interface MaidensTowerProps {
  isNight: boolean;
}

export const MaidensTower: React.FC<MaidensTowerProps> = ({ isNight }) => {
  const { opaque, glass } = useMemo(() => {
    const opaque: VoxelData[] = [];
    const glass: VoxelData[] = [];
    
    const push = (x: number, y: number, z: number, c: string) => opaque.push({position: [x,y,z], color: c});
    const pushGlass = (x: number, y: number, z: number, c: string) => glass.push({position: [x,y,z], color: c});

    // Palette matching the reference image
    const cRock = "#44403c";      
    const cPlatform = "#e5e5e5";  
    const cWall = "#d6d3d1";      
    const cWhite = "#f8fafc";     
    const cRoof = "#ef4444";      
    const cDome = "#334155";      
    const cRail = "#1e293b";  
    const cWindow = "#1e293b"; // Day color for windows (Dark Slate)
    const cNightGlass = "#fef08a"; // Frosted Glass (Yellow-200) for night glow
    
    // --- RESCALED DIMENSIONS (Smaller) ---
    const pWidth = 2.2; 
    const pDepth = 2.2;
    const baseY = 0; 

    // 1. PLATFORM & ROCKS
    for(let x = -pWidth; x <= pWidth; x += SCALE) {
        for(let z = -pDepth; z <= pDepth; z += SCALE) {
            const cornerDist = Math.abs(x) + Math.abs(z);
            const maxDist = 3.0; 

            if (cornerDist < maxDist) {
                push(x, baseY, z, cPlatform);
                const isEdge = cornerDist > 2.8 || Math.abs(x) > pWidth - 0.2 || Math.abs(z) > pDepth - 0.2;
                if (isEdge) {
                    if (Math.random() > 0.3) {
                        push(x, baseY + SCALE, z, cRock);
                        push(x, baseY - SCALE, z, cRock);
                    }
                } else {
                    push(x, baseY - SCALE, z, cRock);
                }
            }
        }
    }

    // 2. PIER 
    for(let x = -pWidth - 1.5; x < -pWidth + 0.5; x+=SCALE) {
        for(let z = -0.4; z < 0.4; z+=SCALE) {
            if (x < -pWidth) {
                push(x, baseY, z, cPlatform);
                push(x, baseY - SCALE, z, cRock);
            }
        }
    }

    // 3. FORTIFICATION WALLS
    const wallH = 0.8; 
    const wInset = 1.8; 
    for(let x = -wInset; x <= wInset; x+=SCALE) {
        for(let z = -wInset; z <= wInset; z+=SCALE) {
            const isWall = Math.abs(x) > wInset - SCALE || Math.abs(z) > wInset - SCALE;
            if (isWall) {
                for(let y = 0; y < wallH; y+=SCALE) push(x, baseY + y, z, cWall);
                if ((Math.abs(x) + Math.abs(z)) % 0.5 < 0.25) push(x, baseY + wallH, z, cWall);
            }
        }
    }

    // 4. SIDE BUILDING
    const sbH = 0.8; 
    for(let x = -wInset + SCALE; x < -0.2; x+=SCALE) {
        for(let z = 0.2; z < wInset - SCALE; z+=SCALE) {
            for(let y=0; y<sbH; y+=SCALE) push(x, baseY+y, z, cWhite);
            const roofH = 0.5;
            for(let y=0; y<roofH; y+=SCALE) {
                 const slope = y * 0.8;
                 if (x > -wInset + SCALE + slope && x < -0.2 - slope &&
                     z > 0.2 + slope && z < wInset - SCALE - slope) {
                     push(x, baseY+sbH+y, z, cRoof);
                 }
            }
        }
    }

    // 5. MAIN TOWER BASE
    const tBaseW = 0.7; 
    const tBaseH = 1.8;
    for(let y=0; y<tBaseH; y+=SCALE) {
        for(let x=-tBaseW; x<=tBaseW; x+=SCALE) {
            for(let z=-tBaseW; z<=tBaseW; z+=SCALE) {
                push(x, baseY + y, z, cWall);
            }
        }
    }

    // 6. UPPER TOWER (Lantern)
    const tUpY = baseY + tBaseH;
    const tUpH = 1.2;
    const tRad = 0.6;
    const balcRad = 0.9;
    
    // Balcony Floor
    for(let x=-balcRad; x<=balcRad; x+=SCALE) {
        for(let z=-balcRad; z<=balcRad; z+=SCALE) {
            if (x*x + z*z < balcRad*balcRad && x*x + z*z > tRad*tRad) {
                push(x, tUpY, z, cPlatform);
                const dist = Math.sqrt(x*x + z*z);
                if (dist > balcRad - 0.1) push(x, tUpY + SCALE, z, cRail);
            }
        }
    }

    // Lantern Body
    for(let y=0; y<tUpH; y+=SCALE) {
        for(let x=-tRad; x<=tRad; x+=SCALE) {
            for(let z=-tRad; z<=tRad; z+=SCALE) {
                // Check cylinder bounds
                if (x*x + z*z < tRad*tRad) {
                    
                    // HOLLOW CORE Check
                    // Only draw walls approx 1-2 voxels thick
                    const dist = Math.sqrt(x*x + z*z);
                    if (dist < tRad - (SCALE * 1.5)) continue; 

                    let color = cWhite;
                    let isWindow = false;
                    
                    // Window Band: y roughly centered in Lantern height
                    if (y > 0.4 && y < 0.8) {
                         // Windows face cardinal directions
                         // Z-facing windows
                         if (Math.abs(x) < 0.25 && Math.abs(z) > 0.3) isWindow = true;
                         // X-facing windows
                         if (Math.abs(z) < 0.25 && Math.abs(x) > 0.3) isWindow = true;
                    }

                    if (isWindow) {
                        if (isNight) {
                            // AT NIGHT: Render as frosted glass voxels.
                            // These will be rendered with TowerLights for Bloom.
                            pushGlass(x, tUpY + y, z, cNightGlass);
                            continue; 
                        } else {
                            // AT DAY: Render dark glass (opaque)
                            color = cWindow;
                        }
                    }
                    
                    push(x, tUpY + y, z, color);
                }
            }
        }
    }

    // 7. DOME
    const domeY = tUpY + tUpH;
    const domeRad = 0.65;
    const domeH = 1.0;
    for(let x=-domeRad; x<=domeRad; x+=SCALE) {
        for(let z=-domeRad; z<=domeRad; z+=SCALE) {
            const dist = Math.sqrt(x*x + z*z);
            if (dist > domeRad - 0.1 && dist < domeRad) push(x, domeY, z, cRail);
        }
    }
    for(let y=0; y<domeH; y+=SCALE) {
        const progress = y / domeH;
        const r = domeRad * (Math.cos(progress * Math.PI / 2) * 0.8 + 0.2);
        for(let x=-r; x<=r; x+=SCALE) {
            for(let z=-r; z<=r; z+=SCALE) {
                if (x*x + z*z < r*r) push(x, domeY + y, z, cDome);
            }
        }
    }

    // 8. POLE (Calculated for Flag Placement)
    const poleY = domeY + domeH;
    const poleH = 2.0;
    for(let y=0; y<poleH; y+=SCALE) {
        push(0, poleY + y, 0, "#f8fafc");
    }
    
    return { opaque, glass };
  }, [isNight]);

  // Flag attach height calculation:
  // BaseY(0) + BaseH(1.8) + UpH(1.2) + DomeH(1.0) + PoleH(2.0) = 6.0
  const flagHeight = 5.8; 
  
  // Light positioned inside the hollow lantern
  const lanternHeight = 1.8 + 0.6; // tUpY (1.8) + Half Lantern Height (0.6) = 2.4

  return (
    <group position={[8, 0, 8]}>
        <InstancedVoxelGroup data={opaque} />

        {/* Night Window Glow - rendered separately for bloom effect */}
        {glass.length > 0 && (
            <TowerLights data={glass} color="#fef08a" />
        )}
        
        {/* Attach the new waving flag at the top of the pole */}
        <WavingFlag position={[0, flagHeight, 0]} />

        {/* Night Light Source - Inside the Hollow Lantern */}
        {isNight && (
           <pointLight 
             position={[0, lanternHeight, 0]} 
             color="#facc15" 
             intensity={5} 
             distance={15} 
             decay={1.5} 
             castShadow
             shadow-bias={-0.0001}
           />
        )}
    </group>
  );
};
