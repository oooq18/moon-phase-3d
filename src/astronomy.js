import * as Astronomy from 'astronomy-engine';

export const SHANGHAI_TZ = 'Asia/Shanghai';

const KM_PER_AU = 149597870.7;
const DAY_MS = 86400000;

const shanghaiFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHANGHAI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function shanghaiParts(date) {
  const map = {};
  for (const part of shanghaiFormat.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function formatISODateShanghai(date) {
  const p = shanghaiParts(date);
  const month = String(p.month).padStart(2, '0');
  const day = String(p.day).padStart(2, '0');
  return `${p.year}-${month}-${day}`;
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
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return new Date(date.getTime());
  const p = shanghaiParts(date);
  return new Date(Date.UTC(year, month - 1, day, p.hour - 8, p.minute, p.second));
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
