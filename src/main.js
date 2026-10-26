import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { computeLunar } from './astronomy.js';
import { createMoon } from './moon.js';
import { createStars } from './stars.js';
import { mountUI } from './ui.js';
import './style.css';

const canvas = document.querySelector('#scene');
const panel = document.querySelector('#panel');
const webglError = document.querySelector('#webgl-error');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let live = true;
let currentDate = new Date();
let lastLiveSample = performance.now();
let moonApi = null;
let renderer = null;

function applyDate(date, { live: nextLive, immediate }) {
  currentDate = date;
  live = nextLive;
  let info;
  try {
    info = computeLunar(date);
  } catch (error) {
    document.querySelector('#phase-name').textContent = '无法计算';
    return;
  }
  ui.render(info, date);
  if (!moonApi) return;
  const duration = reduceMotion ? 0 : 680;
  moonApi.setSunDirection(info.sunDirection, {
    immediate: Boolean(immediate) || duration === 0,
    duration,
  });
}

const ui = mountUI(document, new Date(), (date, { live: nextLive }) => {
  applyDate(date, { live: nextLive, immediate: false });
  if (nextLive) lastLiveSample = performance.now();
});

function showWebGLError() {
  webglError.hidden = false;
}

try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
} catch (error) {
  showWebGLError();
}

if (!renderer) {
  applyDate(currentDate, { live: true, immediate: true });
} else {
  boot(renderer);
}

function boot(gl) {
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.setSize(window.innerWidth, window.innerHeight, false);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;
  gl.setClearColor(0x070b12, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  camera.position.set(0, 0, 8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.55;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  const moon = createMoon(gl);
  moonApi = moon;
  const stars = createStars();
  stars.setPixelRatio(gl.getPixelRatio());
  moon.anchor.add(stars.object);
  scene.add(moon.anchor);

  mountGrain();

  let framedOnce = false;
  let lastFitDist = 8;

  function frameCamera(preserveOrbit) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const panelTop = panel.getBoundingClientRect().top || vh;
    const topGap = vw < 720 ? 72 : 24;
    const availH = Math.max(150, panelTop - topGap - 20);
    const targetPx = Math.max(150, Math.min(availH * 0.9, vw * 0.8, vh * 0.7));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const fitDist = (moon.radius * vh) / (Math.tan(vFov / 2) * targetPx);
    const freeCenter = topGap + availH / 2;
    const y = ((vh * 0.5 - freeCenter) * (2 * Math.tan(vFov / 2) * fitDist)) / vh;

    let polar = Math.PI / 2;
    let azimuth = 0;
    let radius = fitDist;
    if (preserveOrbit && framedOnce) {
      const relative = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(relative);
      polar = spherical.phi;
      azimuth = spherical.theta;
      const ratio = spherical.radius / lastFitDist;
      radius = THREE.MathUtils.clamp(fitDist * ratio, fitDist * 0.8, fitDist * 1.65);
    }

    lastFitDist = fitDist;
    framedOnce = true;
    moon.anchor.position.y = y;
    controls.target.set(0, y, 0);
    const offset = new THREE.Vector3().setFromSphericalCoords(radius, polar, azimuth);
    camera.position.copy(controls.target).add(offset);
    controls.minDistance = fitDist * 0.78;
    controls.maxDistance = fitDist * 1.75;
    camera.aspect = vw / Math.max(1, vh);
    camera.updateProjectionMatrix();
    gl.setSize(vw, vh, false);
    controls.update();
  }

  const introStart = performance.now();

  applyDate(new Date(), { live: true, immediate: true });
  frameCamera(false);

  moon.assets.then((status) => {
    ui.setFallback(Boolean(status.fallback));
  });

  const resizeObserver = new ResizeObserver(() => frameCamera(true));
  resizeObserver.observe(panel);
  window.addEventListener('resize', () => frameCamera(true));

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showWebGLError();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && live) {
      applyDate(new Date(), { live: true, immediate: false });
      lastLiveSample = performance.now();
    }
  });

  function tick(now) {
    requestAnimationFrame(tick);
    if (live && now - lastLiveSample > 20000) {
      lastLiveSample = now;
      applyDate(new Date(), { live: true, immediate: false });
    }
    const introDur = reduceMotion ? 1 : 1500;
    const intro = Math.min(1, (now - introStart) / introDur);
    const reveal = 1 - (1 - intro) ** 3;
    moon.update(now, reveal);
    stars.setFade(Math.min(1, reveal * 1.05));
    stars.update(now * 0.001);
    controls.update();
    gl.render(scene, camera);
  }

  requestAnimationFrame(tick);

}

function mountGrain() {
  const grain = document.querySelector('.grain');
  const noise = document.createElement('canvas');
  noise.width = 160;
  noise.height = 160;
  const ctx = noise.getContext('2d');
  const image = ctx.createImageData(160, 160);
  for (let i = 0; i < image.data.length; i += 4) {
    const n = 214 + Math.random() * 41;
    image.data[i] = n;
    image.data[i + 1] = n;
    image.data[i + 2] = n;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grain.style.backgroundImage = `url(${noise.toDataURL('image/png')})`;
}
