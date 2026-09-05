import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import type { GalaxyTargets } from '../../lib/galaxyTargets';

/**
 * L0 — the deep field. One fullscreen fragment shader, mounted once for
 * the entire site.
 *
 * ── Why this is not the React Bits component verbatim ────────────────
 * The reference implementation lists every prop in its useEffect
 * dependency array, so changing `hueShift` or `saturation` tears down the
 * WebGL context, drops the canvas, calls WEBGL_lose_context, and rebuilds
 * from scratch. This site changes those values on every record
 * transition, which would mean eight context rebuilds per read-through
 * and a visible black flash at each one.
 *
 * So: the context is created once with an empty dependency array, target
 * values are pushed into a ref, and the render loop eases the live
 * uniforms toward those targets. Prop changes now cost a float write.
 *
 * DPR is capped at 1.5 rather than 2 here. This layer is a soft,
 * low-frequency starfield with no crisp edges to protect, and it is the
 * only full-viewport per-pixel work in the site, so it is the right place
 * to spend the least.
 */

const MAX_DPR = 1.5;
const FRAME_INTERVAL = 1000 / 30;

const vertexShader = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec3  uResolution;
uniform vec2  uFocal;
uniform vec2  uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2  uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool  uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));

      vec2 pad = vec2(
        tris(seed * 34.0 + uTime * uSpeed / 10.0),
        tris(seed * 38.0 + uTime * uSpeed / 30.0)
      ) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;

      col += star * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    float centerDist = length(uv);
    vec2 repulsion = normalize(uv) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  float alpha = smoothstep(0.0, 0.3, length(col));
  gl_FragColor = vec4(col, min(alpha, 1.0));
}
`;

interface Props {
  targets: GalaxyTargets;
  /** stop time-based animation entirely (reduced motion) */
  frozen?: boolean;
  mouseInteraction?: boolean;
  className?: string;
}

/** Shortest-path interpolation around the hue circle. */
function lerpHue(current: number, target: number, k: number): number {
  let d = target - current;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  let next = current + d * k;
  if (next < 0) next += 360;
  if (next >= 360) next -= 360;
  return next;
}

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export default function GalaxyField({
  targets,
  frozen = false,
  mouseInteraction = true,
  className,
}: Props) {
  const ctnRef = useRef<HTMLDivElement | null>(null);

  // Targets and the frozen flag are read by the loop, never by the
  // effect, so changing them cannot rebuild the GL context.
  const targetRef = useRef(targets);
  targetRef.current = targets;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const interactRef = useRef(mouseInteraction);
  interactRef.current = mouseInteraction;

  useEffect(() => {
    const ctn = ctnRef.current;
    if (!ctn) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      });
    } catch {
      // No WebGL. The void background and every other layer still work,
      // so this degrades to a plain dark sky rather than a broken page.
      return;
    }

    const gl = renderer.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const t = targetRef.current;
    const live: GalaxyTargets = { ...t };

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height,
          ),
        },
        uFocal: { value: new Float32Array([0.5, 0.5]) },
        uRotation: { value: new Float32Array([1, 0]) },
        uStarSpeed: { value: live.starSpeed },
        uDensity: { value: live.density },
        uHueShift: { value: live.hueShift },
        uSpeed: { value: live.speed },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity: { value: live.glowIntensity },
        uSaturation: { value: live.saturation },
        uMouseRepulsion: { value: false },
        uTwinkleIntensity: { value: live.twinkleIntensity },
        uRotationSpeed: { value: live.rotationSpeed },
        uRepulsionStrength: { value: 1.4 },
        uMouseActiveFactor: { value: 0 },
        uAutoCenterRepulsion: { value: 0 },
      },
    });

    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = (): void => {
      renderer.setSize(ctn.offsetWidth, ctn.offsetHeight);
      program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height,
      );
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(ctn);

    ctn.appendChild(gl.canvas);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';

    // ── pointer parallax ──
    const targetMouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    let targetActive = 0;
    let smoothActive = 0;

    const onMove = (e: PointerEvent): void => {
      if (!interactRef.current) return;
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = 1 - e.clientY / window.innerHeight;
      targetActive = 1;
    };
    const onLeave = (): void => {
      targetActive = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    // ── loop ──
    let raf = 0;
    let visible = !document.hidden;
    const onVisibility = (): void => {
      visible = !document.hidden;
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(update);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let animTime = 0;
    let last = performance.now();

    const update = (now: number): void => {
      if (!visible || frozenRef.current) {
        renderer.render({ scene: mesh });
        raf = 0;
        return;
      }

      const elapsed = now - last;
      if (elapsed < FRAME_INTERVAL) {
        raf = requestAnimationFrame(update);
        return;
      }

      raf = requestAnimationFrame(update);
      const dt = Math.min(elapsed, 64);
      last = now;

      const tg = targetRef.current;
      // Ease live uniforms toward targets. ~0.035 gives a transition that
      // reads as an instrument re-tuning across a record change rather
      // than a cut.
      const k = 0.035;
      live.hueShift = lerpHue(live.hueShift, tg.hueShift, k);
      live.saturation = lerp(live.saturation, tg.saturation, k);
      live.density = lerp(live.density, tg.density, k);
      live.glowIntensity = lerp(live.glowIntensity, tg.glowIntensity, k);
      live.twinkleIntensity = lerp(live.twinkleIntensity, tg.twinkleIntensity, k);
      live.starSpeed = lerp(live.starSpeed, tg.starSpeed, k);
      live.rotationSpeed = lerp(live.rotationSpeed, tg.rotationSpeed, k);
      live.speed = lerp(live.speed, tg.speed, k);

      animTime += dt * 0.001;

      const u = program.uniforms;
      u.uTime.value = animTime;
      u.uStarSpeed.value = (animTime * live.starSpeed) / 10;
      u.uDensity.value = live.density;
      u.uHueShift.value = live.hueShift;
      u.uSaturation.value = live.saturation;
      u.uGlowIntensity.value = live.glowIntensity;
      u.uTwinkleIntensity.value = live.twinkleIntensity;
      u.uRotationSpeed.value = live.rotationSpeed;
      u.uSpeed.value = live.speed;

      const ml = 0.05;
      smoothMouse.x += (targetMouse.x - smoothMouse.x) * ml;
      smoothMouse.y += (targetMouse.y - smoothMouse.y) * ml;
      smoothActive += ((interactRef.current ? targetActive : 0) - smoothActive) * ml;
      u.uMouse.value[0] = smoothMouse.x;
      u.uMouse.value[1] = smoothMouse.y;
      u.uMouseActiveFactor.value = smoothActive;

      renderer.render({ scene: mesh });
    };
    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Mounted exactly once. Everything dynamic goes through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ctnRef} aria-hidden="true" className={className} />;
}
