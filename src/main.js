import * as THREE from 'three';
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
  gl.setClearColor(0x060910, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 800);
  camera.position.set(0, 0, 8);

  const moon = createMoon(gl);
  moonApi = moon;
  moon.anchor.traverse((obj) => {
    if (obj.isMesh) obj.renderOrder = 2;
  });
  const stars = createStars({
    reducedMotion: reduceMotion,
    mobile: window.matchMedia('(max-width: 720px), (pointer: coarse)').matches,
  });
  stars.setPixelRatio(gl.getPixelRatio());
  scene.add(stars.object);
  scene.add(moon.anchor);

  const pointRange = gl.getContext().getParameter(gl.getContext().ALIASED_POINT_SIZE_RANGE);
  if (!pointRange || pointRange[1] < 4) stars.useFallback();

  mountGrain();

  const brand = document.querySelector('.brand');

  function frameCamera() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw <= 720;
    const shortSide = Math.min(vw, vh);
    const landscapeShort = shortSide <= 520 && vw > vh;
    const brandRect = brand.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = landscapeShort ? 18 : mobile ? 28 : 44;
    const topPad = landscapeShort ? 8 : mobile ? 12 : 20;
    const topLimit = Math.max(brandRect.bottom, 0) + topPad;
    let panelTop = panelRect.top;
    const panelLooksUnmeasured = panelRect.height < 24 || panelTop < vh * 0.4;
    if (panelLooksUnmeasured) {
      panelTop = vh * (landscapeShort ? 0.74 : mobile ? 0.62 : 0.66);
    }
    const bottomLimit = panelTop - gap;
    const availH = Math.max(72, bottomLimit - topLimit);
    const side = landscapeShort ? 16 : mobile ? 18 : 64;
    const widthCap = (vw - side * 2) * (landscapeShort ? 0.42 : mobile ? 0.86 : 0.56);
    const heightCap = availH * (landscapeShort ? 0.92 : 0.86);
    const vhCap = vh * (landscapeShort ? 0.5 : mobile ? 0.58 : 0.52);
    const targetPx = Math.max(72, Math.min(heightCap, widthCap, vhCap));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const tanHalf = Math.tan(vFov / 2);
    const fitDist = (moon.radius * vh) / (tanHalf * targetPx);
    // Center the disk in the open sky between the brand and the floating HUD.
    const freeCenter = topLimit + availH / 2;
    const y = fitDist * tanHalf * ((vh - 2 * freeCenter) / vh);

    moon.anchor.position.set(0, y, 0);
    stars.object.position.set(0, 0, 0);
    camera.position.set(0, 0, fitDist);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.aspect = vw / Math.max(1, vh);
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stars.setPixelRatio(gl.getPixelRatio());
    gl.setSize(vw, vh, false);
  }

  const introStart = performance.now();

  applyDate(new Date(), { live: true, immediate: true });
  frameCamera();

  const shaderLog = console.error;
  let shaderFailed = false;
  console.error = (...args) => {
    if (/shader/i.test(args.map(String).join(' '))) shaderFailed = true;
    shaderLog.apply(console, args);
  };
  try {
    gl.compile(scene, camera);
  } finally {
    console.error = shaderLog;
  }
  if (shaderFailed) stars.useFallback();

  moon.assets.then((status) => {
    ui.setFallback(Boolean(status.fallback));
  });

  const resizeObserver = new ResizeObserver(() => frameCamera());
  resizeObserver.observe(panel);
  if (brand) resizeObserver.observe(brand);
  window.addEventListener('resize', frameCamera);
  window.visualViewport?.addEventListener('resize', frameCamera);
  requestAnimationFrame(frameCamera);

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
    stars.setFade(Math.min(1, reveal * 1.4));
    stars.update(now * 0.001);
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
