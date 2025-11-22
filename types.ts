export interface VoxelPosition {
  x: number;
  y: number;
  z: number;
}

export interface VoxelBlockProps {
  position: [number, number, number];
  color: string;
  opacity?: number;
  transparent?: boolean;
}

export interface VoxelData {
  position: [number, number, number];
  color: string;
}

export enum SceneMode {
  DAY = 'DAY',
  NIGHT = 'NIGHT'
}