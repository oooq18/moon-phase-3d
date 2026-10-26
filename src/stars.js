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

function starColor(rand, bright) {
  const pick = rand();
  let kelvin;
  if (pick < 0.12) kelvin = 3600 + rand() * 800;
  else if (pick < 0.4) kelvin = 5000 + rand() * 1200;
  else kelvin = 7000 + rand() * 4500;
  const [r, g, b] = kelvinToRgb(kelvin);
  const sat = 0.32;
  const white = 1 - sat;
  const gain = bright ? 1.02 + rand() * 0.22 : 0.84 + rand() * 0.26;
  return [(r * sat + white) * gain, (g * sat + white) * gain, (b * sat + white) * gain];
}

function circleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.28, 'rgba(255,255,255,0.95)');
  glow.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aTwinkle;
varying vec3 vColor;
varying float vTwinkle;
uniform float uTime;
uniform float uPixelRatio;
uniform float uFade;

void main() {
  vColor = color;
  float tw = 1.0 - aTwinkle + aTwinkle * (0.78 + 0.22 * sin(uTime * (0.28 + aPhase * 0.55) + aPhase * 6.28318));
  vTwinkle = tw * uFade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(36.0, -mv.z);
  float size = aSize * uPixelRatio * (82.0 / dist) * (0.9 + 0.1 * tw);
  gl_PointSize = clamp(size, 1.75, 6.2 * uPixelRatio);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.02, d);
  float glow = smoothstep(0.5, 0.18, d);
  float alpha = (0.42 + 0.58 * glow) * vTwinkle;
  vec3 col = vColor * (0.72 + 0.85 * core);
  gl_FragColor = vec4(col, alpha);
}
`;

export function createStars({ reducedMotion = false } = {}) {
  const rand = mulberry32(0x51a7c3);
  const count = 4600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const capCos = Math.cos(THREE.MathUtils.degToRad(66));

  for (let i = 0; i < count; i += 1) {
    const inCap = rand() < 0.88;
    let x;
    let y;
    let z;
    if (inCap) {
      const cosA = capCos + rand() * (1 - capCos);
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      const theta = rand() * Math.PI * 2;
      x = sinA * Math.cos(theta);
      y = sinA * Math.sin(theta);
      z = -cosA;
    } else {
      const phi = Math.acos(2 * rand() - 1);
      const theta = rand() * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      x = sinPhi * Math.cos(theta);
      y = Math.cos(phi);
      z = sinPhi * Math.sin(theta);
    }

    const radius = 64 + rand() * 52;
    positions[i * 3] = radius * x;
    positions[i * 3 + 1] = radius * y;
    positions[i * 3 + 2] = radius * z;

    const bright = rand() < 0.07;
    const [r, g, b] = starColor(rand, bright);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
    const roll = rand();
    sizes[i] = bright ? 4.2 + roll * 2.0 : 2.55 + roll * 1.55;
    phases[i] = rand();
    twinkles[i] = rand() < 0.55 ? 0.12 + rand() * 0.22 : 0.02;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uFade: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -1;
  const group = new THREE.Group();
  group.add(points);

  let mode = 'shader';
  let fallback = null;

  function makeFallback() {
    const sprite = circleTexture();
    return new THREE.PointsMaterial({
      size: 0.36,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      map: sprite,
      alphaMap: sprite,
      opacity: 0.95,
    });
  }

  return {
    object: group,
    usesShader() {
      return mode === 'shader';
    },
    useFallback() {
      if (mode === 'fallback') return;
      mode = 'fallback';
      fallback = makeFallback();
      points.material = fallback;
      material.dispose();
    },
    setPixelRatio(value) {
      if (mode === 'shader') material.uniforms.uPixelRatio.value = value;
    },
    setFade(value) {
      if (mode === 'shader') material.uniforms.uFade.value = value;
      else if (fallback) fallback.opacity = 0.35 + 0.65 * value;
    },
    update(elapsed) {
      if (mode === 'shader') material.uniforms.uTime.value = elapsed;
      if (!reducedMotion) group.rotation.y = elapsed * 0.012;
    },
  };
}
