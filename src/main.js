import * as THREE from 'three';
import {
  computeLunar,
  formatISODateShanghai,
  formatShanghaiMonthDay,
  isMidAutumn,
  isSameShanghaiDate,
  shanghaiDayIndex,
} from './astronomy.js';
import { createMoon } from './moon.js';
import { poemForMidAutumn, poemForPhase } from './poems.js';
import { createStars, diurnalNights, SKY_POSE_PER_DAY } from './stars.js';
import { mountUI } from './ui.js';
import './style.css';

const canvas = document.querySelector('#scene');
const panel = document.querySelector('#panel');
const webglError = document.querySelector('#webgl-error');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SHARE_W = 2160;
const SHARE_H = 3840;
const DUAL_W = 2880;
const DUAL_H = 3840;
// Gap between the disks is one third of a diameter, so the centers sit 4/3 radii apart.
const PAIR_SEP = 4 / 3;
const PAIR_SPAN = 1 + PAIR_SEP;
const LARGE_DAY = 1.5;
const LARGE_MS = 1760;
const GENTLE_MS = 1100;

const opened = new Date();
const people = [
  { name: '', date: new Date(opened.getTime()), live: true, poem: null, poemKey: '', info: null },
  { name: '', date: new Date(opened.getTime()), live: false, poem: null, poemKey: '', info: null },
];
let viewMode = 'single';
let activeIndex = 0;
let skyAnchor = null;
const shownAt = [null, null];
let moons = null;
let starsApi = null;
let frameCamera = () => {};
let renderer = null;

function skyPose(date) {
  return shanghaiDayIndex(date) * SKY_POSE_PER_DAY;
}

function focusIndex() {
  return viewMode === 'single' ? 0 : activeIndex;
}

function assignPoem(person, info) {
  const key = isMidAutumn(person.date) ? '中秋' : info.name;
  if (person.poem && person.poemKey === key) return;
  const other = people.find((entry) => entry !== person);
  const avoid = other?.poem?.text;
  person.poem = key === '中秋' ? poemForMidAutumn(avoid) : poemForPhase(info.name, avoid);
  person.poemKey = key;
}

function viewModel() {
  const focus = focusIndex();
  return {
    mode: viewMode,
    active: focus,
    festival: Boolean(people[focus].info) && isMidAutumn(people[focus].date),
    showToday: !isSameShanghaiDate(people[focus].date, new Date()),
    people: people.map((person) => ({
      name: person.name,
      date: person.date,
      info: person.info,
      poem: person.poem,
    })),
  };
}

function present({ now = performance.now(), sky = 'animate', easeLight = true } = {}) {
  people.forEach((person) => {
    try {
      person.info = computeLunar(person.date);
      assignPoem(person, person.info);
    } catch {
      person.info = null;
    }
  });
  ui.render(viewModel());

  if (moons) {
    people.forEach((person, index) => {
      if (!person.info) return;
      const next = person.date.getTime();
      const prev = shownAt[index];
      if (prev != null && prev === next) return;
      const delta = prev == null ? 0 : next - prev;
      const absDays = Math.abs(delta) / 86400000;
      const duration = !easeLight || reduceMotion || prev == null
        ? 0
        : (Math.abs(delta) > 60000 ? (absDays >= LARGE_DAY ? LARGE_MS : GENTLE_MS) : 680);
      moons[index].setSunDirection(person.info.sunDirection, {
        immediate: duration === 0,
        duration,
        now,
        settle: 'even',
      });
      shownAt[index] = next;
    });
  }

  if (!starsApi || sky === 'keep') return;
  const target = people[focusIndex()].date;
  if (sky === 'place' || skyAnchor == null) {
    starsApi.place(skyPose(target));
  } else {
    const delta = target.getTime() - skyAnchor.getTime();
    if (Math.abs(delta) > 60000) {
      const absDays = Math.abs(delta) / 86400000;
      const motionMs = absDays >= LARGE_DAY ? LARGE_MS : GENTLE_MS;
      starsApi.advance(delta, now, {
        duration: reduceMotion ? 0 : motionMs,
        nights: reduceMotion ? 0 : diurnalNights(absDays),
        pose: skyPose(target),
      });
    }
  }
  skyAnchor = new Date(target.getTime());
}

