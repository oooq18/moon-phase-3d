import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function kelvinToRgb(kelvin) {
  const temp = kelvin / 100;
  let r;
  let g;
  let b;
  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }
  if (temp >= 66) b = 255;
  else if (temp <= 19) b = 0;
  else b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  const clamp = (v) => Math.min(255, Math.max(0, v)) / 255;
  return [clamp(r), clamp(g), clamp(b)];
}

function sampleMagnitude(rand, faint, bright) {
  const k = 0.46;
  const a = 10 ** (k * bright);
  const b = 10 ** (k * faint);
  return Math.log10(a + rand() * (b - a)) / k;
}

function spectralKelvin(rand, magnitude) {
  const roll = rand();
  if (magnitude < 2.2) {
    if (roll < 0.07) return 12000 + rand() * 9000;
    if (roll < 0.3) return 8200 + rand() * 2800;
    if (roll < 0.68) return 6200 + rand() * 1800;
    if (roll < 0.9) return 5000 + rand() * 1100;
    return 3600 + rand() * 1200;
  }
  if (roll < 0.035) return 11000 + rand() * 7000;
  if (roll < 0.1) return 7600 + rand() * 2200;
  if (roll < 0.24) return 5900 + rand() * 1400;
  if (roll < 0.48) return 4500 + rand() * 1300;
  if (roll < 0.74) return 3400 + rand() * 1000;
  return 2600 + rand() * 900;
}

function starTint(rand, magnitude) {
  const [r, g, b] = kelvinToRgb(spectralKelvin(rand, magnitude));
  const sat = 0.36 + rand() * 0.08;
  const nr = 0.8;
  const ng = 0.85;
  const nb = 0.93;
  return [r * sat + nr * (1 - sat), g * sat + ng * (1 - sat), b * sat + nb * (1 - sat)];
}

function fluxGain(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.35) / 8.15));
  return 1.08 - 0.7 * t ** 0.62;
}

function pointSize(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.35) / 8));
  return 1.2 + 6.4 * (1 - t) ** 1.7;
}

function haloAmount(magnitude) {
  if (magnitude > 3.1) return 0;
  if (magnitude > 2) return 0.12;
  if (magnitude > 0.8) return 0.38;
  return 0.72 + Math.max(0, 0.8 - magnitude) * 0.2;
}

function placeOnSphere(rand, radius) {
  const z = rand() * 2 - 1;
  const theta = rand() * Math.PI * 2;
  const ring = Math.sqrt(Math.max(0, 1 - z * z));
  return [radius * ring * Math.cos(theta), radius * z, radius * ring * Math.sin(theta)];
}

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aHalo;
attribute float aPhase;
attribute float aTwinkle;
varying vec3 vColor;
varying float vHalo;
varying float vFlicker;
uniform float uTime;
uniform float uPixelRatio;
uniform float uFade;
uniform float uTwinkle;

