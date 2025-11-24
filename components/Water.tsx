import React, { useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { InstancedMesh, Object3D, Color, MeshStandardMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { enhanceShaderLighting } from '../utils/enhanceShaderLighting';

interface WaterProps {
  isNight: boolean;
}

export const WaterBody: React.FC<WaterProps> = ({ isNight }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  
  // High Res Grid -> Optimized for Performance
  // Reduced density by 2x (4x fewer voxels) to improve FPS on wider scenes
  const SCALE = 0.25;
  const rows = 144; // 36 world units wide
  const cols = 240; // 60 world units long
  const count = rows * cols;

  // Colors
  const colors = useMemo(() => ({
    dayDeep: new Color('#0369a1'),
    daySurf: new Color('#0ea5e9'),
    nightDeep: new Color('#172554'),
    nightSurf: new Color('#1e3a8a')
  }), []);

  // Initial Placement (Static - handled once)
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    let i = 0;
    for (let x = 0; x < rows; x++) {
      for (let z = 0; z < cols; z++) {
        const posX = (x - rows/2) * SCALE;
        const posZ = (z - cols/2) * SCALE;
        
        // Base position (Y is controlled by shader now)
        dummy.position.set(posX, -1, posZ);
        dummy.scale.set(SCALE, SCALE, SCALE);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy, rows, cols]); 

  // Update uniforms per frame (Very cheap compared to updating 100k positions)
  useFrame((state) => {
    // FIX: Added optional chaining (?.) to prevent crash if shader isn't ready
    if (materialRef.current?.userData?.shader?.uniforms) {
        materialRef.current.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  const handleBeforeCompile = useCallback((shader: any) => {
     shader.uniforms.uTime = { value: 0 };
     shader.uniforms.uDeepColor = { value: new Color(isNight ? colors.nightDeep : colors.dayDeep) };
     shader.uniforms.uSurfColor = { value: new Color(isNight ? colors.nightSurf : colors.daySurf) };
     
     // Store reference to update uniforms later
     shader.userData = { updated: true };
     
     if (materialRef.current) {
         materialRef.current.userData = materialRef.current.userData || {};
         materialRef.current.userData.shader = shader;
     }

     // 1. VERTEX SHADER: Calculate Wave Height
     shader.vertexShader = `
       uniform float uTime;
       varying float vHeight;
       ${shader.vertexShader}
     `;
     
     shader.vertexShader = shader.vertexShader.replace(
       '#include <begin_vertex>',
       `
       #include <begin_vertex>
       
       // Calculate world position x/z roughly from instance matrix for wave logic
       // We use the translation component of the instance matrix
       vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       
       // Wave Logic - More dynamic and larger waves
       // Increased amplitude to 0.25 (was 0.08)
       // Increased speed to 1.5/1.2 (was 0.6/0.4)
       // Lowered baseline to -0.4 to prevent clipping into quays
       float waveY = sin(instancePos.x * 2.0 + uTime * 1.5) * 0.25 
                   + cos(instancePos.z * 1.5 + uTime * 1.2) * 0.25 
                   - 0.4;
       
       // Apply displacement to Y
       transformed.y += waveY;
       
       // Pass height to fragment shader for coloring
       vHeight = waveY;
       `
     );

     // 2. FRAGMENT SHADER: Dynamic Coloring
     shader.fragmentShader = `
       uniform vec3 uDeepColor;
       uniform vec3 uSurfColor;
       varying float vHeight;
       ${shader.fragmentShader}
     `;

     shader.fragmentShader = shader.fragmentShader.replace(
       '#include <color_fragment>',
       `
       #include <color_fragment>
       
       // Mix colors based on height
       // Adjusted range for new amplitude (-0.9 to +0.1)
       // Peaks (0.0 to 0.1) will be surf color
       float mixFactor = smoothstep(-0.6, 0.1, vHeight);
       vec3 waveColor = mix(uDeepColor, uSurfColor, mixFactor);
       
       diffuseColor.rgb = waveColor;
       `
     );

     // 3. LIGHTING ENHANCEMENT
     enhanceShaderLighting(shader, {
        aoColor: new Color('#000000'),
        hemisphereColor: new Color(isNight ? '#1e1b4b' : '#0ea5e9'),
        irradianceColor: new Color('#ffffff'),
        radianceColor: new Color(isNight ? '#1e293b' : '#e0f2fe'),
        
        aoPower: 1.0,
        roughnessPower: 3.0, 
        sunIntensity: 1.5,
        radianceIntensity: 2.0,
        
        hardcodeValues: false
     });

     // Remove specular balls
     shader.fragmentShader = shader.fragmentShader.replace(
       '#include <lights_fragment_end>',
       `
       #include <lights_fragment_end>
       reflectedLight.directSpecular = vec3(0.0);
       `
     );

  }, [isNight, colors]);

  return (
    <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, count]}
        frustumCulled={false} // Performance: Disable culling for water to prevent flickering at edges
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        ref={materialRef}
        roughness={0.2} 
        metalness={0.1} 
        color="#ffffff" 
        onBeforeCompile={handleBeforeCompile}
        key={isNight ? 'night' : 'day'} 
      />
    </instancedMesh>
  );
};