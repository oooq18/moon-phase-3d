import * as THREE from 'three';

const MOON_RADIUS = 1.16;

const vertexShader = /* glsl */ `
uniform sampler2D uDisp;
uniform float uHasDisp;
uniform float uReveal;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  if (uHasDisp > 0.5) {
    float h = texture2D(uDisp, uv).r;
    pos += normal * (h - 0.5) * 0.02;
  }
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uDisp;
uniform float uHasMap;
uniform float uHasDisp;
uniform float uMapMix;
uniform float uFallback;
uniform vec3 uLightDir;
uniform float uReveal;
uniform vec2 uDispTexel;
uniform vec2 uColorTexel;
uniform float uBump;

varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p * 2.05;
    a *= 0.5;
  }
  return v;
}

float craterField(vec2 uv) {
  float h = 0.0;
  vec2 p = uv * vec2(22.0, 11.0);
  for (int i = 0; i < 3; i++) {
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float n = hash(id + float(i) * 19.1);
    vec2 center = vec2(hash(id + 2.3), hash(id + 5.8)) - 0.5;
    center *= 0.7;
    float craterRadius = mix(0.07, 0.26, hash(id + 8.2));
    float d = length(f - center);
    float bowl = smoothstep(craterRadius, craterRadius * 0.18, d);
    float rim = smoothstep(craterRadius * 0.82, craterRadius, d) * smoothstep(craterRadius * 1.28, craterRadius, d);
    h += step(0.52, n) * (bowl * 0.7 + rim * 0.85);
    p = p * 2.17 + 1.9;
  }
  return h;
}

vec3 proceduralAlbedo(vec2 uv) {
  float grain = fbm(uv * vec2(16.0, 8.0));
  float maria = smoothstep(0.40, 0.74, fbm(uv * vec2(3.2, 1.6) + 2.2));
  float craters = craterField(uv);
  vec3 highland = vec3(0.52, 0.53, 0.55);
  vec3 rough = vec3(0.34, 0.35, 0.37);
  vec3 mare = vec3(0.15, 0.16, 0.18);
  vec3 col = mix(highland, rough, grain);
  col = mix(col, mare, maria * 0.88);
  col *= mix(1.0, 0.58, smoothstep(0.2, 0.85, craters));
  col += vec3(0.06) * smoothstep(0.25, 0.6, craters);
  return col;
}

vec3 tangent(vec3 n, vec3 dp1, vec3 dp2, vec2 duv1, vec2 duv2) {
  return normalize(dp1 * duv2.y - dp2 * duv1.y);
}

vec3 bitangent(vec3 n, vec3 dp1, vec3 dp2, vec2 duv1, vec2 duv2) {
  return normalize(dp2 * duv1.x - dp1 * duv2.x);
}

void main() {
  vec3 Ng = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float limbMask = smoothstep(0.0, 0.2, clamp(dot(Ng, V), 0.0, 1.0));
  vec3 dp1 = dFdx(vWorldPos);
  vec3 dp2 = dFdy(vWorldPos);
  vec2 duv1 = dFdx(vUv);
  vec2 duv2 = dFdy(vUv);
  vec3 T = tangent(Ng, dp1, dp2, duv1, duv2);
  vec3 B = bitangent(Ng, dp1, dp2, duv1, duv2);
  vec3 N = Ng;

  if (uHasDisp > 0.5) {
    float hC = texture2D(uDisp, vUv).r;
    float hR = texture2D(uDisp, vUv + vec2(uDispTexel.x, 0.0)).r;
    float hU = texture2D(uDisp, vUv + vec2(0.0, uDispTexel.y)).r;
    N = normalize(N - T * (hR - hC) * uBump - B * (hU - hC) * uBump);
  } else if (uFallback > 0.5) {
    float e = 0.0016;
    float cC = craterField(vUv);
    float cR = craterField(vUv + vec2(e, 0.0));
    float cU = craterField(vUv + vec2(0.0, e));
    N = normalize(N - T * (cR - cC) * 1.8 - B * (cU - cC) * 1.8);
  }

  vec3 photo = pow(texture2D(uMap, vUv).rgb, vec3(2.2));
  if (uHasMap > 0.5) {
    float lC = dot(photo, vec3(0.2126, 0.7152, 0.0722));
    float lR = dot(pow(texture2D(uMap, vUv + vec2(uColorTexel.x * 2.0, 0.0)).rgb, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
    float lU = dot(pow(texture2D(uMap, vUv + vec2(0.0, uColorTexel.y * 2.0)).rgb, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
    N = normalize(N - T * (lR - lC) * 0.22 - B * (lU - lC) * 0.22);
  }
  N = normalize(mix(Ng, N, limbMask));

  vec3 albedo = vec3(0.0);
  if (uHasMap > 0.5) albedo = photo;
  else if (uFallback > 0.5) albedo = proceduralAlbedo(vUv);
  // The color map is reflectance. Keep it neutral so highlands stay stone, not plastic blue.
  albedo *= vec3(1.0, 0.985, 0.96);

  vec3 L = normalize(uLightDir);
  // A partly smoothed normal keeps crater rims in the light without a one-pixel knife.
  vec3 Nsoft = normalize(mix(Ng, N, 0.55));
  float ndl = dot(Nsoft, L);
  float relief = dot(N, L) - ndl;
  // Short penumbra, then a softened cosine: brightest at the subsolar point,
  // falling toward the terminator the way a sunlit sphere does.
  float penumbra = smoothstep(-0.12, 0.22, ndl);
  float body = pow(clamp(ndl, 0.0, 1.0), 0.62);
  float sun = penumbra * (0.38 + 0.62 * body);
  float dayShade = clamp(1.0 + relief * 0.7, 0.8, 1.14);

  float facing = clamp(dot(Ng, V), 0.0, 1.0);
  float limb = pow(max(facing, 0.001), 0.4);
  vec3 lightColor = vec3(1.0, 0.965, 0.91);
  vec3 lit = albedo * lightColor * sun * dayShade * mix(0.9, 1.0, limb) * 1.05;

  // Earth sits on +Z. Its fill is faint, blue, and strongest at new moon.
  vec3 earthDir = vec3(0.0, 0.0, 1.0);
  float earthPhase = pow(clamp(0.5 * (1.0 - dot(L, earthDir)), 0.0, 1.0), 0.9);
  float earthNd = clamp(dot(N, earthDir) * 0.55 + 0.38, 0.38, 1.0);
  float earthFill = 0.034 + 0.07 * earthPhase;
  vec3 earth = albedo * vec3(0.46, 0.56, 0.78) * earthNd * earthFill;
  float night = 1.0 - smoothstep(0.02, 0.58, sun);
  vec3 color = lit + earth * night;
  vec3 bg = vec3(0.0235, 0.0353, 0.0627);
  vec3 shown = mix(bg, color, clamp(uReveal, 0.0, 1.0));
  gl_FragColor = linearToOutputTexel(vec4(shown, 1.0));
}
`;

