import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Cloud } from '@react-three/drei';
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
    <Canvas shadows camera={{ position: [20, 20, 20], fov: 45 }}>
      {/* Controls */}
      <OrbitControls 
        autoRotate 
        autoRotateSpeed={0.3} 
        maxPolarAngle={Math.PI / 2.1} // Prevent going under water
        enableDamping
        maxDistance={50}
        minDistance={10}
      />

      {/* Lighting */}
      <ambientLight intensity={isNight ? 0.1 : 0.5} />
      
      {isNight ? (
        <>
           <pointLight position={[10, 15, 0]} intensity={0.8} color="#e0f2fe" distance={30} />
           <pointLight position={[-10, 15, 5]} intensity={0.5} color="#e0f2fe" distance={30} />
           {/* Bridge Lights */}
           <pointLight position={[0, 10, -5]} intensity={1} color="#f59e0b" distance={20} />
        </>
      ) : (
        <>
           <directionalLight 
             position={[20, 30, 10]} 
             intensity={1.2} 
             castShadow 
             shadow-mapSize={[1024, 1024]} 
             color="#fff7ed" // Warm sunlight
           />
           <pointLight position={[-10, 10, -10]} intensity={0.4} color="#bae6fd" />
        </>
      )}

      {/* Environment */}
      {isNight ? (
        <>
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <color attach="background" args={['#020617']} />
          <fog attach="fog" args={['#020617', 10, 70]} />
        </>
      ) : (
        <>
          <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
          <Cloud opacity={0.6} speed={0.2} bounds={[20, 2, 2]} segments={20} position={[0, 15, -15]} color="#ecfeff" />
          <Cloud opacity={0.4} speed={0.1} bounds={[10, 2, 2]} segments={10} position={[10, 12, 10]} />
          <fog attach="fog" args={['#e0f2fe', 15, 80]} />
        </>
      )}

      {/* Scene Content */}
      <Suspense fallback={null}>
        <group position={[0, -2, 0]}>
          <WaterBody />
          <BosphorusLandscape />
          
          <WaterfrontMansions isAsia={false} />
          <WaterfrontMansions isAsia={true} />
          
          <Apartments />

          <Bridge />
          <OrtakoyMosque />
          <MaidensTower />
          
          <Ferry />
          <Seagulls />
        </group>
      </Suspense>
    </Canvas>
  );
};
