import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.08; // Reduced scale for smaller dolphins

const getDolphinVoxels = (): VoxelData[] => {
    const voxels: VoxelData[] = [];
    const cBack = "#334155"; // Slate 700 (Dark Back)
    const cSide = "#64748b"; // Slate 500 (Mid-tone Flanks)
    const cBelly = "#f1f5f9"; // Slate 50 (White Belly)
    const cBeak = "#475569"; // Slate 600 (Beak)

    // Z is forward axis.
    // 0 = Tail end, 16 = Beak tip.
    
    // --- 1. MAIN BODY LOOP ---
    for (let z = 0; z <= 15; z++) {
        let ry = 0; // vertical radius
        let rx = 0; // horizontal radius
        let yOffset = 0;

        // Shape Profile (Anatomy of a Dolphin)
        if (z < 3) { 
             // Tail Stock (Narrow)
             rx = 0.5 + z*0.2; ry = 0.5 + z*0.2;
        } else if (z < 7) { 
             // Rear Body (Expanding)
             rx = 1.1 + (z-3)*0.15; ry = 1.1 + (z-3)*0.15;
        } else if (z < 11) { 
             // Mid Torso (Thickest)
             rx = 1.7; ry = 1.7;
        } else if (z < 14) { 
             // Head / Melon (Rounded & Tapering down)
             rx = 1.7 - (z-11)*0.35; ry = 1.7 - (z-11)*0.3;
             yOffset = 0.2; // Head sits slightly higher
        } else { 
             // Beak is handled manually
             continue; 
        }

        // Generate Ellipse slice
        for(let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
            for(let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
                // Ellipsoid equation check
                if ((x*x)/(rx*rx) + ((y-yOffset)*(y-yOffset))/(ry*ry) <= 1.0) {
                     let color = cSide;
                     
                     // Color banding based on height relative to radius
                     const relY = (y - yOffset) / ry;
                     
                     if (relY > 0.3) color = cBack;       // Top 30% is dark
                     else if (relY < -0.2) color = cBelly; // Bottom 40% is white
                     
                     voxels.push({position: [x*SCALE, y*SCALE, z*SCALE], color});
                }
            }
        }
    }

    // --- 2. APPENDAGES ---

    // Beak (Rostrum) - Forward protruding
    voxels.push({position: [0, 0.1*SCALE, 14*SCALE], color: cBeak});
    voxels.push({position: [0, 0.1*SCALE, 15*SCALE], color: cBeak});
    voxels.push({position: [0.5*SCALE, 0.1*SCALE, 14*SCALE], color: cBeak}); // Width
    voxels.push({position: [-0.5*SCALE, 0.1*SCALE, 14*SCALE], color: cBeak});

    // Dorsal Fin (Curved back) - Located around z=8 to 10
    const finZ = 8;
    voxels.push({position: [0, 2*SCALE, finZ*SCALE], color: cBack});
    voxels.push({position: [0, 2.8*SCALE, (finZ+0.5)*SCALE], color: cBack}); // Tip
    voxels.push({position: [0, 2.2*SCALE, (finZ+1)*SCALE], color: cBack});   // Front slope
    voxels.push({position: [0, 1.8*SCALE, (finZ-0.8)*SCALE], color: cBack}); // Rear slope base

    // Pectoral Fins (Side) - Located around z=10 (near head base)
    const pecZ = 10;
    // Left
    voxels.push({position: [1.8*SCALE, -0.5*SCALE, pecZ*SCALE], color: cSide});
    voxels.push({position: [2.5*SCALE, -0.8*SCALE, (pecZ-0.5)*SCALE], color: cSide}); // Swept back
    // Right
    voxels.push({position: [-1.8*SCALE, -0.5*SCALE, pecZ*SCALE], color: cSide});
    voxels.push({position: [-2.5*SCALE, -0.8*SCALE, (pecZ-0.5)*SCALE], color: cSide}); // Swept back

    // Flukes (Tail) - Horizontal fan at z=0
    for(let x=-3; x<=3; x++) {
        if (Math.abs(x) < 1) continue; // body handles center
        // Tapered wing shape
        if (Math.abs(x) === 3) {
             voxels.push({position: [x*SCALE, 0, -0.5*SCALE], color: cBack}); 
        } else {
             voxels.push({position: [x*SCALE, 0, 0], color: cBack});
             voxels.push({position: [x*SCALE, 0, -0.5*SCALE], color: cBack});
        }
    }

    return voxels;
};