const ui = mountUI(document, opened, (event) => {
  const now = performance.now();
  if (event.type === 'name') {
    people[event.index].name = event.name;
    ui.render(viewModel());
    return;
  }
  if (event.type === 'mode') {
    viewMode = event.mode;
    if (viewMode === 'single') activeIndex = 0;
    present({ now, sky: 'place', easeLight: false });
    frameCamera();
    return;
  }
  if (event.type === 'active') {
    if (viewMode !== 'dual' || activeIndex === event.index) return;
    activeIndex = event.index;
    present({ now, sky: 'animate', easeLight: false });
    return;
  }
  if (event.type === 'date') {
    const index = viewMode === 'single' ? 0 : event.index;
    people[index].date = event.date;
    people[index].live = Boolean(event.live);
    activeIndex = index;
    present({ now, sky: 'animate', easeLight: true });
  }
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
  present({ sky: 'keep', easeLight: false });
} else {
  boot(renderer);
}

function boot(gl) {
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.setSize(window.innerWidth, window.innerHeight, false);
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.NoToneMapping;
  gl.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2400);
  camera.position.set(0, 0, 8);

  const moon = createMoon(gl);
  moons = moon.moons;
  for (const body of moons) {
    body.anchor.traverse((obj) => {
      if (obj.isMesh && obj.renderOrder < 2) obj.renderOrder = 2;
    });
    scene.add(body.anchor);
  }
  const stars = createStars({
    reducedMotion: reduceMotion,
    mobile: window.matchMedia('(max-width: 720px), (pointer: coarse)').matches,
  });
  stars.setPixelRatio(gl.getPixelRatio());
  starsApi = stars;
  scene.add(stars.object);

  const pointRange = gl.getContext().getParameter(gl.getContext().ALIASED_POINT_SIZE_RANGE);
  if (!pointRange || pointRange[1] < 4) stars.useFallback();

  mountGrain();

  const brand = document.querySelector('.brand');

  function placeMoons(pair, y) {
    const sep = pair ? moon.radius * PAIR_SEP : 0;
    moons[0].anchor.visible = true;
    moons[1].anchor.visible = pair;
    moons[0].anchor.position.set(pair ? -sep : 0, y, 0);
    moons[1].anchor.position.set(pair ? sep : 0, y, 0);
  }

  frameCamera = function frameCamera() {
    const pair = viewMode === 'dual';
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
    const widthBudget = vw - side * 2;
    const widthCap = widthBudget * (landscapeShort ? 0.92 : mobile ? 0.92 : pair ? 0.78 : 0.56);
    const heightCap = availH * (landscapeShort ? 0.92 : 0.86);
    const vhCap = vh * (landscapeShort ? 0.5 : mobile ? 0.58 : 0.52);
    const span = pair ? PAIR_SPAN : 1;
    const targetPx = Math.max(64, Math.min(widthCap / span, heightCap, vhCap));
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const tanHalf = Math.tan(vFov / 2);
    const fitDist = (moon.radius * vh) / (tanHalf * targetPx);
    const freeCenter = topLimit + availH / 2;
    const y = fitDist * tanHalf * ((vh - 2 * freeCenter) / vh);

    placeMoons(pair, y);
    stars.object.position.set(0, 0, 0);
    camera.position.set(0, 0, fitDist);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.aspect = vw / Math.max(1, vh);
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stars.setPixelRatio(gl.getPixelRatio());
    gl.setSize(vw, vh, false);
  };

  function frameShare(index) {
    const body = moons[index];
    const other = moons[1 - index];
    body.anchor.visible = true;
    other.anchor.visible = false;
    camera.aspect = SHARE_W / SHARE_H;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const tanHalf = Math.tan(vFov / 2);
    const targetPx = SHARE_W * 0.66;
    const fitDist = (moon.radius * SHARE_H) / (tanHalf * targetPx);
    const freeCenter = SHARE_H * 0.38;
    const y = fitDist * tanHalf * ((SHARE_H - 2 * freeCenter) / SHARE_H);
    body.anchor.position.set(0, y, 0);
    stars.object.position.set(0, 0, 0);
    camera.position.set(0, 0, fitDist);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function frameDualShare() {
    moons[0].anchor.visible = true;
    moons[1].anchor.visible = true;
    camera.aspect = DUAL_W / DUAL_H;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const tanHalf = Math.tan(vFov / 2);
    const targetPx = DUAL_W * 0.3;
    const fitDist = (moon.radius * DUAL_H) / (tanHalf * targetPx);
    const freeCenter = DUAL_H * 0.4;
    const y = fitDist * tanHalf * ((DUAL_H - 2 * freeCenter) / DUAL_H);
    const sep = moon.radius * PAIR_SEP;
    moons[0].anchor.position.set(-sep, y, 0);
    moons[1].anchor.position.set(sep, y, 0);
    stars.object.position.set(0, 0, 0);
    camera.position.set(0, 0, fitDist);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const offsetX = (targetPx * 2) / 3;
    return {
      targetPx,
      centers: [
        { x: DUAL_W / 2 - offsetX, y: freeCenter },
        { x: DUAL_W / 2 + offsetX, y: freeCenter },
      ],
    };
  }

  const introStart = performance.now();
  let lastLiveSample = performance.now();

  present({ sky: 'place', easeLight: true });
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
  canvas.dataset.starfield = stars.mode;

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
    if (document.hidden || !people.some((person) => person.live)) return;
    const stamp = new Date();
    for (const person of people) {
      if (person.live) person.date = stamp;
    }
    present({ sky: 'animate', easeLight: true });
    lastLiveSample = performance.now();
  });

  function tick(now) {
    requestAnimationFrame(tick);
    if (people.some((person) => person.live) && now - lastLiveSample > 20000) {
      lastLiveSample = now;
      const stamp = new Date();
      for (const person of people) {
        if (person.live) person.date = stamp;
      }
      present({ now, sky: 'animate', easeLight: true });
    }
    const introDur = reduceMotion ? 1 : 1500;
    const intro = Math.min(1, (now - introStart) / introDur);
    const reveal = 1 - (1 - intro) ** 3;
    for (const body of moons) body.update(now, reveal);
    stars.setFade(Math.min(1, reveal * 1.4));
    stars.update(now);
    gl.render(scene, camera);
  }

  ui.bindShare(() => shareView(gl, scene, camera, stars, frameShare, frameDualShare));

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

