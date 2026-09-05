/**
 * Sparse deep-space stars, in 3D.
 *
 * Points scattered on a large shell so perspective gives them real
 * distance. Deterministic from the seed, deliberately few, tiny, and
 * mostly static — the emptiness is the point. A faint, slow brightness
 * drift touches only a handful; there is no twinkle.
 */

import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { createPRNG, randFloat } from '../../../web/src/lib/prng';
import { STAR_COUNT } from '../config';

export const SpaceField: React.FC<{ seed: string; opacity: number }> = ({ seed, opacity }) => {
  const geometry = useMemo(() => {
    const rand = createPRNG(`${seed}:starfield`);
      const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      // uniform direction on a sphere, pushed to a far shell
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const dist = randFloat(rand, 16, 34);
      positions[i * 3] = Math.cos(theta) * r * dist;
      positions[i * 3 + 1] = u * dist;
      positions[i * 3 + 2] = Math.sin(theta) * r * dist;
      sizes[i] = randFloat(rand, 0.25, 0.72);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [seed]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uOpacity: { value: 1 },
          uPixelRatio: { value: 1 },
        },
        vertexShader: `
          attribute float aSize;
          uniform float uPixelRatio;
          varying float vS;
          void main() {
            vS = aSize;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * 2.1 * uPixelRatio * (300.0 / -mv.z);
          }
        `,
        fragmentShader: `
          uniform float uOpacity;
          varying float vS;
          void main() {
            vec2 d = gl_PointCoord - vec2(0.5);
            float r = length(d);
            if (r > 0.5) discard;
            float a = smoothstep(0.5, 0.0, r);
            gl_FragColor = vec4(vec3(1.0), a * uOpacity * (0.28 + 0.36 * vS));
          }
        `,
      }),
    [],
  );

  const frame = useCurrentFrame();
  // barely-there global shimmer; the field is essentially still
  const shimmer = 0.94 + 0.06 * Math.sin(frame * 0.02);
  material.uniforms.uOpacity.value = opacity * shimmer;

  return <points geometry={geometry} material={material} />;
};
