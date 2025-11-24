import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Cloud } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { WaterBody } from './Water';
import { BosphorusLandscape } from './Landscape';
import { WaterfrontMansions } from './YaliHouses';
import { MaidensTower } from './MaidensTower';
import { Seagulls } from './Seagulls';
import { Bridge } from './Bridge';
import { OrtakoyMosque } from './OrtakoyMosque';
import { Ferry } from './Ferry';
import { FishingBoat } from './FishingBoat';
import { Tanker } from './Tanker';
import { Apartments } from './Apartments';
import { Dolphins } from './Dolphins';
import { SceneMode } from '../types';

interface BosphorusSceneProps {
  mode: SceneMode;
}

export const BosphorusScene: React.FC<BosphorusSceneProps> = ({ mode }) => {
  const isNight = mode === SceneMode.NIGHT;

  return (
    <Canvas 
      camera={{ position: [20, 20, 20], fov: 45, far: 250 }} 
      gl={{ 
        antialias: false, 
        stencil: false, 
        depth: true,
        powerPreference: "high-performance"
      }}
      dpr={[1, 1.25]} // Limit pixel ratio for performance
    >
      {/* Controls */}
      <OrbitControls 
        autoRotate={false}
        maxPolarAngle={Math.PI / 2.1} 
        enableDamping
        maxDistance={80} // Increased slightly for wider view
        minDistance={10}
      />

      {/* Scene Lights */}
      <hemisphereLight 
         color={isNight ? "#1e1b4b" : "#e0f2fe"} 
         groundColor={isNight ? "#0f172a" : "#1e293b"} 
         intensity={isNight ? 0.3 : 0.8} 
      />

      <ambientLight intensity={isNight ? 0.2 : 0.4} />
      
      {isNight ? (
        <>
           <directionalLight 
             position={[-10, 15, -10]} 
             intensity={2.0} 
             color="#c7d2fe" 
             castShadow={false}
           />
           
           <pointLight position={[10, 10, 10]} intensity={0.5} color="#fbbf24" distance={40} decay={2} castShadow={false} />

           <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
           <color attach="background" args={['#0f172a']} />
           {/* Fog removed for night mode */}
        </>
      ) : (
        <>
           <directionalLight 
             position={[30, 30, 10]} 
             intensity={2.0} 
             color="#fff7ed" 
             castShadow={false}
           />
           <Sky sunPosition={[100, 20, 100]} turbidity={0.4} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
           <Cloud opacity={0.5} speed={0.2} bounds={[20, 2, 2]} segments={10} position={[0, 15, -15]} color="#ecfeff" />
           {/* Day Fog: Starts closer (30) for atmosphere, extends to horizon (250) */}
           <fog attach="fog" args={['#e0f2fe', 30, 250]} />
        </>
      )}

      {/* Post Processing - Optimized for Performance */}
      <Suspense fallback={null}>
        <EffectComposer disableNormalPass={true} multisampling={0}>
           <Bloom 
              luminanceThreshold={isNight ? 0.85 : 0.95} 
              mipmapBlur 
              intensity={isNight ? 0.6 : 0.2} 
              radius={0.4}
              levels={2} // Reduced levels to 2 for performance
           />
        </EffectComposer>
      </Suspense>

      {/* Content */}
      <group position={[0, -2, 0]}>
        <WaterBody isNight={isNight} />
        
        <BosphorusLandscape />
        
        <WaterfrontMansions isAsia={false} isNight={isNight} />
        <WaterfrontMansions isAsia={true} isNight={isNight} />
        
        <Apartments isNight={isNight} />

        <Bridge isNight={isNight} />
        <OrtakoyMosque isNight={isNight} />
        <MaidensTower isNight={isNight} />
        
        <Tanker isNight={isNight} />
        <Ferry isNight={isNight} />
        <FishingBoat isNight={isNight} />
        <Seagulls />
        <Dolphins />
      </group>
    </Canvas>
  );
};