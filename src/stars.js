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

function starColor(rand) {
  const pick = rand();
  let kelvin;
  if (pick < 0.1) kelvin = 3400 + rand() * 700;
  else if (pick < 0.38) kelvin = 4800 + rand() * 1400;
  else kelvin = 6800 + rand() * 4200;
  const [r, g, b] = kelvinToRgb(kelvin);
  const sat = 0.42;
  const white = 1 - sat;
  const gain = 0.55 + rand() * 0.45;
  return [(r * sat + white) * gain, (g * sat + white) * gain, (b * sat + white) * gain];
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
  float tw = 1.0 - aTwinkle + aTwinkle * (0.82 + 0.18 * sin(uTime * (0.35 + aPhase * 0.7) + aPhase * 6.28318));
  vTwinkle = tw * uFade;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.15, aSize * uPixelRatio * tw * (168.0 / max(1.0, -mv.z)));
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
  float core = smoothstep(0.5, 0.08, d);
  float alpha = core * vTwinkle;
  gl_FragColor = vec4(vColor * alpha, alpha);
}
`;

export function createStars() {
  const rand = mulberry32(0x51a7c3);
  const count = 2400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const twinkles = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const far = rand() > 0.28;
    const radius = far ? 78 + rand() * 36 : 46 + rand() * 18;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const sinPhi = Math.sin(phi);
    positions[i * 3] = radius * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta);

    const [r, g, b] = starColor(rand);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;

    const sizeRoll = rand();
    sizes[i] = far ? 0.35 + sizeRoll ** 2 * 1.15 : 0.55 + sizeRoll ** 2 * 1.7;
    phases[i] = rand();
    twinkles[i] = rand() < 0.72 ? 0.22 + rand() * 0.45 : 0.05;
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
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  return {
    object: group,
    setPixelRatio(value) {
      material.uniforms.uPixelRatio.value = value;
    },
    setFade(value) {
      material.uniforms.uFade.value = value;
    },
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
      group.rotation.y = elapsed * 0.006;
      group.rotation.x = Math.sin(elapsed * 0.045) * 0.018;
    },
  };
}
