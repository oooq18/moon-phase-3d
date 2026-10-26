import * as THREE from 'three';
import { computeLunar, formatISODateShanghai, formatShanghaiMonthDay } from './astronomy.js';
import { createMoon } from './moon.js';
import { poemForPhase } from './poems.js';
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
let starsApi = null;
let renderer = null;

function applyDate(date, { live: nextLive, immediate, litMs }) {
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
  const duration = reduceMotion ? 0 : (litMs ?? 680);
  moonApi.setSunDirection(info.sunDirection, {
    immediate: Boolean(immediate) || duration === 0,
    duration,
  });
}

const STEP_TURNS = 3;
const STEP_MS = 1760;

const ui = mountUI(document, new Date(), (date, { live: nextLive }) => {
  const previous = currentDate.getTime();
  const delta = date.getTime() - previous;
  const step = !reduceMotion && Math.abs(delta) > 60000;
  const now = performance.now();
  applyDate(date, { live: nextLive, immediate: false, litMs: step ? 980 : 680 });
  if (step && moonApi) moonApi.spinBy(delta > 0 ? STEP_TURNS : -STEP_TURNS, { duration: STEP_MS, now });
  if (starsApi) starsApi.advance(delta, now, { duration: STEP_MS, turns: STEP_TURNS });
  if (nextLive) lastLiveSample = now;
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
  ui.setShareEnabled(false);
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
  starsApi = stars;
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
    stars.update(now);
    gl.render(scene, camera);
  }

  ui.bindShare((date) => shareView(gl, scene, camera, date));

  requestAnimationFrame(tick);

}

const SHARE_SERIF = '"Iowan Old Style", Palatino, "Songti SC", "Noto Serif CJK SC", "Noto Sans CJK SC", serif';
const SHARE_SANS = '"PingFang SC", "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif';

function paintTracked(ctx, text, x, y, tracking) {
  for (const glyph of text) {
    ctx.fillText(glyph, x, y);
    x += ctx.measureText(glyph).width + tracking;
  }
  return x;
}

function wrapGlyphs(ctx, text, maxWidth, tracking) {
  const lines = [];
  let line = '';
  let width = 0;
  for (const glyph of text) {
    const advance = ctx.measureText(glyph).width + tracking;
    if (line && width + advance > maxWidth) {
      lines.push(line);
      line = glyph;
      width = advance;
    } else {
      line += glyph;
      width += advance;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function paintSharePlate(ctx, width, height, caption) {
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    Math.min(width, height) * 0.2,
    width * 0.5,
    height * 0.42,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(5, 7, 13, 0)');
  vignette.addColorStop(1, 'rgba(5, 7, 13, 0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const minSide = Math.min(width, height);
  const x0 = Math.round(width * 0.06);
  const maxText = Math.round(width * 0.56);
  const phaseSize = Math.max(28, Math.round(minSide * 0.05));
  const dateSize = Math.max(16, Math.round(minSide * 0.026));
  const poemSize = Math.max(16, Math.round(minSide * 0.028));
  const authorSize = Math.max(14, Math.round(minSide * 0.02));
  const phase = caption.phase;
  const showPhase = phase && phase !== '—' && phase !== '无法计算';

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(5, 7, 13, 0.72)';

  const stack = [];
  if (caption.poem?.author) {
    stack.push({
      text: caption.poem.author,
      size: authorSize,
      font: SHARE_SANS,
      color: 'rgba(236, 240, 246, 0.7)',
      tracking: authorSize * 0.12,
    });
  }
  if (caption.poem?.text) {
    ctx.font = `400 ${poemSize}px ${SHARE_SERIF}`;
    const wrapped = wrapGlyphs(ctx, caption.poem.text, maxText, poemSize * 0.04);
    for (let i = wrapped.length - 1; i >= 0; i -= 1) {
      stack.push({
        text: wrapped[i],
        size: poemSize,
        font: SHARE_SERIF,
        color: 'rgba(236, 240, 246, 0.88)',
        tracking: poemSize * 0.04,
      });
    }
  }
  if (caption.dateLabel) {
    stack.push({
      text: caption.dateLabel,
      size: dateSize,
      font: SHARE_SANS,
      color: 'rgba(236, 240, 246, 0.82)',
      tracking: dateSize * 0.12,
    });
  }
  if (showPhase) {
    stack.push({
      text: phase,
      size: phaseSize,
      font: SHARE_SERIF,
      color: 'rgba(236, 240, 246, 0.92)',
      tracking: phaseSize * 0.14,
    });
  }

  let y = height - Math.round(height * 0.055);
  for (const line of stack) {
    ctx.font = `400 ${line.size}px ${line.font}`;
    ctx.fillStyle = line.color;
    ctx.shadowBlur = line.size * 0.35;
    paintTracked(ctx, line.text, x0, y, line.tracking);
    y -= Math.round(line.size * 1.45);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function shareView(gl, scene, camera, date) {
  const button = document.querySelector('#share');
  if (button) button.disabled = true;
  try {
    // Copy in this turn. Without preserveDrawingBuffer the canvas is cleared
    // after the browser composites, so a later toBlob would be blank.
    gl.render(scene, camera);
    const source = gl.domElement;
    const plate = document.createElement('canvas');
    plate.width = source.width;
    plate.height = source.height;
    const ctx = plate.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const phase = document.querySelector('#phase-name').textContent.trim();
    const poem = ui.currentPoem() || poemForPhase(phase);
    paintSharePlate(ctx, plate.width, plate.height, {
      phase,
      dateLabel: formatShanghaiMonthDay(date),
      poem,
    });
    const blob = await new Promise((resolve) => plate.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const filename = `moon-${formatISODateShanghai(date)}.png`;
    const file = new File([blob], filename, { type: 'image/png' });
    const payload = { files: [file], title: phase ? `观月 · ${phase}` : '观月' };
    if (typeof navigator.canShare === 'function' && navigator.canShare(payload)) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, filename);
  } finally {
    if (button) button.disabled = false;
  }
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
