import { Color } from 'three';

// Define Shader interface locally as it is sometimes not exported directly from 'three' root
export interface Shader {
  uniforms: { [uniform: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
}

export interface EnhanceShaderLightingOptions {
  aoColor?: Color;
  hemisphereColor?: Color;
  irradianceColor?: Color;
  radianceColor?: Color;
  
  aoPower?: number;
  aoSmoothing?: number;
  aoMapGamma?: number;
  lightMapGamma?: number;
  lightMapSaturation?: number;
  envPower?: number;
  roughnessPower?: number;
  sunIntensity?: number;
  mapContrast?: number;
  lightMapContrast?: number;
  smoothingPower?: number;
  irradianceIntensity?: number;
  radianceIntensity?: number;
  
  hardcodeValues?: boolean;
}

export function enhanceShaderLighting(shader: Shader, options: EnhanceShaderLightingOptions = {}) {
  // Set defaults based on the library's typical behavior
  const defaults = {
    aoColor: new Color(0x000000),
    hemisphereColor: new Color(0xffffff),
    irradianceColor: new Color(0xffffff),
    radianceColor: new Color(0xffffff),
    aoPower: 1,
    roughnessPower: 1,
    sunIntensity: 0,
    irradianceIntensity: Math.PI,
    radianceIntensity: 1,
  };

  const config = { ...defaults, ...options };

  // 1. Define Uniforms
  shader.uniforms.aoColor = { value: config.aoColor };
  shader.uniforms.hemisphereColor = { value: config.hemisphereColor };
  shader.uniforms.irradianceColor = { value: config.irradianceColor };
  shader.uniforms.radianceColor = { value: config.radianceColor };
  shader.uniforms.aoPower = { value: config.aoPower };
  shader.uniforms.roughnessPower = { value: config.roughnessPower };
  shader.uniforms.sunIntensity = { value: config.sunIntensity };
  shader.uniforms.irradianceIntensity = { value: config.irradianceIntensity };
  shader.uniforms.radianceIntensity = { value: config.radianceIntensity };

  // 2. Inject Uniform Declarations into Fragment Shader
  const uniformChunk = `
    uniform vec3 aoColor;
    uniform vec3 hemisphereColor;
    uniform vec3 irradianceColor;
    uniform vec3 radianceColor;
    uniform float aoPower;
    uniform float roughnessPower;
    uniform float sunIntensity;
    uniform float irradianceIntensity;
    uniform float radianceIntensity;
  `;

  shader.fragmentShader = uniformChunk + shader.fragmentShader;

  // 3. Inject Logic to modify Roughness (before lighting)
  // We hook into 'roughnessmap_fragment' which is where roughnessFactor is usually finalized
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `
    #include <roughnessmap_fragment>
    
    // Apply roughness power enhancement
    roughnessFactor = pow(max(roughnessFactor, 0.001), roughnessPower);
    `
  );

  // 4. Inject Logic to modify Lighting (Irradiance and Radiance)
  // We modify the reflectedLight struct which accumulates the light
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_fragment_maps>',
    `
    #include <lights_fragment_maps>
    
    // Enhance Indirect Diffuse (Irradiance)
    reflectedLight.indirectDiffuse *= irradianceColor * irradianceIntensity;
    
    // Enhance Indirect Specular (Radiance/Reflections)
    reflectedLight.indirectSpecular *= radianceColor * radianceIntensity;
    `
  );
}