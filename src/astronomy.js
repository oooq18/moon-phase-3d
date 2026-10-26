import * as Astronomy from 'astronomy-engine';

export const SHANGHAI_TZ = 'Asia/Shanghai';

const KM_PER_AU = 149597870.7;
const DAY_MS = 86400000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Civil parts in a fixed UTC+8. The IANA zone `Asia/Shanghai` is not a flat
 * eight hours: before 1901 it is local mean time (+8:05:43), and some later
 * years add daylight saving. Reading those offsets back through `Date.UTC`
 * (which always subtracts eight hours) skips a civil day. The observatory
 * keeps the stated UTC+8 for the whole picker range.
 */
export function shanghaiParts(date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Whole Shanghai civil days since the Unix epoch. Stable sky-pose index. */
export function shanghaiDayIndex(date) {
  const p = shanghaiParts(date);
  return Math.round(Date.UTC(p.year, p.month - 1, p.day) / 86400000);
}

const CIVIL_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Usable civil range for the native date control.
 * iOS Safari draws year 999 on the wheel but will not commit it; 1000 is the
 * first year that control can actually select, so the minimum is 1000-01-01.
 * HTML dates are four-digit years (`YYYY-MM-DD`). Year 10000 needs a fifth
 * digit and is not advertised. astronomy-engine’s lunar theory still returns
 * a finite phase, an age inside one month, and a geocentric distance inside
 * the real perigee–apogee band across this whole span.
 */
export const MIN_CIVIL_ISO = '1000-01-01';
export const MAX_CIVIL_ISO = '9999-12-31';
const MIN_CIVIL_KEY = 10000101;
const MAX_CIVIL_KEY = 99991231;

function civilKey(year, month, day) {
  return year * 10000 + month * 100 + day;
}

/**
 * Parse a full four-digit civil date. Years 0–99 are not shifted into the
 * 1900s: `0001-10-26` is year 1, and it is rejected because `Date.UTC` would
 * otherwise turn it into 1901. A five-digit year such as 10000 does not match.
 */
export function parseCivilYMD(iso) {
  const match = CIVIL_YMD.exec(String(iso ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function formatISODateShanghai(date) {
  const p = shanghaiParts(date);
  const year = String(p.year).padStart(4, '0');
  const month = String(p.month).padStart(2, '0');
  const day = String(p.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True when `iso` is a real four-digit civil date inside the picker range. */
export function isCivilIsoInRange(iso) {
  const parts = parseCivilYMD(iso);
  if (!parts) return false;
  const key = civilKey(parts.year, parts.month, parts.day);
  return key >= MIN_CIVIL_KEY && key <= MAX_CIVIL_KEY;
}

/** Keep the clock, but do not leave the civil range. */
export function clampShanghaiDate(date) {
  const p = shanghaiParts(date);
  const key = civilKey(p.year, p.month, p.day);
  if (key < MIN_CIVIL_KEY) return withShanghaiYMD(date, MIN_CIVIL_ISO);
  if (key > MAX_CIVIL_KEY) return withShanghaiYMD(date, MAX_CIVIL_ISO);
  return new Date(date.getTime());
}

/** Shift by whole civil days in Asia/Shanghai, then stop at the range ends. */
export function stepShanghaiDays(date, days) {
  return clampShanghaiDate(addShanghaiDays(date, days));
}

/** Civil month and day only, for the share image. No year, clock, or place. */
export function formatShanghaiMonthDay(date) {
  const p = shanghaiParts(date);
  return `${p.month}月${p.day}日`;
}

/** Full civil date for a birthday label. No clock or place. */
export function formatShanghaiYearMonthDay(date) {
  const p = shanghaiParts(date);
  return `${p.year}年${p.month}月${p.day}日`;
}

/**
 * Major solar terms (中气) name the lunar month that contains them.
 * Longitude is the Sun's apparent ecliptic longitude.
 */
const MAJOR_TERM_MONTH = {
  330: 1,
  0: 2,
  30: 3,
  60: 4,
  90: 5,
  120: 6,
  150: 7,
  180: 8,
  210: 9,
  240: 10,
  270: 11,
  300: 12,
};

const lunarCache = new Map();

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function collectNewMoons(start, end) {
  const moons = [];
  let cursor = addDays(start, -2);
  while (cursor.getTime() < end.getTime()) {
    const hit = Astronomy.SearchMoonPhase(0, cursor, 40);
    if (!hit) break;
    const when = hit.date;
    if (when.getTime() >= start.getTime() && when.getTime() < end.getTime()) moons.push(when);
    const step = when.getTime() <= cursor.getTime() ? addDays(cursor, 20) : addDays(when, 20);
    cursor = step;
  }
  return moons;
}

function collectSolstices(start, end) {
  const found = [];
  // SearchSunLongitude returns null when the window is wide enough for the
  // offset to wrap, so scan in short steps instead of one long search.
  let cursor = addDays(start, -30);
  while (cursor.getTime() < end.getTime()) {
    const hit = Astronomy.SearchSunLongitude(270, cursor, 40);
    if (hit) {
      const when = hit.date;
      if (when.getTime() >= start.getTime() && when.getTime() < end.getTime()) {
        if (found.length === 0 || when.getTime() - found[found.length - 1].getTime() > 100 * DAY_MS) {
          found.push(when);
        }
      }
      cursor = addDays(when, 300);
    } else {
      cursor = addDays(cursor, 20);
    }
  }
  return found;
}

/**
 * The 中气 whose Shanghai civil date falls in this lunar month, or null.
 * Membership is by civil day (UTC+8), the same day the calendar calls 初一.
 */
function majorTermLongitude(startMoon, endMoon) {
  const startDay = shanghaiDayIndex(startMoon);
  const endDay = shanghaiDayIndex(endMoon);
  if (!(endDay > startDay)) return null;
  const opening = addDays(startMoon, -1);
  const lon = Astronomy.SunPosition(opening).elon;
  let target = Math.ceil((lon - 1e-4) / 30) * 30;
  if (target >= 360) target -= 360;
  const hit = Astronomy.SearchSunLongitude(target, opening, (endDay - startDay) + 3);
  if (!hit) return null;
  const termDay = shanghaiDayIndex(hit.date);
  if (termDay < startDay || termDay >= endDay) return null;
  return ((Math.round(Astronomy.SunPosition(hit.date).elon / 30) * 30) % 360 + 360) % 360;
}

function monthIndexFor(moons, instant) {
  const day = shanghaiDayIndex(instant);
  let index = -1;
  for (let i = 0; i < moons.length; i += 1) {
    if (shanghaiDayIndex(moons[i]) <= day) index = i;
    else break;
  }
  return index;
}

/**
 * Chinese lunisolar date for a Shanghai civil day.
 * Month 11 is the month containing the winter solstice. A thirteenth month
 * between two such solstices makes the first month without a 中气 a leap month,
 * named for the month before it. 中秋 is month 8, day 15, and not the leap month.
 */
function computeChineseLunar(date) {
  const dayIndex = shanghaiDayIndex(date);
  const start = addDays(date, -450);
  const end = addDays(date, 450);
  const moons = collectNewMoons(start, end);
  const solstices = collectSolstices(start, end);
  let startI = -1;
  for (let i = 0; i < moons.length; i += 1) {
    if (shanghaiDayIndex(moons[i]) <= dayIndex) startI = i;
    else break;
  }
  if (startI < 0 || startI + 1 >= moons.length) return null;
  const day = dayIndex - shanghaiDayIndex(moons[startI]) + 1;
  const anchors = [];
  for (const solstice of solstices) {
    const index = monthIndexFor(moons, solstice);
    if (index >= 0 && (anchors.length === 0 || anchors[anchors.length - 1] !== index)) {
      anchors.push(index);
    }
  }
  let from = -1;
  let to = -1;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (anchors[i] <= startI && startI < anchors[i + 1]) {
      from = anchors[i];
      to = anchors[i + 1];
      break;
    }
  }
  if (from < 0) return null;
  const span = to - from;
  let lastNamed = 10;
  let leapUsed = false;
  for (let index = from; index < to; index += 1) {
    const term = majorTermLongitude(moons[index], moons[index + 1]);
    let month;
    let leap = false;
    if (term != null && MAJOR_TERM_MONTH[term] != null) {
      month = MAJOR_TERM_MONTH[term];
      lastNamed = month;
    } else if (!leapUsed && span >= 13) {
      leap = true;
      leapUsed = true;
      month = lastNamed;
    } else {
      month = lastNamed === 12 ? 1 : lastNamed + 1;
      lastNamed = month;
    }
    if (index === startI) return { month, day, leap };
  }
  return null;
}

/** Lunar month, day, and leap flag for the Shanghai civil date. */
export function chineseLunar(date) {
  const key = shanghaiDayIndex(date);
  if (lunarCache.has(key)) return lunarCache.get(key);
  let value = null;
  try {
    value = computeChineseLunar(date);
  } catch {
    value = null;
  }
  lunarCache.set(key, value);
  return value;
}

/** True on 农历八月十五 in Asia/Shanghai. Leap eighth months are not 中秋. */
export function isMidAutumn(date) {
  const lunar = chineseLunar(date);
  return Boolean(lunar && lunar.month === 8 && lunar.day === 15 && !lunar.leap);
}

export function isSameShanghaiDate(a, b) {
  return formatISODateShanghai(a) === formatISODateShanghai(b);
}

/** Shift by whole civil days in Asia/Shanghai, keeping the clock time. */
export function addShanghaiDays(date, days) {
  const p = shanghaiParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days, p.hour - 8, p.minute, p.second));
}

/** Interpret YYYY-MM-DD as a civil date in Asia/Shanghai, keeping the clock from `date`. */
export function withShanghaiYMD(date, iso) {
  const parts = parseCivilYMD(iso);
  if (!parts) return new Date(date.getTime());
  const p = shanghaiParts(date);
  const hour = Number.isFinite(p.hour) && p.hour >= 0 && p.hour <= 23 ? p.hour : 12;
  const minute = Number.isFinite(p.minute) ? p.minute : 0;
  const second = Number.isFinite(p.second) ? p.second : 0;
  let result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour - 8, minute, second));
  const want = formatISODateShanghai(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 4, 0, 0)));
  if (formatISODateShanghai(result) !== want) {
    result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 4, 0, 0));
  }
  return result;
}