void main() {
  float flick = 1.0 + uTwinkle * aTwinkle * sin(uTime * (0.17 + aPhase * 0.11) + aPhase * 6.2831853);
  vFlicker = flick;
  vColor = color * uFade;
  vHalo = aHalo;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(48.0, -mv.z);
  float atten = clamp(150.0 / dist, 0.62, 1.28);
  gl_PointSize = clamp(aSize * atten * uPixelRatio * flick, 1.0, 6.4 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vHalo;
varying float vFlicker;

void main() {
  vec2 q = gl_PointCoord - vec2(0.5);
  float r2 = dot(q, q);
  if (r2 > 0.25) discard;
  float r = sqrt(r2) * 2.0;
  float core = exp(-r * r * mix(11.0, 5.2, clamp(vHalo, 0.0, 1.0)));
  float wing = exp(-r * r * 1.85) * vHalo;
  float alpha = clamp((core + wing * 0.42) * vFlicker, 0.0, 1.0);
  if (alpha < 0.012) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`;

const galaxyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = normalize(world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const galaxyFragment = /* glsl */ `
varying vec3 vDir;
uniform float uFade;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash(i);
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

void main() {
  vec3 dir = normalize(vDir);
  float lat = dir.x * 0.22 + dir.y * 0.91 + dir.z * 0.18;
  float ribbon = exp(-lat * lat * 26.0);
  float clumps = noise(dir * 4.2);
  float fine = noise(dir * 9.5 + 4.0);
  float lanes = smoothstep(0.22, 0.72, clumps);
  float dust = smoothstep(0.62, 0.28, fine);
  float alpha = ribbon * lanes * (0.4 + 0.6 * dust) * 0.1 * uFade;
  vec3 col = vec3(0.62, 0.68, 0.78);
  gl_FragColor = vec4(col, alpha);
}
`;

function fillPopulation(rand, count, { radiusMin, radiusMax, magMin, magMax }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const halos = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const radius = radiusMin + rand() * (radiusMax - radiusMin);
    const [x, y, z] = placeOnSphere(rand, radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const magnitude = sampleMagnitude(rand, magMax, magMin);
    const gain = fluxGain(magnitude) * (0.92 + rand() * 0.16);
    const [r, g, b] = starTint(rand, magnitude);
    colors[i * 3] = r * gain;
    colors[i * 3 + 1] = g * gain;
    colors[i * 3 + 2] = b * gain;
    sizes[i] = pointSize(magnitude) * (0.92 + rand() * 0.16);
    halos[i] = haloAmount(magnitude);
    phases[i] = rand();
    twinkles[i] = magnitude < 2.4 && rand() < 0.45 ? 0.025 + rand() * 0.02 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aHalo', new THREE.BufferAttribute(halos, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
  return geometry;
}

function circleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const dx = (x + 0.5) / 64 - 0.5;
      const dy = (y + 0.5) / 64 - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const alpha = Math.exp(-r * r * 4.2);
      const i = (y * 64 + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStars({ reducedMotion = false, mobile = false } = {}) {
  const rand = mulberry32(0x5f3759df);
  const populations = [
    { count: mobile ? 9000 : 17000, radiusMin: 220, radiusMax: 270, magMin: 3.2, magMax: 6.7 },
    { count: mobile ? 2400 : 4200, radiusMin: 128, radiusMax: 176, magMin: 1.4, magMax: 6.1 },
    { count: mobile ? 900 : 1200, radiusMin: 108, radiusMax: 148, magMin: -1.4, magMax: 2.5 },
  ];

  const geometries = populations.map((spec) => fillPopulation(rand, spec.count, spec));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uFade: { value: 0 },
      uTwinkle: { value: reducedMotion || mobile ? 0 : 1 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = geometries.map((geometry) => {
    const cloud = new THREE.Points(geometry, material);
    cloud.frustumCulled = false;
    cloud.renderOrder = -1;
    return cloud;
  });

  const galaxyMaterial = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 } },
    vertexShader: galaxyVertex,
    fragmentShader: galaxyFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
  });
  const galaxy = new THREE.Mesh(new THREE.SphereGeometry(340, 48, 32), galaxyMaterial);
  galaxy.frustumCulled = false;
  galaxy.renderOrder = -2;

  const sky = new THREE.Group();
  sky.add(galaxy, ...points);
  sky.rotation.order = 'YXZ';
  sky.rotation.x = 0.62;
  sky.rotation.z = 0.18;

  let mode = 'shader';
  let fallback = null;
  const idleRate = reducedMotion ? 0 : 0.0017;
  let dateAngle = 0;
  let animFrom = 0;
  let animTo = 0;
  let animStart = 0;
  let animDur = 0;

  function sampleDate(now) {
    if (animDur <= 0) return dateAngle;
    const t = Math.min(1, (now - animStart) / animDur);
    const eased = 1 - (1 - t) ** 3;
    const value = animFrom + (animTo - animFrom) * eased;
    if (t >= 1) {
      dateAngle = animTo;
      animDur = 0;
      return dateAngle;
    }
    return value;
  }

  return {
    object: sky,
    useFallback() {
      if (mode === 'fallback') return;
      mode = 'fallback';
      const sprite = circleTexture();
      fallback = new THREE.PointsMaterial({
        size: mobile ? 0.22 : 0.28,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        map: sprite,
        opacity: 0.9,
      });
      points.forEach((cloud) => {
        cloud.material = fallback;
      });
      galaxy.visible = false;
      material.dispose();
      galaxyMaterial.dispose();
    },
    setPixelRatio(value) {
      if (mode === 'shader') material.uniforms.uPixelRatio.value = value;
    },
    setFade(value) {
      if (mode === 'shader') {
        material.uniforms.uFade.value = value;
        galaxyMaterial.uniforms.uFade.value = value;
      } else if (fallback) {
        fallback.opacity = 0.2 + 0.7 * value;
      }
    },
    advance(deltaMs, now) {
      const days = deltaMs / 86400000;
      if (!Number.isFinite(days) || Math.abs(days) < 1 / 86400) return;
      // One solar day shifts the stars by about a degree. Scale that so a
      // single day is a clear arc, and cap a long jump so the sky never spins.
      const dayTurn = THREE.MathUtils.degToRad(22);
      const cap = THREE.MathUtils.degToRad(40);
      const delta = Math.max(-cap, Math.min(cap, days * dayTurn));
      const from = sampleDate(now);
      animFrom = from;
      animTo = from + delta;
      animStart = now;
      animDur = reducedMotion ? 0 : Math.min(780, Math.max(420, (Math.abs(delta) / dayTurn) * 700));
      if (animDur === 0) {
        dateAngle = animTo;
        return;
      }
    },
    update(now) {
      const seconds = now * 0.001;
      if (mode === 'shader') material.uniforms.uTime.value = seconds;
      sky.rotation.y = seconds * idleRate + sampleDate(now);
    },
  };
}
