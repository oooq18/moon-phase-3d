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
  // Cumulative counts rise steeply toward faint magnitudes, so a shell
  // is mostly dust with only a few stars near its bright end.
  const k = 0.6;
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
  // Bright stars keep a cool or warm tint. Faint ones fall back toward white,
  // the way scotopic vision washes color out of the field.
  const sat = magnitude < 1 ? 0.8 : magnitude < 2.6 ? 0.52 : magnitude < 4.4 ? 0.3 : 0.14;
  const s = Math.min(0.92, Math.max(0.08, sat + (rand() - 0.5) * 0.06));
  const nr = 0.84;
  const ng = 0.86;
  const nb = 0.92;
  return [r * s + nr * (1 - s), g * s + ng * (1 - s), b * s + nb * (1 - s)];
}

function fluxGain(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.35) / 8.15));
  return 1.08 - 0.7 * t ** 0.62;
}

function pointSize(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.4) / 8.4));
  return 0.9 + 7.6 * (1 - t) ** 2.45;
}

function haloAmount(magnitude) {
  if (magnitude > 2.3) return 0;
  const u = Math.min(1, Math.max(0, (2.3 - magnitude) / 3.5));
  return u * u;
}

function placeOnSphere(rand, radius) {
  const z = rand() * 2 - 1;
  const theta = rand() * Math.PI * 2;
  const ring = Math.sqrt(Math.max(0, 1 - z * z));
  return [radius * ring * Math.cos(theta), radius * z, radius * ring * Math.sin(theta)];
}

// Same axis the Milky Way shader uses, so faint stars can gather in the band.
const BAND = [0.22, 0.91, 0.18];

