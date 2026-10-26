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
import { poemForDual, poemForMidAutumn, poemForPhase } from './poems.js';
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

function assignPoems() {
  if (viewMode === 'dual') {
    const left = people[0];
    const right = people[1];
    if (!left.info || !right.info) return;
    const festival = isMidAutumn(left.date) || isMidAutumn(right.date);
    const key = festival ? '中秋' : `双月:${left.info.name}|${right.info.name}`;
    if (left.poem && left.poemKey === key && right.poem === left.poem && right.poemKey === key) return;
    const next = festival
      ? poemForMidAutumn(left.poem?.text)
      : poemForDual(left.info.name, right.info.name, left.poem?.text);
    left.poem = next;
    right.poem = next;
    left.poemKey = key;
    right.poemKey = key;
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
    festival: viewMode === 'dual'
      ? people.some((person) => person.info && isMidAutumn(person.date))
      : Boolean(people[focus].info) && isMidAutumn(people[focus].date),
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

function shareStack(ctx, caption, width, height, poemScale) {
  const minSide = Math.min(width, height);
  const maxText = Math.round(width * 0.84);
  const phaseSize = Math.max(64, Math.round(minSide * 0.052));
  const nameSize = Math.max(40, Math.round(minSide * 0.03));
  const dateSize = Math.max(36, Math.round(minSide * 0.026));
  const poemSize = Math.max(28, Math.round(minSide * 0.028 * poemScale));
  const titleSize = Math.max(22, Math.round(poemSize * 0.72));
  const authorSize = Math.max(22, Math.round(minSide * 0.02 * Math.max(poemScale, 0.78)));
  const phase = caption.phase;
  const showPhase = phase && phase !== '—' && phase !== '无法计算';
  const stack = [];
  const push = (text, size, font, color, tracking, step) => {
    if (!text) return;
    stack.push({ text, size, font, color, tracking, step: step ?? Math.round(size * 1.48) });
  };
  if (caption.poem?.author) {
    push(caption.poem.author, authorSize, SHARE_SANS, 'rgba(236, 240, 246, 0.7)', authorSize * 0.16);
  }
  const verse = caption.poem?.lines?.length
    ? caption.poem.lines
    : (caption.poem?.text ? caption.poem.text.split('\n') : []);
  const tracking = poemSize * 0.04;
  const wrapped = [];
  ctx.font = `400 ${poemSize}px ${SHARE_SERIF}`;
  for (const line of verse) wrapped.push(...verseLayout(ctx, line, maxText, tracking));
  for (let i = wrapped.length - 1; i >= 0; i -= 1) {
    push(wrapped[i], poemSize, SHARE_SERIF, 'rgba(236, 240, 246, 0.92)', tracking, Math.round(poemSize * 1.42));
  }
  if (caption.poem?.title && wrapped.length) {
    ctx.font = `400 ${titleSize}px ${SHARE_SERIF}`;
    const titleTracking = titleSize * 0.16;
    const titleLines = fittedLines(ctx, caption.poem.title, maxText, titleTracking);
    for (let i = titleLines.length - 1; i >= 0; i -= 1) {
      push(titleLines[i], titleSize, SHARE_SERIF, 'rgba(236, 240, 246, 0.62)', titleTracking, Math.round(titleSize * 1.55));
    }
  }
  if (caption.dateLabel) {
    push(caption.dateLabel, dateSize, SHARE_SANS, 'rgba(236, 240, 246, 0.84)', dateSize * 0.16, Math.round(dateSize * 1.7));
  }
  if (caption.name) {
    push(caption.name, nameSize, SHARE_SANS, 'rgba(236, 240, 246, 0.92)', nameSize * 0.14);
  }
  if (showPhase) {
    push(phase, phaseSize, SHARE_SERIF, 'rgba(236, 240, 246, 0.94)', phaseSize * 0.16);
  }
  const heightUsed = stack.reduce((sum, line) => sum + line.step, 0);
  return { stack, heightUsed };
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

  const moonBottom = height * 0.38 + (width * 0.66) / 2;
  const ceiling = moonBottom + height * 0.045;
  const floor = height - Math.round(height * 0.07);
  const room = floor - ceiling;
  let chosen = null;
  for (let scale = 1; scale >= 0.52; scale -= 0.08) {
    chosen = shareStack(ctx, caption, width, height, scale);
    if (chosen.heightUsed <= room) break;
  }

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(5, 7, 13, 0.72)';
  const x0 = Math.round(width * 0.08);
  let y = floor;
  for (const line of chosen.stack) {
    ctx.font = `400 ${line.size}px ${line.font}`;
    ctx.fillStyle = line.color;
    ctx.shadowBlur = line.size * 0.35;
    paintTracked(ctx, line.text, x0, y, line.tracking);
    y -= line.step;
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

function clauseLines(ctx, text, maxWidth, tracking) {
  if (!text) return [];
  const clauses = text.split(/(?<=[，。；])/u).map((part) => part.trim()).filter(Boolean);
  if (clauses.length > 1 && clauses.every((clause) => measureTracked(ctx, clause, tracking) <= maxWidth)) {
    return clauses;
  }
  if (measureTracked(ctx, text, tracking) <= maxWidth) return [text];
  return wrapGlyphs(ctx, text, maxWidth, tracking);
}

function verseLayout(ctx, text, maxWidth, tracking) {
  if (!text) return [];
  if (measureTracked(ctx, text, tracking) <= maxWidth) return [text];
  return clauseLines(ctx, text, maxWidth, tracking);
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
    phaseSize: Math.max(56, Math.round(px * 0.155)),
    nameSize: Math.max(32, Math.round(px * 0.078)),
    dateSize: Math.max(30, Math.round(px * 0.072)),
    poemSize: Math.max(28, Math.round(px * 0.072)),
    titleSize: Math.max(22, Math.round(px * 0.046)),
    authorSize: Math.max(22, Math.round(px * 0.044)),
  };
}

function poemCenterRows(ctx, poem, maxWidth, type) {
  if (!poem?.text && !poem?.lines?.length) return [];
  const rows = [{ kind: 'rule', size: Math.max(8, Math.round(type.poemSize * 0.1)), baseline: 0 }];
  let cursor = Math.round(type.titleSize * 1.15);
  const push = (kind, text, size, font, tracking, step) => {
    rows.push({ kind, text, size, font, tracking, baseline: cursor });
    cursor += step;
  };
  if (poem.title) {
    ctx.font = `400 ${type.titleSize}px ${SHARE_SERIF}`;
    const tracking = type.titleSize * 0.2;
    const titleLines = fittedLines(ctx, poem.title, maxWidth, tracking);
    titleLines.forEach((text, index) => {
      const last = index === titleLines.length - 1;
      push('title', text, type.titleSize, SHARE_SERIF, tracking, Math.round(type.titleSize * (last ? 1.85 : 1.35)));
    });
  }
  const verse = poem.lines?.length ? poem.lines : poem.text.split('\n');
  ctx.font = `400 ${type.poemSize}px ${SHARE_SERIF}`;
  const verseTracking = type.poemSize * 0.045;
  const lines = [];
  for (const line of verse) lines.push(...verseLayout(ctx, line, maxWidth, verseTracking));
  lines.forEach((text, index) => {
    const last = index === lines.length - 1;
    push('verse', text, type.poemSize, SHARE_SERIF, verseTracking, Math.round(type.poemSize * (last ? 1.45 : 1.38)));
  });
  if (poem.author) {
    const tracking = type.authorSize * 0.22;
    push('author', poem.author, type.authorSize, SHARE_SANS, tracking, Math.round(type.authorSize * 1.15));
  }
  return rows;
}

/**
 * Phase, name, and the year-date stay on one vertical grid under each moon.
 * The poem is not split across the two columns: title, verse, and author
 * are a single block centered under both.
 */
function buildDualLayout(ctx, columns, px, poem, poemWidth) {
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
    add('phase', type.phaseSize, Math.round(type.phaseSize * 1.16));
  }
  for (let i = 0; i < nameSlots; i += 1) {
    const last = i === nameSlots - 1;
    add(`name:${i}`, type.nameSize, Math.round(type.nameSize * (last ? 1.5 : 1.34)));
  }
  add('date', type.dateSize, Math.round(type.dateSize * 1.05));

  const ascent = rows.length ? rows[0].size * 0.86 : 0;
  const last = rows[rows.length - 1];
  const columnHeight = last ? ascent + last.baseline + Math.round(last.size * 0.28) : 0;
  const poemRows = poemCenterRows(ctx, poem, poemWidth, type);
  const poemAscent = poemRows.length ? Math.max(type.titleSize, type.poemSize) * 0.2 : 0;
  const poemLast = poemRows[poemRows.length - 1];
  const poemHeight = poemLast
    ? poemAscent + poemLast.baseline + Math.round((poemLast.size || type.poemSize) * 0.35)
    : 0;
  const gap = poemRows.length ? Math.round(type.dateSize * 1.15) : 0;
  return {
    rows,
    prepared,
    type,
    ascent,
    columnHeight,
    poemRows,
    poemAscent,
    poemHeight,
    gap,
    height: columnHeight + gap + poemHeight,
  };
}

/**
 * Phase, name, and date under each moon, on one grid. The poem is painted
 * once, centered on the canvas, below both columns.
 */
function paintDualPlates(ctx, width, height, layout, captions) {
  const moonBottom = layout.centers[0].y + layout.targetPx * 0.5;
  const scrim = ctx.createLinearGradient(0, moonBottom + layout.targetPx * 0.06, 0, height);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.28, 'rgba(0, 0, 0, 0.22)');
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
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
  const poem = captions.find((caption) => caption.poem)?.poem || null;

  const edge = Math.round(height * 0.055);
  const gap = Math.round(layout.targetPx * 0.28);
  const regionTop = moonBottom + gap;
  const regionBottom = height - edge;
  const poemWidth = Math.round(width * 0.72);

  let scale = 1;
  let built = null;
  for (let attempt = 0; attempt < 9; attempt += 1) {
    built = buildDualLayout(ctx, columns, layout.targetPx * scale, poem, poemWidth);
    if (built.height <= regionBottom - regionTop || scale <= 0.46) break;
    scale *= 0.88;
  }

  const room = Math.max(0, regionBottom - regionTop - built.height);
  const top = regionTop + room / 2;
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

  if (!built.poemRows.length) return;
  const poemTop = top + built.columnHeight + built.gap;
  const centerX = width / 2;
  for (const row of built.poemRows) {
    const baseline = poemTop + built.poemAscent + row.baseline;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (row.kind === 'rule') {
      const ruleW = Math.round(type.poemSize * 2.4);
      const thick = Math.max(2, row.size);
      ctx.fillStyle = 'rgba(236, 240, 246, 0.38)';
      ctx.fillRect(centerX - ruleW / 2, baseline - thick / 2, ruleW, thick);
    } else if (row.text) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = row.size * 0.45;
      ctx.font = `400 ${row.size}px ${row.font}`;
      ctx.fillStyle = row.kind === 'author'
        ? 'rgba(236, 240, 246, 0.66)'
        : (row.kind === 'title' ? 'rgba(236, 240, 246, 0.58)' : 'rgba(236, 240, 246, 0.94)');
      paintCentered(ctx, row.text, centerX, baseline, row.tracking);
    }
    ctx.restore();
  }
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
