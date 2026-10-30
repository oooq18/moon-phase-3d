import * as THREE from 'three';
import {
  computeLunar,
  formatISODateShanghai,
  formatShanghaiYearMonthDay,
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
let beginPairTransition = () => {};
let renderer = null;

function skyPose(date) {
  return shanghaiDayIndex(date) * SKY_POSE_PER_DAY;
}

function focusIndex() {
  return viewMode === 'single' ? 0 : activeIndex;
}

function assignPoems() {
  if (viewMode === 'dual') {
    people.forEach((person) => {
      person.poem = null;
      person.poemKey = '';
    });
    return;
  }
  people.forEach((person) => {
    if (!person.info) return;
    const key = isMidAutumn(person.date) ? '中秋' : person.info.name;
    if (person.poem && person.poemKey === key) return;
    const other = people.find((entry) => entry !== person);
    person.poem = key === '中秋'
      ? poemForMidAutumn(other?.poem?.text)
      : poemForPhase(person.info.name, other?.poem?.text);
    person.poemKey = key;
  });
}

function viewModel() {
  const focus = focusIndex();
  return {
    mode: viewMode,
    active: focus,
    festival: viewMode === 'single' && Boolean(people[focus].info) && isMidAutumn(people[focus].date),
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
    } catch {
      person.info = null;
    }
  });
  assignPoems();
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
    beginPairTransition(viewMode === 'dual');
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

  // 双月切换不做淡入淡出。第二颗月亮始终是完全不透明的：
  // 起始时它正好藏在第一颗背后（沿视线略微后移，避免共面深度冲突），
  // 随后随分离量一起被推开——看起来是连续的物理运动，而不是凭空浮现。
  // 相机距离同步插值，所以画面不会因为构图目标突变而"跳一下"。
  const PAIR_MS = reduceMotion ? 0 : 900;
  let pairBlend = viewMode === 'dual' ? 1 : 0;
  let pairFrom = pairBlend;
  let pairTo = pairBlend;
  let pairStart = 0;
  let layout = null;

  // smoothstep：相机距离和 y 位移用，平稳不弹
  function easePair(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
  }
  // easeOutBack：分离距离带一点 overshoot，像月亮"弹"开
  function easeOutBack(t) {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  beginPairTransition = function beginPairTransition(pair) {
    const target = pair ? 1 : 0;
    if (target === pairTo) return;
    pairFrom = pairBlend;
    pairTo = target;
    pairStart = performance.now();
    if (PAIR_MS <= 0) pairBlend = target;
    moons[1].anchor.visible = true;
  };

  function updatePair(now) {
    if (pairFrom === pairTo) return;
    if (PAIR_MS <= 0) {
      pairBlend = pairTo;
      return;
    }
    const t = Math.min(1, (now - pairStart) / PAIR_MS);
    pairBlend = pairFrom + (pairTo - pairFrom) * easePair(t);
    if (t >= 1) pairBlend = pairTo;
  }

  function applyLayout() {
    if (!layout) return;
    const b = pairBlend;
    const dist = layout.single.dist + (layout.dual.dist - layout.single.dist) * b;
    const y = layout.single.y + (layout.dual.y - layout.single.y) * b;
    // 分离距离用 easeOutBack，带一点弹性 overshoot
    const sepT = easePair(b);
    const sep = moon.radius * PAIR_SEP * easeOutBack(sepT);
    // 第二颗月亮：从 0.3 倍大小长到 1，和分离同步
    const secondScale = 0.3 + 0.7 * sepT;
    moons[0].anchor.visible = true;
    moons[1].anchor.visible = b > 0.01 || pairTo > 0;
    moons[0].anchor.position.set(-sep, y, 0);
    moons[1].anchor.position.set(sep, y, -moon.radius * 0.01);
    moons[1].anchor.scale.setScalar(secondScale);
    camera.position.set(0, 0, dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
  }

  frameCamera = function frameCamera() {
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
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const tanHalf = Math.tan(vFov / 2);

    // 单月与双月两套构图都算出来，由 applyLayout 按过渡进度插值，
    // 避免切换瞬间相机距离突变导致月球大小"跳一下"。
    const fitFor = (pair) => {
      const widthCap = widthBudget * (landscapeShort ? 0.92 : mobile ? 0.92 : pair ? 0.78 : 0.56);
      const heightCap = availH * (landscapeShort ? 0.92 : 0.86);
      const vhCap = vh * (landscapeShort ? 0.5 : mobile ? 0.58 : 0.52);
      const span = pair ? PAIR_SPAN : 1;
      const targetPx = Math.max(64, Math.min(widthCap / span, heightCap, vhCap));
      const dist = (moon.radius * vh) / (tanHalf * targetPx);
      const freeCenter = topLimit + availH / 2;
      const y = dist * tanHalf * ((vh - 2 * freeCenter) / vh);
      return { dist, y };
    };

    layout = { single: fitFor(false), dual: fitFor(true) };

    camera.aspect = vw / Math.max(1, vh);
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stars.setPixelRatio(gl.getPixelRatio());
    gl.setSize(vw, vh, false);
    applyLayout();
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
    // 双月切换的推移在这里逐帧推进。reveal 只负责首屏淡入，
    // 切换月球走的是位置与相机距离插值，不碰任何透明度。
    updatePair(now);
    applyLayout();
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
    dateLabel: formatShanghaiYearMonthDay(person.date),
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

function measureTracked(ctx, text, tracking) {
  let width = 0;
  for (const glyph of text) width += ctx.measureText(glyph).width + tracking;
  if (text.length) width -= tracking;
  return width;
}

function fittedLines(ctx, text, maxWidth, tracking) {
  if (!text) return [];
  if (measureTracked(ctx, text, tracking) <= maxWidth) return [text];
  return wrapGlyphs(ctx, text, maxWidth, tracking);
}

function paintCentered(ctx, text, centerX, baseline, tracking) {
  paintTracked(ctx, text, centerX - measureTracked(ctx, text, tracking) / 2, baseline, tracking);
}

function dualType(px) {
  return {
    phaseSize: Math.max(60, Math.round(px * 0.17)),
    nameSize: Math.max(34, Math.round(px * 0.082)),
    dateSize: Math.max(32, Math.round(px * 0.074)),
  };
}

/**
 * Phase, name, and the year-date stay on one vertical grid under each moon.
 */
function buildDualLayout(ctx, columns, px) {
  const type = dualType(px);
  const nameTracking = type.nameSize * 0.12;
  const prepared = columns.map((column) => {
    const phase = column.caption.phase;
    const showPhase = Boolean(phase && phase !== '—' && phase !== '无法计算');
    ctx.font = `400 ${type.nameSize}px ${SHARE_SANS}`;
    const nameLines = fittedLines(ctx, column.caption.name, column.maxWidth, nameTracking);
    return {
      ...column,
      showPhase,
      phase: showPhase ? phase : '',
      nameLines,
      dateLabel: column.caption.dateLabel || '',
    };
  });

  const nameSlots = prepared.some((column) => column.nameLines.length)
    ? Math.max(1, ...prepared.map((column) => column.nameLines.length))
    : 0;

  const rows = [];
  let cursor = 0;
  const add = (key, size, step) => {
    rows.push({ key, size, baseline: cursor });
    cursor += step;
  };

  if (prepared.some((column) => column.showPhase)) {
    add('phase', type.phaseSize, Math.round(type.phaseSize * 1.14));
  }
  for (let i = 0; i < nameSlots; i += 1) {
    const last = i === nameSlots - 1;
    add(`name:${i}`, type.nameSize, Math.round(type.nameSize * (last ? 1.45 : 1.32)));
  }
  add('date', type.dateSize, Math.round(type.dateSize * 1.05));

  const ascent = rows.length ? rows[0].size * 0.86 : 0;
  const last = rows[rows.length - 1];
  const height = last ? ascent + last.baseline + Math.round(last.size * 0.32) : 0;
  return { rows, prepared, type, ascent, height };
}

/**
 * Phase, name, and the year-date under each moon, on one grid.
 */
function paintDualPlates(ctx, width, height, layout, captions) {
  const moonBottom = layout.centers[0].y + layout.targetPx * 0.5;
  const scrim = ctx.createLinearGradient(0, moonBottom + layout.targetPx * 0.02, 0, height);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.22, 'rgba(0, 0, 0, 0.18)');
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const gutter = Math.round(width * 0.03);
  const pad = Math.round(width * 0.05);
  const half = width / 2;
  const columns = captions.map((caption, index) => {
    const centerX = layout.centers[index].x;
    const leftLimit = centerX < half ? pad : half + gutter;
    const rightLimit = centerX < half ? half - gutter : width - pad;
    const maxWidth = Math.floor(2 * Math.min(centerX - leftLimit, rightLimit - centerX));
    return { caption, centerX, maxWidth };
  });
  const edge = Math.round(height * 0.072);
  const regionTop = moonBottom + Math.round(layout.targetPx * 0.34);
  const regionBottom = height - edge;

  let scale = 1;
  let built = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    built = buildDualLayout(ctx, columns, layout.targetPx * scale);
    if (built.height <= regionBottom - regionTop || scale <= 0.72) break;
    scale *= 0.9;
  }

  const room = Math.max(0, regionBottom - regionTop - built.height);
  const top = regionTop + Math.min(room * 0.18, Math.round(height * 0.04));
  const { type } = built;

  built.prepared.forEach((column) => {
    for (const row of built.rows) {
      const baseline = top + built.ascent + row.baseline;
      let text = '';
      let font = SHARE_SANS;
      let color = 'rgba(236, 240, 246, 0.9)';
      let tracking = row.size * 0.12;
      if (row.key === 'phase') {
        text = column.phase;
        font = SHARE_SERIF;
        color = 'rgba(236, 240, 246, 0.96)';
        tracking = type.phaseSize * 0.18;
      } else if (row.key.startsWith('name:')) {
        text = column.nameLines[Number(row.key.slice(5))] || '';
        color = 'rgba(236, 240, 246, 0.92)';
        tracking = type.nameSize * 0.12;
      } else if (row.key === 'date') {
        text = column.dateLabel;
        color = 'rgba(236, 240, 246, 0.84)';
        tracking = type.dateSize * 0.12;
      }
      if (!text) continue;
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
      ctx.shadowBlur = row.size * 0.4;
      ctx.font = `400 ${row.size}px ${font}`;
      ctx.fillStyle = color;
      paintCentered(ctx, text, column.centerX, baseline, tracking);
      ctx.restore();
    }
  });
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
      paintDualPlates(ctx, frameW, frameH, layout, [captionFor(0), captionFor(1)]);
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