function paintSharePlate(ctx, width, height, caption, originX = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(originX, 0, width, height);
  ctx.clip();
  ctx.translate(originX, 0);

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.38,
    Math.min(width, height) * 0.12,
    width * 0.5,
    height * 0.4,
    Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const minSide = Math.min(width, height);
  const x0 = Math.round(width * 0.08);
  const maxText = Math.round(width * 0.84);
  const phaseSize = Math.max(64, Math.round(minSide * 0.052));
  const nameSize = Math.max(40, Math.round(minSide * 0.03));
  const dateSize = Math.max(36, Math.round(minSide * 0.026));
  const poemSize = Math.max(36, Math.round(minSide * 0.03));
  const authorSize = Math.max(28, Math.round(minSide * 0.022));
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
      tracking: authorSize * 0.14,
    });
  }
  if (caption.poem?.text) {
    ctx.font = `400 ${poemSize}px ${SHARE_SERIF}`;
    const wrapped = wrapGlyphs(ctx, caption.poem.text, maxText, poemSize * 0.06);
    for (let i = wrapped.length - 1; i >= 0; i -= 1) {
      stack.push({
        text: wrapped[i],
        size: poemSize,
        font: SHARE_SERIF,
        color: 'rgba(236, 240, 246, 0.9)',
        tracking: poemSize * 0.06,
      });
    }
  }
  if (caption.dateLabel) {
    stack.push({
      text: caption.dateLabel,
      size: dateSize,
      font: SHARE_SANS,
      color: 'rgba(236, 240, 246, 0.84)',
      tracking: dateSize * 0.16,
    });
  }
  if (caption.name) {
    stack.push({
      text: caption.name,
      size: nameSize,
      font: SHARE_SANS,
      color: 'rgba(236, 240, 246, 0.92)',
      tracking: nameSize * 0.14,
    });
  }
  if (showPhase) {
    stack.push({
      text: phase,
      size: phaseSize,
      font: SHARE_SERIF,
      color: 'rgba(236, 240, 246, 0.94)',
      tracking: phaseSize * 0.16,
    });
  }

  let y = height - Math.round(height * 0.07);
  for (const line of stack) {
    ctx.font = `400 ${line.size}px ${line.font}`;
    ctx.fillStyle = line.color;
    ctx.shadowBlur = line.size * 0.35;
    paintTracked(ctx, line.text, x0, y, line.tracking);
    y -= Math.round(line.size * 1.5);
  }
  ctx.restore();
}