export function formatDistanceKm(km) {
  const rounded = Math.round(km);
  const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded);
  return `${grouped} km`;
}

export function formatIllumination(fraction) {
  const pct = Math.min(100, Math.max(0, fraction * 100));
  return `${pct.toFixed(1)}%`;
}

export function formatAge(days) {
  return `${days.toFixed(1)} 天`;
}

/**
 * Chinese phase names from the library's geocentric ecliptic phase.
 * MoonPhase: 0 new, 90 first quarter, 180 full, 270 third quarter.
 * The windows are naming bands, not invented illumination angles.
 */
export function phaseName(phaseDeg) {
  const p = normalizeDeg(phaseDeg);
  if (p < 12 || p >= 348) return '新月';
  if (p < 84) return '蛾眉月';
  if (p < 96) return '上弦月';
  if (p < 168) return '盈凸月';
  if (p < 192) return '满月';
  if (p < 264) return '亏凸月';
  if (p < 276) return '下弦月';
  return '残月';
}

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function vscale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vsub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vdot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vlen(v) {
  return Math.hypot(v.x, v.y, v.z);
}

function vnorm(v) {
  const len = vlen(v) || 1;
  return vscale(v, 1 / len);
}

function vcross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Direction toward the Sun, in the Earth-view frame used by the scene.
 * Camera sits on +Z (toward Earth), +Y is celestial north, +X is west (screen right).
 * Built from Illumination vectors: gc is Earth→Moon, hc is Sun→Moon, J2000 equatorial.
 * Waxing light falls on +X (bright limb on the right); waning light falls on −X.
 */