function placeInBand(rand, radius, spread) {
  const len = Math.hypot(BAND[0], BAND[1], BAND[2]);
  const n = [BAND[0] / len, BAND[1] / len, BAND[2] / len];
  const up = Math.abs(n[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
  let t1 = [
    up[1] * n[2] - up[2] * n[1],
    up[2] * n[0] - up[0] * n[2],
    up[0] * n[1] - up[1] * n[0],
  ];
  const t1l = Math.hypot(t1[0], t1[1], t1[2]);
  t1 = [t1[0] / t1l, t1[1] / t1l, t1[2] / t1l];
  const t2 = [
    n[1] * t1[2] - n[2] * t1[1],
    n[2] * t1[0] - n[0] * t1[2],
    n[0] * t1[1] - n[1] * t1[0],
  ];
  const height = Math.max(-0.9, Math.min(0.9, (rand() + rand() + rand() - 1.5) * spread));
  const theta = rand() * Math.PI * 2;
  const ring = Math.sqrt(Math.max(0, 1 - height * height));
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    radius * (n[0] * height + ring * (c * t1[0] + s * t2[0])),
    radius * (n[1] * height + ring * (c * t1[1] + s * t2[1])),
    radius * (n[2] * height + ring * (c * t1[2] + s * t2[2])),
  ];
}

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aHalo;
attribute float aPhase;
attribute float aTwinkle;
attribute float aDepth;
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
  vHalo = aHalo;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(24.0, -mv.z);
  float falloff = clamp(pow(210.0 / dist, 0.58), 0.36, 1.05);
  vColor = color * uFade * falloff;
  float atten = clamp(pow(200.0 / dist, 0.92), 0.36, 2.7);
  float layer = mix(1.24, 0.74, clamp(aDepth, 0.0, 1.0));
  gl_PointSize = clamp(aSize * atten * layer * uPixelRatio * flick, 1.15 * uPixelRatio, 12.0 * uPixelRatio);
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
  float halo = clamp(vHalo, 0.0, 1.0);
  float core = exp(-r * r * mix(26.0, 14.0, halo));
  float wing = exp(-r * r * 3.3) * smoothstep(0.06, 0.6, halo);
  float veil = exp(-r * r * 1.15) * smoothstep(0.4, 0.9, halo);
  float alpha = clamp((core + wing * 0.4 + veil * 0.16) * vFlicker, 0.0, 1.0);
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
uniform float uPixelAngle;

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

float starLayer(vec3 dir, float scale, float cutoff) {
  vec3 p = dir * scale;
  vec3 id = floor(p);
  vec3 f = fract(p);
  float n = hash(id);
  float present = step(cutoff, n);
  vec3 j = mix(
    vec3(0.5),
    vec3(hash(id + 1.3), hash(id + 4.7), hash(id + 9.2)),
    0.7
  );
  // uPixelAngle is the frame's angular pixel at a 1500px reference height,
  // so stars keep the same size in the picture when the share buffer is 4K.
  float px = max(scale * uPixelAngle, 1e-4);
  float mag = pow(hash(id + 2.2), 2.4);
  float radius = px * mix(1.55, 3.4, mag);
  float d2 = dot(f - j, f - j);
  float core = exp(-d2 / (radius * radius * 0.9));
  float gain = mix(0.42, 1.25, mag);
  return present * core * gain;
}

void main() {
  vec3 dir = normalize(vDir);
  float lat = dir.x * 0.22 + dir.y * 0.91 + dir.z * 0.18;
  float broad = noise(dir * 1.15 + 1.7);
  float mid = noise(dir * 2.6 + 6.0);
  float fine = noise(dir * 6.4 + 3.0);
  float cloud = smoothstep(0.22, 0.86, broad * 0.72 + mid * 0.28);
  float wisp = smoothstep(0.45, 0.92, mid);
  float haze = (0.045 + 0.07 * cloud + 0.018 * wisp) * uFade;
  vec3 hazeCol = mix(vec3(0.035, 0.07, 0.15), vec3(0.16, 0.26, 0.46), cloud);

  float ribbon = exp(-lat * lat * 22.0);
  float shoulder = exp(-lat * lat * 6.5);
  float lanes = smoothstep(0.18, 0.78, noise(dir * 3.1));
  float dust = smoothstep(0.7, 0.22, fine);
  float band = (ribbon * 0.5 + shoulder * 0.45) * lanes * (0.3 + 0.7 * dust);
  float bandAlpha = band * 0.07 * uFade;
  vec3 bandCol = mix(vec3(0.3, 0.42, 0.68), vec3(0.52, 0.56, 0.7), ribbon);

  // Dense photographic dust. Three jittered shells so the field reaches
  // every direction, not only the Milky Way, and most points stay faint.
  float dustStars = starLayer(dir, 260.0, 0.48);
  dustStars += starLayer(dir.yzx, 140.0, 0.8);
  dustStars += starLayer(normalize(dir.zxy + dir * 0.17), 72.0, 0.92);
  float spark = dustStars * uFade;
  float warm = hash(floor(dir * 90.0) + 5.0);
  vec3 starCol = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.9, 0.74), smoothstep(0.84, 0.98, warm));

  float hazeAlpha = clamp(haze + bandAlpha, 0.0, 0.2);
  vec3 hazeRgb = (hazeCol * haze + bandCol * bandAlpha) / max(hazeAlpha, 0.0001);
  float starAlpha = clamp(spark, 0.0, 1.0);
  float alpha = starAlpha + hazeAlpha * (1.0 - starAlpha);
  vec3 col = (starCol * starAlpha + hazeRgb * hazeAlpha * (1.0 - starAlpha)) / max(alpha, 0.0001);
  gl_FragColor = vec4(col, alpha);
}
`;

function fillPopulation(rand, count, spec) {
  const {
    radiusMin,
    radiusMax,
    magMin,
    magMax,
    depth = 0.5,
    sizeScale = 1,
    haloScale = 1,
    dim = 1,
    plane = 0,
    spread = 0.16,
  } = spec;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const halos = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const depths = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const u = rand();
    const radius = radiusMin + (u * u) * (radiusMax - radiusMin);
    const [x, y, z] = plane > 0 && rand() < plane
      ? placeInBand(rand, radius, spread)
      : placeOnSphere(rand, radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const magnitude = sampleMagnitude(rand, magMax, magMin);
    const gain = fluxGain(magnitude) * dim * (0.88 + rand() * 0.2);
    const [r, g, b] = starTint(rand, magnitude);
    colors[i * 3] = r * gain;
    colors[i * 3 + 1] = g * gain;
    colors[i * 3 + 2] = b * gain;
    sizes[i] = pointSize(magnitude) * sizeScale * (0.86 + rand() * 0.28);
    halos[i] = haloAmount(magnitude) * haloScale;
    phases[i] = rand();
    twinkles[i] = magnitude < 1.8 && depth < 0.5 && rand() < 0.4 ? 0.02 + rand() * 0.016 : 0;
    depths[i] = depth;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aHalo', new THREE.BufferAttribute(halos, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
  geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
  return geometry;
}

/** Resting sky shift per civil day. Not a whole turn, so neighboring dates differ. */
export const SKY_POSE_PER_DAY = (108 * Math.PI) / 180;
export const SKY_MAX_NIGHTS = 4;

/**
 * Extra full nights beyond the day's own pose step.
 * One civil day is only that step (one night, no added lap).
 * Longer jumps add several nights and cap at four.
 */
export function diurnalNights(absDays) {
  if (!(absDays >= 1.5)) return 0;
  return Math.min(SKY_MAX_NIGHTS, Math.max(2, Math.round(absDays)));
}

/**
 * Land on `pose` (mod 2π). With no extra nights the path is the single
 * forward step, so it does not travel a full lap and then come back.
 * Extra nights keep the long-jump whirl, still ending on that pose.
 */
export function starDestination(from, pose, sign, nights) {
  const tau = Math.PI * 2;
  const dir = sign < 0 ? -1 : 1;
  const turns = nights > 0 ? nights : 0;
  const anchor = from + dir * turns * tau;
  let dest = pose + Math.round((anchor - pose) / tau) * tau;
  if (turns === 0) {
    if (dir > 0 && dest < from) dest += tau;
    else if (dir < 0 && dest > from) dest -= tau;
  }
  return dest;
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
    { count: mobile ? 15000 : 26000, radiusMin: 500, radiusMax: 820, magMin: 5.1, magMax: 7.2, depth: 1, sizeScale: 0.78, haloScale: 0, dim: 0.92, parallax: 0.84, plane: 0.22, spread: 0.28 },
    { count: mobile ? 4200 : 7400, radiusMin: 230, radiusMax: 390, magMin: 1.7, magMax: 5.3, depth: 0.46, sizeScale: 0.95, haloScale: 0.16, dim: 0.86, parallax: 1, plane: 0.16, spread: 0.24 },
    { count: mobile ? 150 : 240, radiusMin: 118, radiusMax: 190, magMin: -1.46, magMax: 1.7, depth: 0, sizeScale: 1.12, haloScale: 1, dim: 1, parallax: 1.16, plane: 0.05, spread: 0.32 },
  ];

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

  const points = [];
  const shells = populations.map((spec) => {
    const cloud = new THREE.Points(fillPopulation(rand, spec.count, spec), material);
    cloud.frustumCulled = false;
    cloud.renderOrder = -1;
    points.push(cloud);
    const shell = new THREE.Group();
    shell.userData.parallax = spec.parallax;
    shell.add(cloud);
    return shell;
  });

  const galaxyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uFade: { value: 0 },
      uPixelAngle: { value: 0.0007 },
    },
    vertexShader: galaxyVertex,
    fragmentShader: galaxyFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
  });
  const galaxy = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 32), galaxyMaterial);
  galaxy.frustumCulled = false;
  galaxy.renderOrder = -2;
  shells[0].add(galaxy);

  // Polar axis sits in the upper sky. Idle drift is one shared spin.
  // Each shell then takes a different share of the date angle, so near
  // stars slip against the far dust when the sky turns.
  const pole = new THREE.Vector3(-0.1, 0.34, -1).normalize();
  const sky = new THREE.Group();
  sky.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pole);

  const drift = new THREE.Group();
  sky.add(drift);

  const pose = new THREE.Group();
  pose.rotation.set(0.62, 0, 0.18);
  drift.add(pose);
  shells.forEach((shell) => pose.add(shell));

  let mode = 'shader';
  let fallback = null;
  const idleRate = reducedMotion ? 0 : 0.0017;
  let idleBias = 0;
  let idleFrozen = null;
  let dateAngle = 0;
  let animFrom = 0;
  let animTo = 0;
  let animStart = 0;
  let animDur = 0;

  function sampleDate(now) {
    if (animDur <= 0) return dateAngle;
    const t = Math.min(1, (now - animStart) / animDur);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
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
    setPixelAngle(radians) {
      if (mode === 'shader') galaxyMaterial.uniforms.uPixelAngle.value = Math.max(1e-5, radians);
    },
    setFade(value) {
      if (mode === 'shader') {
        material.uniforms.uFade.value = value;
        galaxyMaterial.uniforms.uFade.value = value;
      } else if (fallback) {
        fallback.opacity = 0.2 + 0.7 * value;
      }
    },
    place(pose) {
      dateAngle = pose;
      animTo = pose;
      animDur = 0;
    },
    advance(deltaMs, now, { duration = 1500, nights = 1, pose = 0 } = {}) {
      const days = deltaMs / 86400000;
      if (!Number.isFinite(days) || Math.abs(days) < 1 / 86400) return;
      const sign = Math.sign(days) || 1;
      const from = sampleDate(now);
      const snap = reducedMotion || duration <= 0;
      const dest = starDestination(from, pose, sign, snap ? 0 : nights);
      animFrom = from;
      animTo = dest;
      animStart = now;
      if (snap || Math.abs(dest - from) < 1e-4) {
        dateAngle = dest;
        animDur = 0;
        return;
      }
      animDur = duration;
    },
    update(now) {
      const seconds = now * 0.001;
      if (mode === 'shader') material.uniforms.uTime.value = seconds;
      const angle = sampleDate(now);
      shells.forEach((shell) => {
        shell.rotation.y = shell.userData.parallax * angle;
      });
      const liveIdle = seconds * idleRate;
      if (animDur > 0) {
        if (idleFrozen == null) idleFrozen = drift.rotation.y;
        drift.rotation.y = idleFrozen;
      } else {
        if (idleFrozen != null) {
          idleBias = idleFrozen - liveIdle;
          idleFrozen = null;
        }
        drift.rotation.y = liveIdle + idleBias;
      }
    },
  };
}
