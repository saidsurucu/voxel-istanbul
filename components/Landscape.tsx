import React, { useMemo } from 'react';
import { InstancedVoxelGroup } from './VoxelElements';
import { VoxelData } from '../types';

interface SideProps {
  isAsia: boolean;
}

const SCALE = 0.125;

export const LandscapeSide: React.FC<SideProps> = ({ isAsia }) => {
  const voxelData = useMemo(() => {
    const data: VoxelData[] = [];
    
    // Limits in "Voxel Units" (0.125 world units)
    const Z_RANGE = 192; // +/- 24 units
    const X_DEPTH = 144; // 18 units deep

    // Palette
    const walls = ['#f1f5f9', '#e2e8f0', '#fef3c7', '#ffedd5', '#f3f4f6'];
    const roofs = ['#b91c1c', '#9f1239', '#ea580c', '#c2410c', '#7f1d1d'];

    for (let zIndex = -Z_RANGE; zIndex < Z_RANGE; zIndex++) {
      for (let xIndex = 0; xIndex < X_DEPTH; xIndex++) {
        
        // Calculate World Positions
        // Water ends at +/- 18 units (144 voxels) - Widened 1.5x from original 96
        // Start land exactly at water edge
        const startOffset = 144;
        const xOffset = isAsia ? startOffset : -startOffset; 
        const xDir = isAsia ? 1 : -1;
        
        const worldX = (xOffset + (xIndex * xDir)) * SCALE;
        const worldZ = zIndex * SCALE;

        // --- PRECISE EXCLUSION ZONES (Prevent Clipping Only) ---
        // Updated exclusion coordinates for wider strait
        const isMosqueLocation = !isAsia && 
                                 worldX > -21.5 && worldX < -17.5 &&
                                 worldZ > -2.5 && worldZ < 1.5;

        // Updated exclusion for new tower positions (Towers at +/- 21)
        const isBridgeLocation = Math.abs(worldZ - (-5)) < 2.0 && 
                                 Math.abs(worldX) > 17.0 && Math.abs(worldX) < 22.0;

        const isRestricted = isMosqueLocation || isBridgeLocation;

        // --- Terrain Height Logic ---
        const dist = xIndex; // Distance from shore in voxels
        const coastLimit = 24; // First 3 units are perfectly flat

        // LOWERED BASE HEIGHT: 2 voxels (0.25 units) is just above water
        let terrainHeightVoxels = 2; 

        if (dist >= coastLimit) {
            // Hill generation starts AFTER the coast limit
            const slope = Math.pow((dist - 10) * 0.04, 1.2) * 5.0; 
            const largeNoise = Math.sin(zIndex * 0.02) * 8.0; 
            const smallNoise = Math.cos(xIndex * 0.1) * 3.0;
            
            // Base hill height lowered to match new coast (from 8 to 2)
            const hillHeight = Math.floor(2 + slope + largeNoise + smallNoise);
            
            // Ensure hill is never lower than the coast
            terrainHeightVoxels = Math.max(terrainHeightVoxels, hillHeight);
        }

        // Surgical Flattening for Mosque (Slightly raised plaza, 3 voxels)
        if (isMosqueLocation) {
            terrainHeightVoxels = 3; 
        }

        const surfaceY = terrainHeightVoxels * SCALE;

        // Zoning
        const isWaterfront = !isRestricted && dist < 18; // Promenade area
        const isRoad = !isRestricted && dist >= 18 && dist < 30; // Road behind yalis
        const isUrban = !isRestricted && dist >= 30;

        // --- Ground Render ---
        let groundColor = '#334155'; // Dark rocky base
        
        if (isMosqueLocation) {
            groundColor = '#cbd5e1'; // Paved plaza under mosque
        } else if (isRoad) {
            groundColor = '#475569'; // Asphalt
        } else if (isWaterfront) {
             // Seaside promenade - Concrete
             groundColor = '#cbd5e1';
        } else {
             // General grassy terrain
             groundColor = Math.random() > 0.4 ? '#65a30d' : '#4d7c0f';
        }

        data.push({
            position: [worldX, surfaceY, worldZ],
            color: groundColor
        });
        
        // Edge walls (vertical drop to water/void)
        if (xIndex === 0) {
             // Wall goes deeper now relative to surface
             for(let d=1; d<16; d++) {
                 data.push({
                     position: [worldX, surfaceY - (d*SCALE), worldZ],
                     color: "#334155" // Dark quay wall
                 });
             }
        }

        // --- Objects ---

        // 2. Vegetation (Only on hills)
        if (isUrban && Math.random() > 0.75) { 
             // TREE
             if (!isRestricted && zIndex % 8 === 0 && xIndex % 8 === 0) {
                 const treeH = 10 + Math.floor(Math.random() * 6);
                 
                 // Trunk
                 for(let t=0; t<treeH; t++) {
                     data.push({
                         position: [worldX, surfaceY + SCALE + (t*SCALE), worldZ],
                         color: "#451a03"
                     });
                 }
                 
                 // Leaves (Sphere)
                 const radius = 5 + Math.random() * 2;
                 const leafColor = isAsia ? '#166534' : '#15803d';
                 const centerX = worldX;
                 const centerY = surfaceY + SCALE + (treeH*SCALE);
                 const centerZ = worldZ;

                 for(let lx = -radius; lx <= radius; lx++) {
                     for(let ly = -radius; ly <= radius; ly++) {
                         for(let lz = -radius; lz <= radius; lz++) {
                             if (lx*lx + ly*ly + lz*lz < radius*radius) {
                                 if(Math.random() > 0.4) {
                                     data.push({
                                         position: [centerX + lx*SCALE, centerY + ly*SCALE, centerZ + lz*SCALE],
                                         color: Math.random() > 0.8 ? '#4d7c0f' : leafColor
                                     });
                                 }
                             }
                         }
                     }
                 }
             }
        }
      }
    }
    return data;
  }, [isAsia]);

  return <InstancedVoxelGroup data={voxelData} />;
};

export const BosphorusLandscape: React.FC = () => {
  return (
    <>
      <LandscapeSide isAsia={false} />
      <LandscapeSide isAsia={true} />
    </>
  );
};