function captionFor(index) {
  const person = people[index];
  return {
    phase: person.info?.name ?? '',
    name: person.name.trim(),
    dateLabel: formatShanghaiMonthDay(person.date),
    poem: person.poem,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatDotDate(date) {
  return formatISODateShanghai(date).replaceAll('-', '.');
}

function paintDotDate(ctx, text, x, y, size) {
  ctx.save();
  ctx.font = `500 ${size}px ${SHARE_SANS}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(4, 8, 16, 0.6)';
  ctx.shadowBlur = size * 0.4;
  const tracking = size * 0.08;
  let width = 0;
  for (const glyph of text) width += ctx.measureText(glyph).width + tracking;
  width -= tracking;
  let cursor = x - width / 2;
  for (const glyph of text) {
    ctx.fillText(glyph, cursor, y);
    cursor += ctx.measureText(glyph).width + tracking;
  }
  ctx.restore();
}

async function shareView(gl, scene, camera, stars, frameShare, frameDualShare) {
  const button = document.querySelector('#share');
  if (button) button.disabled = true;
  let resized = false;
  try {
    const dual = viewMode === 'dual';
    const frameW = dual ? DUAL_W : SHARE_W;
    const frameH = dual ? DUAL_H : SHARE_H;
    const plate = document.createElement('canvas');
    plate.width = frameW;
    plate.height = frameH;
    const ctx = plate.getContext('2d');
    const source = gl.domElement;
    stars.setPixelRatio(frameH / Math.max(1, window.innerHeight));
    gl.setPixelRatio(1);
    gl.setSize(frameW, frameH, false);
    resized = true;

    if (dual) {
      const layout = frameDualShare();
      gl.render(scene, camera);
      ctx.drawImage(source, 0, 0, frameW, frameH, 0, 0, frameW, frameH);
      const dateSize = Math.round(layout.targetPx * 0.115);
      const dateY = layout.centers[0].y + layout.targetPx * 0.5 + layout.targetPx * 0.34;
      paintDotDate(ctx, formatDotDate(people[0].date), layout.centers[0].x, dateY, dateSize);
      paintDotDate(ctx, formatDotDate(people[1].date), layout.centers[1].x, dateY, dateSize);
    } else {
      frameShare(0);
      gl.render(scene, camera);
      ctx.drawImage(source, 0, 0, frameW, frameH, 0, 0, frameW, frameH);
      paintSharePlate(ctx, SHARE_W, SHARE_H, captionFor(0), 0);
    }

    frameCamera();
    gl.render(scene, camera);
    resized = false;

    const blob = await new Promise((resolve) => plate.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const left = formatISODateShanghai(people[0].date);
    const filename = dual
      ? `moon-${left}_${formatISODateShanghai(people[1].date)}.png`
      : `moon-${left}.png`;
    const names = (dual ? people : [people[0]]).map((person) => person.name.trim()).filter(Boolean);
    const phase = people[focusIndex()].info?.name;
    const title = names.length
      ? `观月 · ${names.join(' · ')}`
      : (phase ? `观月 · ${phase}` : '观月');
    const file = new File([blob], filename, { type: 'image/png' });
    const payload = { files: [file], title };
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
    if (resized) {
      frameCamera();
      gl.render(scene, camera);
    }
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