const Dolphin: React.FC<{ data: VoxelData[], offset: number, xOff: number, zOff: number }> = ({ data, offset, xOff, zOff }) => {
    const ref = useRef<Group>(null);
    
    useFrame(({ clock }) => {
        if (!ref.current) return;
        // Slow down animation loop (was 3.0)
        const t = clock.getElapsedTime() * 1.5 + offset;
        
        // Intermittent Jumping logic
        const jumpPhase = Math.sin(t);
        
        let y = -2.0; // Deeper cruising depth (was -1.0)
        let rotX = 0;
        let rotZ = 0;
        
        // Jump when phase is high (Frequency reduced from 0.4 to 0.55)
        if (jumpPhase > 0.55) {
             const n = (jumpPhase - 0.55) / 0.45; // Normalize 0 to 1 for the jump duration
             
             // Parabolic arc: Start low, go high, end low
             // Peak height is roughly 0.8 units above water (-2.0 + 2.8)
             y = -2.0 + (Math.sin(n * Math.PI) * 2.8); 
             
             // Pitch rotation follows the trajectory slope
             rotX = -Math.cos(n * Math.PI) * 1.2;
             
             // Reset roll during jump for stability
             rotZ = 0;
        } else {
             y = -2.0;
             // Gentle swimming pitch
             rotX = Math.sin(t * 2) * 0.1; 
             // Rolling motion when swimming
             rotZ = Math.cos(t * 1.5) * 0.15;
        }

        ref.current.position.y = y;
        ref.current.rotation.x = rotX;
        ref.current.rotation.z = rotZ;
    });

    return (
        <group position={[xOff, 0, zOff]}>
            <group ref={ref}>
                 <InstancedVoxelGroup data={data} scale={SCALE} />
            </group>
        </group>
    );
};

// Pod supports Elliptical paths
interface PodProps {
    startAngle: number;
    xRadius: number; // Width of path
    zRadius: number; // Length of path
    speed: number;
    centerX?: number;
    centerZ?: number;
}

const DolphinPod: React.FC<PodProps> = ({ startAngle, xRadius, zRadius, speed, centerX = 0, centerZ = 0 }) => {
    const groupRef = useRef<Group>(null);
    const dolphinData = useMemo(() => getDolphinVoxels(), []);

    // Formation positions relative to pod center
    // Offsets tightened for smaller dolphin size
    const dolphins = [
        { offset: 0, x: 0, z: 1.0 },       // Leader slightly ahead
        { offset: 1.5, x: 1.2, z: -0.7 },  // Wingman Right
        { offset: 2.5, x: -1.2, z: -0.7 }, // Wingman Left
        { offset: 4.0, x: 0, z: -2.2 },    // Trailer
    ];

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.getElapsedTime() * speed + startAngle;
        
        // Elliptical Path
        const cx = Math.sin(t) * xRadius + centerX;
        const cz = Math.cos(t) * zRadius + centerZ;
        
        groupRef.current.position.x = cx;
        groupRef.current.position.z = cz;
        
        // Face tangent (Direction of travel)
        // dx/dt = cos(t) * xRadius
        // dz/dt = -sin(t) * zRadius
        const dx = Math.cos(t) * xRadius;
        const dz = -Math.sin(t) * zRadius;
        
        const angle = Math.atan2(dx, dz);
        groupRef.current.rotation.y = angle;
    });

    return (
        <group ref={groupRef}>
             {dolphins.map((d, i) => (
                 <Dolphin key={i} data={dolphinData} offset={d.offset} xOff={d.x} zOff={d.z} />
             ))}
        </group>
    );
};

export const Dolphins: React.FC = () => {
    return (
        <>
            {/* Pod 1: Central Safety Corridor */}
            <DolphinPod 
                startAngle={0} 
                xRadius={3} 
                zRadius={28} 
                speed={0.12} // Reduced speed (was 0.25)
                centerX={0} 
                centerZ={0} 
            />
            
            {/* Pod 2: Asian Coast Safety Channel */}
            <DolphinPod 
                startAngle={3.5} 
                xRadius={2.0} 
                zRadius={14} 
                speed={0.1} // Reduced speed (was 0.2)
                centerX={12} 
                centerZ={0} 
            />
        </>
    );
};