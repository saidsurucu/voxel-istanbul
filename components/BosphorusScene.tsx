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
import { Apartments } from './Apartments';
import { SceneMode } from '../types';

interface BosphorusSceneProps {
  mode: SceneMode;
}

export const BosphorusScene: React.FC<BosphorusSceneProps> = ({ mode }) => {
  const isNight = mode === SceneMode.NIGHT;

  return (
    <Canvas 
      shadows 
      camera={{ position: [20, 20, 20], fov: 45 }}
      gl={{ antialias: false, stencil: false, depth: true }}
      dpr={[1, 1.5]} // Optimization for performance
    >
      {/* Controls */}
      <OrbitControls 
        autoRotate 
        autoRotateSpeed={0.5} 
        maxPolarAngle={Math.PI / 2.1} 
        enableDamping
        maxDistance={60}
        minDistance={10}
      />

      {/* Scene Lights */}
      {/* Replaced HDRI with Hemisphere Light for ambient fill */}
      <hemisphereLight 
         color={isNight ? "#1e1b4b" : "#e0f2fe"} 
         groundColor={isNight ? "#0f172a" : "#1e293b"} 
         intensity={isNight ? 0.3 : 0.8} 
      />

      {/* Ambient light */}
      <ambientLight intensity={isNight ? 0.2 : 0.4} />
      
      {isNight ? (
        <>
           {/* MOONLIGHT: Directional, Cool Blue */}
           <directionalLight 
             position={[-10, 15, -10]} 
             intensity={2.0} 
             color="#c7d2fe" 
             castShadow
             shadow-bias={-0.0001}
           />
           
           {/* Warm city glow */}
           <pointLight position={[10, 10, 10]} intensity={0.5} color="#fbbf24" distance={40} decay={2} />

           <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
           {/* Deep Midnight Blue Background */}
           <color attach="background" args={['#0f172a']} />
           <fog attach="fog" args={['#0f172a', 10, 80]} />
        </>
      ) : (
        <>
           <directionalLight 
             position={[30, 30, 10]} 
             intensity={2.0} 
             castShadow 
             shadow-mapSize={[2048, 2048]}
             color="#fff7ed" 
           />
           <Sky sunPosition={[100, 20, 100]} turbidity={0.4} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
           <Cloud opacity={0.5} speed={0.2} bounds={[20, 2, 2]} segments={20} position={[0, 15, -15]} color="#ecfeff" />
           <fog attach="fog" args={['#e0f2fe', 20, 120]} />
        </>
      )}

      {/* Post Processing */}
      <Suspense fallback={null}>
        <EffectComposer disableNormalPass={false} multisampling={0}>
           <Bloom 
              luminanceThreshold={isNight ? 0.85 : 1} 
              mipmapBlur 
              intensity={isNight ? 0.8 : 0.5} 
              radius={0.6} 
           />
        </EffectComposer>
      </Suspense>

      {/* Content */}
      <group position={[0, -2, 0]}>
        <WaterBody isNight={isNight} />
        <BosphorusLandscape />
        
        <WaterfrontMansions isAsia={false} />
        <WaterfrontMansions isAsia={true} />
        
        <Apartments />

        <Bridge />
        <OrtakoyMosque isNight={isNight} />
        <MaidensTower isNight={isNight} />
        
        <Ferry />
        <Seagulls />
      </group>
    </Canvas>
  );
};