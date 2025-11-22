import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

const SCALE = 0.125;

export const OrtakoyMosque: React.FC = () => {
    const voxelData = useMemo(() => {
        const data: VoxelData[] = [];
        // BASE HEIGHT ADJUSTED: 3 voxels (0.375) to match slightly raised mosque plaza
        const baseY = 3 * SCALE; 
        const width = 24; // 3 units

        // Main Base
        for(let x=0; x<width; x++) {
            for(let z=0; z<width; z++) {
                for(let y=0; y<16; y++) {
                    if(x>0 && x<width-1 && z>0 && z<width-1 && y<14) continue;
                    const isWindow = (y > 4 && y < 12) && (x % 8 !== 0) && (z % 8 !== 0);
                    const color = isWindow ? "#1e293b" : "#f1f5f9";
                    data.push({ position: [x*SCALE, baseY + y*SCALE, z*SCALE], color });
                }
            }
        }

        // Dome
        const centerX = (width*SCALE)/2 - (SCALE/2);
        const centerZ = (width*SCALE)/2 - (SCALE/2);
        const domeY = baseY + (16*SCALE);
        const radius = 1.6;
        
        const dSteps = 32;
        for(let x=-dSteps; x<=dSteps; x++) {
            for(let y=0; y<=dSteps; y++) {
                 for(let z=-dSteps; z<=dSteps; z++) {
                     const dx = x*SCALE;
                     const dy = y*SCALE;
                     const dz = z*SCALE;
                     const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                     if (dist < radius && dist > radius - 0.2) {
                         data.push({ position: [centerX + dx, domeY + dy, centerZ + dz], color: "#94a3b8" });
                     }
                 }
            }
        }

        // Minarets
        const addMinaret = (mx: number, mz: number) => {
            const h = 48; 
            for(let y=0; y<h; y++) {
                data.push({ position: [mx, baseY+y*SCALE, mz], color: "#f8fafc" });
                if (y === 24 || y === 36) {
                    for(let bx=-1; bx<=1; bx++) for(let bz=-1; bz<=1; bz++)
                        data.push({ position: [mx+bx*SCALE, baseY+y*SCALE, mz+bz*SCALE], color: "#cbd5e1" });
                }
            }
            // Cone
            data.push({ position: [mx, baseY+h*SCALE, mz], color: "#64748b" });
            data.push({ position: [mx, baseY+(h+1)*SCALE, mz], color: "#64748b" });
        };

        addMinaret(-0.5, -0.5);
        addMinaret((width*SCALE)+0.25, -0.5);
        return data;
    }, []);

    // Relocated to new European shoreline (x approx -13.5)
    return <group position={[-13.5, 0, -2]}><InstancedVoxelGroup data={voxelData} /></group>;
}