function placeholderTexture() {
  const data = new Uint8Array([0, 0, 0, 255]);
  const texture = new THREE.DataTexture(data, 1, 1);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function prepTexture(texture, renderer) {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

/** World light that spins with the mesh. `extra` is yaw past the nearside rest pose. */
export function yawLockedLight(dir, extra, out) {
  const c = Math.cos(extra);
  const s = Math.sin(extra);
  out.set(dir.x * c + dir.z * s, dir.y, -dir.x * s + dir.z * c);
  return out;
}

function slerpDir(a, b, t) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9995) return a.clone().lerp(b, t).normalize();
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * theta) / sinTheta)
    .addScaledVector(b, Math.sin(t * theta) / sinTheta)
    .normalize();
}

export function createMoon(renderer) {
  const base = import.meta.env.BASE_URL;
  const loader = new THREE.TextureLoader();
  const loadTexture = (url) =>
    new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, () => reject(new Error(url)));
    });
  const colorLoad = loadTexture(`${base}assets/moon/lroc_color.jpg`);
  const bumpLoad = loadTexture(`${base}assets/moon/ldem_bump.png`);

  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 256, 128);
  const uniforms = {
    uMap: { value: placeholderTexture() },
    uDisp: { value: placeholderTexture() },
    uHasMap: { value: 0 },
    uHasDisp: { value: 0 },
    uMapMix: { value: 0 },
    uFallback: { value: 0 },
    uLightDir: { value: new THREE.Vector3(0, 0, 1) },
    uReveal: { value: 0 },
    uDispTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1024) },
    uColorTexel: { value: new THREE.Vector2(1 / 4096, 1 / 2048) },
    uBump: { value: 2.6 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // NASA maps are centered on longitude 0°. Sphere u=0.5 sits on +X;
  // a −90° yaw brings the nearside to the camera on +Z.
  const BASE_YAW = -Math.PI / 2;
  mesh.rotation.y = BASE_YAW;
  mesh.visible = false;

  const anchor = new THREE.Group();
  anchor.add(mesh);

  let mapReady = false;
  let failed = false;
  let sawIntro = false;
  let lateFadeStart = null;

  const assets = Promise.allSettled([colorLoad, bumpLoad]).then(([colorResult, dispResult]) => {
    if (colorResult.status === 'fulfilled') {
      const texture = prepTexture(colorResult.value, renderer);
      uniforms.uMap.value = texture;
      uniforms.uHasMap.value = 1;
      uniforms.uMapMix.value = 1;
      if (texture.image?.width && texture.image?.height) {
        uniforms.uColorTexel.value.set(1 / texture.image.width, 1 / texture.image.height);
      }
      mapReady = true;
    } else {
      failed = true;
      uniforms.uFallback.value = 1;
    }

    if (dispResult.status === 'fulfilled') {
      const texture = prepTexture(dispResult.value, renderer);
      uniforms.uDisp.value = texture;
      uniforms.uHasDisp.value = 1;
      if (texture.image?.width && texture.image?.height) {
        uniforms.uDispTexel.value.set(1 / texture.image.width, 1 / texture.image.height);
      }
    } else if (!failed) {
      failed = false;
    }

    return { color: !failed && mapReady, displacement: dispResult.status === 'fulfilled', fallback: !mapReady };
  });

  let fromDir = new THREE.Vector3(0, 0, 1);
  let toDir = new THREE.Vector3(0, 0, 1);
  let currentDir = new THREE.Vector3(0, 0, 1);
  let lerpStart = 0;
  let lerping = false;
  let lerpMs = 680;
  let lerpSettle = 'even';
  let spin = null;

  function phaseEase(t) {
    if (lerpSettle !== 'late') return easeInOutCubic(t);
    const u = Math.min(1, Math.max(0, (t - 0.42) / 0.58));
    return easeInOutCubic(u);
  }

  function paintLight() {
    yawLockedLight(currentDir, mesh.rotation.y - BASE_YAW, uniforms.uLightDir.value);
  }

  /**
   * Move the mesh about celestial north, then stop on the nearside.
   * `turns` is a few full revolutions for a long date jump.
   * `sway` is a small there-and-back nod for a single day.
   * The sun direction is rotated by the same yaw, so the terminator
   * stays glued to the ball while it moves.
   */
  function spinBy(turns, { duration = 1760, now = performance.now(), sway = 0 } = {}) {
    const tau = Math.PI * 2;
    if (duration <= 0) {
      mesh.rotation.y = BASE_YAW;
      spin = null;
      paintLight();
      return;
    }
    if (sway) {
      spin = { mode: 'sway', start: now, duration, from: mesh.rotation.y, sway };
      return;
    }
    if (!Number.isFinite(turns) || turns === 0) {
      mesh.rotation.y = BASE_YAW;
      spin = null;
      paintLight();
      return;
    }
    const from = mesh.rotation.y;
    let dest = from + turns * tau;
    const cycles = Math.round((dest - BASE_YAW) / tau);
    dest = BASE_YAW + cycles * tau;
    if ((dest - from) * turns <= 0) dest += Math.sign(turns) * tau;
    spin = { mode: 'turns', start: now, duration, from, to: dest };
  }

  function setSunDirection(dir, { immediate = false, duration = 680, now = performance.now(), settle = 'even' } = {}) {
    const next = new THREE.Vector3(dir.x, dir.y, dir.z);
    if (next.lengthSq() < 1e-8) return;
    next.normalize();
    if (immediate || duration <= 0) {
      currentDir.copy(next);
      fromDir.copy(next);
      toDir.copy(next);
      lerping = false;
      paintLight();
      return;
    }
    fromDir.copy(currentDir);
    toDir.copy(next);
    lerpStart = now;
    lerpMs = duration;
    lerpSettle = settle === 'late' ? 'late' : 'even';
    lerping = true;
  }

  function update(now, reveal) {
    if (spin) {
      const t = Math.min(1, (now - spin.start) / spin.duration);
      if (spin.mode === 'sway') {
        const residual = (spin.from - BASE_YAW) * (1 - t);
        mesh.rotation.y = BASE_YAW + residual + spin.sway * Math.sin(Math.PI * t);
      } else {
        const eased = easeInOutCubic(t);
        mesh.rotation.y = spin.from + (spin.to - spin.from) * eased;
      }
      if (t >= 1) {
        mesh.rotation.y = BASE_YAW;
        spin = null;
      }
    }

    if (lerping) {
      const t = Math.min(1, (now - lerpStart) / lerpMs);
      currentDir.copy(slerpDir(fromDir, toDir, phaseEase(t)));
      if (t >= 1) lerping = false;
    }
    paintLight();

    if (!mapReady && !failed) {
      mesh.visible = false;
      uniforms.uReveal.value = 0;
      return;
    }

    if (failed) {
      mesh.visible = true;
      uniforms.uReveal.value = reveal;
      return;
    }

    if (reveal < 0.999) {
      sawIntro = true;
      mesh.visible = reveal > 0.001;
      uniforms.uReveal.value = reveal;
      return;
    }

    if (sawIntro) {
      mesh.visible = true;
      uniforms.uReveal.value = 1;
      return;
    }

    if (lateFadeStart == null) lateFadeStart = now;
    const fade = Math.min(1, (now - lateFadeStart) / 800);
    mesh.visible = true;
    uniforms.uReveal.value = easeInOutCubic(fade);
  }

  return {
    anchor,
    radius: MOON_RADIUS,
    assets,
    setSunDirection,
    spinBy,
    update,
  };
}