export function sunDirectionFromVectors(gc, hc) {
  const toEarth = vnorm(vscale(gc, -1));
  const toSun = vnorm(vscale(hc, -1));
  const pole = { x: 0, y: 0, z: 1 };
  let north = vsub(pole, vscale(toEarth, vdot(pole, toEarth)));
  if (vlen(north) < 1e-8) north = { x: 0, y: 1, z: 0 };
  north = vnorm(north);
  const right = vnorm(vcross(north, toEarth));
  return {
    x: vdot(toSun, right),
    y: vdot(toSun, north),
    z: vdot(toSun, toEarth),
  };
}

/** Days since the previous new moon. Exact new-moon instants report age 0. */
export function moonAgeDays(date) {
  const probe = new Date(date.getTime() + 1500);
  const previous = Astronomy.SearchMoonPhase(0, probe, -45);
  if (!previous) {
    return (normalizeDeg(Astronomy.MoonPhase(date)) / 360) * 29.530588853;
  }
  const age = (date.getTime() - previous.date.getTime()) / DAY_MS;
  if (age < 0) return 0;
  if (age > 40) return (normalizeDeg(Astronomy.MoonPhase(date)) / 360) * 29.530588853;
  return age;
}

export function computeLunar(date) {
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const elongation = Astronomy.Elongation(Astronomy.Body.Moon, date);
  const phaseDeg = normalizeDeg(Astronomy.MoonPhase(date));
  const sunDirection = sunDirectionFromVectors(illumination.gc, illumination.hc);

  return {
    phaseDeg,
    phaseAngle: illumination.phase_angle,
    elongation: elongation.elongation,
    visibility: elongation.visibility,
    illuminated: illumination.phase_fraction,
    distanceKm: illumination.geo_dist * KM_PER_AU,
    ageDays: moonAgeDays(date),
    name: phaseName(phaseDeg),
    sunDirection,
  };
}
