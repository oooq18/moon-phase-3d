import {
  addShanghaiDays,
  formatAge,
  formatDistanceKm,
  formatIllumination,
  formatISODateShanghai,
  isSameShanghaiDate,
  withShanghaiYMD,
} from './astronomy.js';

export function mountUI(root, initialDate, onDate) {
  const phaseName = root.querySelector('#phase-name');
  const age = root.querySelector('#metric-age');
  const illum = root.querySelector('#metric-illum');
  const distance = root.querySelector('#metric-dist');
  const dateInput = root.querySelector('#date');
  const prev = root.querySelector('#prev');
  const next = root.querySelector('#next');
  const today = root.querySelector('#today');
  const fallback = root.querySelector('#fallback');

  dateInput.min = '1900-01-01';
  dateInput.max = '2100-12-31';

  let current = new Date(initialDate.getTime());
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

  function render(info, date) {
    current = new Date(date.getTime());
    fadeText(phaseName, info.name);
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

  dateInput.addEventListener('change', () => {
    if (!dateInput.value) {
      dateInput.value = formatISODateShanghai(current);
      return;
    }
    const picked = withShanghaiYMD(current, dateInput.value);
    if (isSameShanghaiDate(picked, new Date())) emit(new Date(), true);
    else emit(picked, false);
  });

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
  };
}
