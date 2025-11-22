import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

export const Seagulls: React.FC = () => {
    const seagulls = useMemo(() => {
        return new Array(40).fill(0).map((_, i) => ({
            speed: 0.8 + Math.random() * 0.6,
            offset: Math.random() * 100,
            radius: 5 + Math.random() * 10,
            height: 5 + Math.random() * 5,
            centerX: (Math.random() - 0.5) * 10,
            centerZ: (Math.random() - 0.5) * 10
        }));
    }, []);

    return (
        <group>
            {seagulls.map((g, i) => (
                <Seagull key={i} {...g} />
            ))}
        </group>
    )
}

const Seagull: React.FC<{speed: number, offset: number, radius: number, height: number, centerX: number, centerZ: number}> = ({speed, offset, radius, height, centerX, centerZ}) => {
    const ref = useRef<Group>(null);
    useFrame(({clock}) => {
        if(ref.current) {
            const t = clock.elapsedTime * speed + offset;
            ref.current.position.x = centerX + Math.sin(t) * radius;
            ref.current.position.z = centerZ + Math.cos(t) * radius;
            ref.current.position.y = height + Math.sin(t * 3) * 0.5;
            ref.current.rotation.y = -t; 
        }
    })

    return (
        <group ref={ref}>
            <mesh position={[0,0,0]}>
                 <boxGeometry args={[0.04, 0.01, 0.02]} />
                 <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[0.03, 0.01, 0]} rotation={[0,0,0.5]}>
                 <boxGeometry args={[0.04, 0.01, 0.02]} />
                 <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[-0.03, 0.01, 0]} rotation={[0,0,-0.5]}>
                 <boxGeometry args={[0.04, 0.01, 0.02]} />
                 <meshBasicMaterial color="white" />
            </mesh>
        </group>
    )
}