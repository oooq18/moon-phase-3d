import {
  addShanghaiDays,
  formatAge,
  formatDistanceKm,
  formatIllumination,
  formatISODateShanghai,
  isSameShanghaiDate,
  parseCivilYMD,
  withShanghaiYMD,
} from './astronomy.js';
import { poemForPhase } from './poems.js';

export function mountUI(root, initialDate, onDate) {
  const phaseName = root.querySelector('#phase-name');
  const poemEl = root.querySelector('#poem');
  const poemLine = root.querySelector('#poem-line');
  const poemAuthor = root.querySelector('#poem-author');
  const age = root.querySelector('#metric-age');
  const illum = root.querySelector('#metric-illum');
  const distance = root.querySelector('#metric-dist');
  const dateInput = root.querySelector('#date');
  const prev = root.querySelector('#prev');
  const next = root.querySelector('#next');
  const today = root.querySelector('#today');
  const share = root.querySelector('#share');
  const fallback = root.querySelector('#fallback');

  const minDate = '1900-01-01';
  const maxDate = '2100-12-31';
  dateInput.min = minDate;
  dateInput.max = maxDate;

  let current = new Date(initialDate.getTime());
  let poem = null;
  let poemPhase = '';
  const timers = new WeakMap();

  function fadeText(el, text) {
    if (el.textContent === text) return;
    const previous = timers.get(el);
    if (previous) window.clearTimeout(previous);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || el.textContent === '—' || el.textContent === '') {
      el.textContent = text;
      return;
    }
    el.classList.add('is-dim');
    const timer = window.setTimeout(() => {
      el.textContent = text;
      el.classList.remove('is-dim');
      timers.delete(el);
    }, 400);
    timers.set(el, timer);
  }

  function paintMetric(el, number, unit) {
    const signature = `${number}\u0000${unit}`;
    if (el.dataset.signature === signature) return;
    const apply = () => {
      el.dataset.signature = signature;
      el.replaceChildren();
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = number;
      el.append(num);
      if (unit) {
        const mark = document.createElement('span');
        mark.className = 'unit';
        mark.textContent = unit;
        el.append(mark);
      }
      el.classList.remove('is-dim');
    };
    const previous = timers.get(el);
    if (previous) window.clearTimeout(previous);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !el.dataset.signature) {
      apply();
      return;
    }
    el.classList.add('is-dim');
    const timer = window.setTimeout(() => {
      apply();
      timers.delete(el);
    }, 400);
    timers.set(el, timer);
  }

  function paintPoem(next) {
    const text = next?.text ?? '';
    const who = next?.author ?? '';
    const signature = `${text}\u0000${who}`;
    if (poemEl.dataset.signature === signature) return;
    const apply = () => {
      poemEl.dataset.signature = signature;
      poemLine.textContent = text;
      poemAuthor.textContent = who;
      poemEl.hidden = !text;
      poemEl.classList.remove('is-dim');
    };
    const previous = timers.get(poemEl);
    if (previous) window.clearTimeout(previous);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !poemEl.dataset.signature) {
      apply();
      return;
    }
    poemEl.classList.add('is-dim');
    const timer = window.setTimeout(() => {
      apply();
      timers.delete(poemEl);
    }, 400);
    timers.set(poemEl, timer);
  }

  function render(info, date) {
    current = new Date(date.getTime());
    fadeText(phaseName, info.name);
    if (info.name !== poemPhase) {
      const next = poemForPhase(info.name, poem?.text);
      poemPhase = info.name;
      poem = next;
      paintPoem(next);
    }
    paintMetric(age, info.ageDays.toFixed(1), '天');
    paintMetric(illum, formatIllumination(info.illuminated).replace('%', ''), '%');
    paintMetric(distance, formatDistanceKm(info.distanceKm).replace(/\s*km$/, ''), 'km');
    const iso = formatISODateShanghai(date);
    if (dateInput.value !== iso) dateInput.value = iso;
    const showToday = !isSameShanghaiDate(date, new Date());
    today.hidden = !showToday;
  }

  function emit(date, live) {
    onDate(new Date(date.getTime()), { live });
  }

  prev.addEventListener('click', () => emit(addShanghaiDays(current, -1), false));
  next.addEventListener('click', () => emit(addShanghaiDays(current, 1), false));
  today.addEventListener('click', () => emit(new Date(), true));

  function commitPicker(event) {
    const raw = dateInput.value.trim();
    const parsed = parseCivilYMD(raw);
    const inRange = Boolean(parsed) && raw >= minDate && raw <= maxDate;
    if (!inRange) {
      // iOS fires `input` with an empty value while the year wheel is moving.
      // Writing the old date back there throws away the year they just chose.
      if (event.type !== 'input') dateInput.value = formatISODateShanghai(current);
      return;
    }
    const picked = withShanghaiYMD(current, raw);
    if (formatISODateShanghai(picked) !== raw) {
      if (event.type !== 'input') dateInput.value = formatISODateShanghai(current);
      return;
    }
    if (raw === formatISODateShanghai(current)) return;
    if (isSameShanghaiDate(picked, new Date())) emit(new Date(), true);
    else emit(picked, false);
  }

  dateInput.addEventListener('input', commitPicker);
  dateInput.addEventListener('change', commitPicker);
  dateInput.addEventListener('blur', commitPicker);

  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      emit(addShanghaiDays(current, -1), false);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      emit(addShanghaiDays(current, 1), false);
    }
  });

  return {
    render,
    setFallback(on) {
      fallback.hidden = !on;
    },
    bindShare(handler) {
      share.addEventListener('click', () => handler(new Date(current.getTime())));
    },
    currentPoem() {
      return poem ? { text: poem.text, author: poem.author } : null;
    },
    setShareEnabled(on) {
      share.disabled = !on;
    },
  };
}
