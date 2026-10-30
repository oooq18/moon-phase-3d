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
  // 亮星颜色更明显（红巨星橙、蓝矮星蓝），暗星仍偏白
  const sat = magnitude < 0.5 ? 1.0 : magnitude < 2 ? 0.78 : magnitude < 4 ? 0.38 : 0.16;
  const s = Math.min(1.0, Math.max(0.08, sat + (rand() - 0.5) * 0.08));
  const nr = 0.84;
  const ng = 0.86;
  const nb = 0.92;
  return [r * s + nr * (1 - s), g * s + ng * (1 - s), b * s + nb * (1 - s)];
}

function fluxGain(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.35) / 8.15));
  // The faint end used to fall near 0.4, which disappears on a black clear.
  return 1.35 - 0.78 * t ** 1.15;
}

function pointSize(magnitude) {
  const t = Math.min(1, Math.max(0, (magnitude + 1.4) / 8.4));
  // 亮星更突出，和暗星拉开差距
  return 1.6 + 11.0 * (1 - t) ** 2.2;
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
  float falloff = clamp(pow(210.0 / dist, 0.4), 0.82, 1.08);
  // 大气消光：靠近地平线（y 低）的星更暗、更红
  float alt = normalize(position).y;
  float extinction = smoothstep(-0.15, 0.45, alt);
  vec3 baseColor = color * uFade * falloff;
  baseColor *= mix(0.35, 1.0, extinction);
  baseColor *= mix(vec3(1.0, 0.85, 0.7), vec3(1.0), extinction);
  vColor = baseColor;
  float atten = clamp(pow(200.0 / dist, 0.5), 0.84, 2.2);
  float layer = mix(1.12, 0.96, clamp(aDepth, 0.0, 1.0));
  float px = max(uPixelRatio, 1.0);
  gl_PointSize = clamp(aSize * atten * layer * flick, 1.4, 14.0) * px;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vHalo;
varying float vFlicker;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r2 = dot(p, p);
  if (r2 > 0.25) discard;
  float r = sqrt(r2) * 2.0;
  float halo = clamp(vHalo, 0.0, 1.0);

  // 三层光度结构，而不是一坨高斯：
  // 核（ Airy 主瓣，很陡）+ 内晕（镜面散射）+ 外纱（大气辉光）
  float core = exp(-r * r * mix(13.0, 5.2, halo));
  float wing = exp(-r * r * 2.6) * smoothstep(0.02, 0.5, halo);
  float veil = exp(-r * r * 1.05) * smoothstep(0.3, 0.92, halo);

  // 衍射十字芒：更明显
  float u = abs(p.x);
  float v = abs(p.y);
  float cross = exp(-v * 90.0) * exp(-u * 3.2)
              + exp(-u * 90.0) * exp(-v * 3.2);
  vec2 d = vec2((p.x + p.y) * 0.7071, (p.x - p.y) * 0.7071);
  float du = abs(d.x);
  float dv = abs(d.y);
  float diag = exp(-dv * 120.0) * exp(-du * 5.5)
             + exp(-du * 120.0) * exp(-dv * 5.5);
  float spikeGate = smoothstep(0.08, 0.7, halo);
  float spikes = cross * spikeGate * 0.9 + diag * spikeGate * spikeGate * 0.35;

  float body = core + wing * 0.40 + veil * 0.15 + spikes;
  float alpha = clamp(body * vFlicker, 0.0, 1.0);
  if (alpha < 0.02) discard;

  // 外纱略偏冷：模拟镜头的轴向色差，避免整颗星是纯色圆片
  vec3 col = vColor * (1.0 + veil * 0.12);
  col = mix(col, col * vec3(0.84, 0.92, 1.10), veil * 0.55);
  gl_FragColor = vec4(col, alpha);
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
  // 银河带方向：更倾斜，绕 Y 旋转时能明显扫过天空
  float lat = dir.x * 0.62 + dir.y * 0.32 + dir.z * 0.52;
  float ribbon = exp(-lat * lat * 42.0);
  float shoulder = exp(-lat * lat * 11.0);
  float clumps = noise(dir * 3.2);
  float fine = noise(dir * 8.2 + 3.0);
  float grain = noise(dir * 15.0 + 1.7);
  float clouds = smoothstep(0.18, 0.8, clumps);
  float dust = smoothstep(0.7, 0.24, fine);
  float knots = smoothstep(0.58, 0.9, grain);
  float band = ribbon * 0.85 + shoulder * 0.32;
  float alpha = band * clouds * (0.2 + 0.8 * dust) * (0.09 + 0.075 * knots) * uFade;
  vec3 cool = vec3(0.42, 0.52, 0.76);
  vec3 warm = vec3(0.78, 0.66, 0.5);
  vec3 col = mix(cool, warm, clamp(ribbon * (0.3 + 0.7 * dust), 0.0, 1.0));
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

  // 星团中心：只对最亮层（depth≈0）生效，随机 3-4 个点
  const clusterCenters = [];
  if (depth < 0.1) {
    const n = 3 + ((rand() * 2) | 0);
    for (let c = 0; c < n; c += 1) {
      clusterCenters.push(placeOnSphere(rand, 1));
    }
  }

  for (let i = 0; i < count; i += 1) {
    const u = rand();
    const radius = radiusMin + (u * u) * (radiusMax - radiusMin);

    // 最亮层随机生成 3-4 个星团，约 1/3 的亮星聚在星团附近
    let x, y, z;
    if (depth < 0.1 && i < count * 0.38 && clusterCenters.length) {
      const c = clusterCenters[(rand() * clusterCenters.length) | 0];
      const spread = 0.09;
      x = c[0] + (rand() - 0.5) * spread * radius;
      y = c[1] + (rand() - 0.5) * spread * radius;
      z = c[2] + (rand() - 0.5) * spread * radius;
      const len = Math.sqrt(x*x+y*y+z*z) || 1;
      x = x/len*radius; y = y/len*radius; z = z/len*radius;
    } else if (plane > 0 && rand() < plane) {
      [x, y, z] = placeInBand(rand, radius, spread);
    } else {
      [x, y, z] = placeOnSphere(rand, radius);
    }
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
    // 闪烁：近层亮星为主，慢速小幅正弦。移动端与降低动效偏好下由
    // uTwinkle 统一置零，这里只负责分配幅度与相位。
    if (depth < 0.6 && rand() < 0.5) {
      const weight = magnitude < 2.4 ? 1 : 0.45;
      twinkles[i] = (0.02 + rand() * 0.032) * weight;
    } else {
      twinkles[i] = 0;
    }
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
  // 每次打开随机种子，看到不同星图
  const rand = mulberry32((Math.random() * 0xFFFFFFFF) >>> 0);
  const populations = [
    { count: mobile ? 18000 : 32000, radiusMin: 500, radiusMax: 820, magMin: 3.6, magMax: 6.2, depth: 1, sizeScale: 1, haloScale: 0, dim: 0.84, parallax: 0.72, plane: 0.58, spread: 0.13 },
    { count: mobile ? 2400 : 4200, radiusMin: 240, radiusMax: 380, magMin: 1.5, magMax: 4.2, depth: 0.48, sizeScale: 1.05, haloScale: 0.4, dim: 1.02, parallax: 1.0, plane: 0.2, spread: 0.22 },
    { count: mobile ? 72 : 128, radiusMin: 118, radiusMax: 186, magMin: -1.46, magMax: 2.1, depth: 0, sizeScale: 1.22, haloScale: 1, dim: 1.16, parallax: 1.35, plane: 0.06, spread: 0.3 },
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
    uniforms: { uFade: { value: 0 } },
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
    get mode() {
      return mode;
    },
    useFallback() {
      if (mode === 'fallback') return;
      mode = 'fallback';
      const sprite = circleTexture();
      fallback = new THREE.PointsMaterial({
        size: mobile ? 3.1 : 2.7,
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
