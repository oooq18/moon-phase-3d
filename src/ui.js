import {
  formatDistanceKm,
  formatIllumination,
  formatISODateShanghai,
  formatShanghaiYearMonthDay,
  isCivilIsoInRange,
  isSameShanghaiDate,
  MAX_CIVIL_ISO,
  MIN_CIVIL_ISO,
  stepShanghaiDays,
  withShanghaiYMD,
} from './astronomy.js';

export function mountUI(root, initialDate, onEvent) {
  const phaseName = root.querySelector('#phase-name');
  const eyebrow = root.querySelector('#eyebrow');
  const poemEl = root.querySelector('#poem');
  const poemLine = root.querySelector('#poem-line');
  const poemAuthor = root.querySelector('#poem-author');
  const identity = root.querySelector('#identity');
  const identityMarks = [
    root.querySelector('#identity-0'),
    root.querySelector('#identity-1'),
  ];
  const age = root.querySelector('#metric-age');
  const illum = root.querySelector('#metric-illum');
  const distance = root.querySelector('#metric-dist');
  const dateInput = root.querySelector('#date');
  const prev = root.querySelector('#prev');
  const next = root.querySelector('#next');
  const today = root.querySelector('#today');
  const share = root.querySelector('#share');
  const fallback = root.querySelector('#fallback');
  const peopleEl = root.querySelector('#people');
  const modeSingle = root.querySelector('#mode-single');
  const modeDual = root.querySelector('#mode-dual');
  const nameInputs = [root.querySelector('#name-0'), root.querySelector('#name-1')];
  const whenLabels = [root.querySelector('#when-0'), root.querySelector('#when-1')];
  const picks = [root.querySelector('#pick-0'), root.querySelector('#pick-1')];
  const personDateInputs = [
    root.querySelector('.person-date-input[data-index="0"]'),
    root.querySelector('.person-date-input[data-index="1"]'),
  ];
  const cards = [...root.querySelectorAll('.person')];

  const minDate = MIN_CIVIL_ISO;
  const maxDate = MAX_CIVIL_ISO;
  dateInput.min = minDate;
  dateInput.max = maxDate;

  let current = new Date(initialDate.getTime());
  let active = 0;
  let mode = 'single';
  const timers = new WeakMap();
  const rolls = new WeakMap();

  function fadeText(el, text) {
    if (el.textContent === text) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.textContent = text;
    if (reduce || el.textContent === '—' || el.textContent === '') return;
    // 重新触发 swap-up 动画
    el.classList.remove('swap');
    void el.offsetWidth;
    el.classList.add('swap');
  }

  function paintMetric(el, number, unit) {
    const signature = `${number}\u0000${unit}`;
    if (el.dataset.signature === signature) return;
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
  }

  function paintPoem(next) {
    const text = next?.text ?? '';
    const who = next?.author ?? '';
    const signature = `${text}\u0000${who}`;
    if (poemEl.dataset.signature === signature) return;
    poemEl.dataset.signature = signature;
    poemLine.textContent = text;
    poemAuthor.textContent = who;
    poemEl.hidden = !text;
  }

  function render(state) {
    mode = state.mode;
    active = state.active;
    const person = state.people[active];
    current = new Date(person.date.getTime());
    eyebrow.textContent = state.festival ? '中秋' : '月相';
    const info = person.info;
    fadeText(phaseName, info ? info.name : '无法计算');
    paintPoem(info ? person.poem : null);
    if (info) {
      paintMetric(age, info.ageDays.toFixed(1), '天');
      paintMetric(illum, formatIllumination(info.illuminated).replace('%', ''), '%');
      paintMetric(distance, formatDistanceKm(info.distanceKm).replace(/\s*km$/, ''), 'km');
    } else {
      paintMetric(age, '—', '');
      paintMetric(illum, '—', '');
      paintMetric(distance, '—', '');
    }
    const iso = formatISODateShanghai(current);
    if (dateInput.value !== iso) dateInput.value = iso;
    prev.disabled = iso <= minDate;
    next.disabled = iso >= maxDate;
    today.hidden = !state.showToday;

    modeSingle.setAttribute('aria-checked', mode === 'single' ? 'true' : 'false');
    modeDual.setAttribute('aria-checked', mode === 'dual' ? 'true' : 'false');
    peopleEl.dataset.mode = mode;
    identity.hidden = mode !== 'dual';

    state.people.forEach((entry, index) => {
      const label = formatShanghaiYearMonthDay(entry.date);
      whenLabels[index].textContent = formatISODateShanghai(entry.date);
      const who = entry.name.trim();
      const side = index === 0 ? '左' : '右';
      identityMarks[index].textContent = who ? `${who} · ${label}` : `${side} · ${label}`;
      identityMarks[index].classList.toggle('is-active', index === active);
      cards[index].classList.toggle('is-active', index === active);
      picks[index].setAttribute('aria-pressed', index === active ? 'true' : 'false');
      const personIso = formatISODateShanghai(entry.date);
      if (document.activeElement !== personDateInputs[index] && personDateInputs[index].value !== personIso) {
        personDateInputs[index].value = personIso;
      }
      if (document.activeElement !== nameInputs[index] && nameInputs[index].value !== entry.name) {
        nameInputs[index].value = entry.name;
      }
    });
  }

  function emitTo(index, date, live) {
    onEvent({ type: 'date', index, date: new Date(date.getTime()), live });
  }
  function emit(date, live) {
    emitTo(active, date, live);
  }

  function step(days) {
    const nextDate = stepShanghaiDays(current, days);
    if (formatISODateShanghai(nextDate) === formatISODateShanghai(current)) return;
    emit(nextDate, false);
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  today.addEventListener('click', () => emit(new Date(), true));

  modeSingle.addEventListener('click', () => {
    if (mode === 'single') return;
    onEvent({ type: 'mode', mode: 'single' });
  });
  modeDual.addEventListener('click', () => {
    if (mode === 'dual') return;
    onEvent({ type: 'mode', mode: 'dual' });
  });

  // 双月：透明 date input 盖在日期按钮上，点击直接弹原生日历
  personDateInputs.forEach((input, index) => {
    input.addEventListener('focus', () => {
      if (mode === 'dual' && index !== active) {
        onEvent({ type: 'active', index });
      }
    });
    const commit = () => {
      const raw = input.value.trim();
      if (!isCivilIsoInRange(raw)) return;
      const picked = withShanghaiYMD(current, raw);
      if (formatISODateShanghai(picked) !== raw) return;
      if (isSameShanghaiDate(picked, new Date())) emitTo(index, new Date(), true);
      else emitTo(index, picked, false);
    };
    input.addEventListener('change', commit);
  });

  nameInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      const name = input.value.replace(/[\r\n\t]/g, '').slice(0, 16);
      if (name !== input.value) input.value = name;
      onEvent({ type: 'name', index, name });
    });
  });

  function commitPicker(event) {
    const raw = dateInput.value.trim();
    const inRange = isCivilIsoInRange(raw);
    if (!inRange) {
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
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });

  return {
    render,
    setFallback(on) {
      fallback.hidden = !on;
    },
    bindShare(handler) {
      share.addEventListener('click', () => handler());
    },
    setShareEnabled(on) {
      share.disabled = !on;
    },
  };
}
