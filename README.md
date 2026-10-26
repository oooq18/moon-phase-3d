# 观月 · 月相观测台

A single-page 3D moon phase viewer. The disk is a real mesh lit from the Sun’s direction at the selected instant. Phase, age, illuminated fraction, elongation, and geocentric distance come from [astronomy-engine](https://github.com/cosinekitty/astronomy). Every “today”, date label, and calendar date is interpreted in **Asia/Shanghai (UTC+8)**.

The public site is [https://oooq18.github.io/moon-phase-3d/](https://oooq18.github.io/moon-phase-3d/). Vite `base` is `/moon-phase-3d/`, and texture paths are prefixed with `import.meta.env.BASE_URL`.

## Run locally

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:47321/moon-phase-3d/](http://127.0.0.1:47321/moon-phase-3d/)

```bash
npm run build    # writes dist/
npm run preview  # serves dist/ at the same base path and port
```

## What you can do

- On open, the moon shows the phase for the current Shanghai instant. Waxing light is on the right, waning on the left, celestial north up.
- A floating instrument sits under the moon: the phase name in serif, a short classical line for that phase with its author, then 月龄 (one decimal, days), 亮面比例 (one decimal percent), and 地月距离 in kilometres with thousands separators. The line is chosen at random from ten public-domain couplets for each phase name, and a new one is drawn only when the name changes. Date controls are a single shutter. On a phone the same readouts collapse into a thin bottom dock.
- Pick a civil date, or step with 前一天 / 后一天 (also ← / →). The date control applies the full year, month, and day from `1000-01-01` through `9999-12-31`. Year 1000 is the first year iOS Safari will actually commit (year 999 can appear on the wheel and still not be selected). Year 10000 is not a four-digit `YYYY-MM-DD` value, so it is not offered. A year change is that year, not a remapped one. Day steps stay on ±1 civil day and stop at the two ends. The value is a Shanghai calendar day; the clock time stays with you. 今天 appears only when that civil date is not today, and returns to the current instant.
- 单月 is one birthday: an optional name and that date’s moon. 双月 puts two birthdays side by side on the same sky. Each moon stays nearside-facing and is lit for its own date. 前一天 / 后一天 and the date control change the selected person; tap the other name to select them. The instrument shows that person’s phase, and in 双月 both names and dates stay visible.
- On 农历八月十五 the verse comes from ten Mid-Autumn lines (苏轼、王建、辛弃疾) instead of the phase pools. Any other date keeps the phase line.
- 分享 in 单月 writes a 9:16 portrait at 2160×3840 (`moon-YYYY-MM-DD.png`) with the phase, the name when one was typed, the civil date as 几年几月几日, and the same line and author. 双月 writes one 3:4 portrait, 2880×3840 (`moon-YYYY-MM-DD_YYYY-MM-DD.png`): both moons on the same sky, and under each moon that person's phase, name when set, civil date with the year, and their own line and author. The browser share sheet is used when it can take a file.
- The camera is fixed: dragging does not orbit or zoom. The lunar ball does not spin when the date changes. Only the sunlight eases across the fixed nearside, and the sky turns. One day eases the sky through that one night’s turn and stops on the new pose, with no lap back. A long jump turns the sky through several nights (never more than four), then slows to a stop. The stellar drift pauses while the sky is moving, then resumes. Reduced motion skips the turns and sets the light and the sky directly.
- If the local moon textures fail to load, a procedural cratered sphere keeps the same lighting. The page does not depend on a CDN for the moon.

## Astronomy

`Illumination` supplies `phase_angle`, `phase_fraction`, and `geo_dist` (AU → km with 149,597,870.7). `MoonPhase` is the 0–360° geocentric ecliptic phase (0 new, 90 first quarter, 180 full, 270 last quarter) used for the Chinese name and, with `SearchMoonPhase(0)`, for age since the previous new moon. `Elongation` is read as a cross-check (`evening` is waxing, `morning` is waning).

The light vector is not a hard-coded phase angle. It is the Sun’s direction in an Earth-view basis built from the library vectors `gc` (Earth→Moon) and `hc` (Sun→Moon): +Z toward Earth, +Y celestial north, +X west / screen-right. Daylight is a softened cosine under that one sun: brightest at the subsolar point, falling through a short penumbra. The night side keeps a faint blue earthshine so the maria still read, darker than the day. The mesh does not turn when the date changes; that sun direction eases to the new phase across the fixed nearside. In 双月 each mesh has its own sun vector.

中秋 is the Shanghai civil date of 农历八月十五: lunar months are numbered from the winter solstice, and a thirteenth month makes the first month without a 中气 a leap month. Leap eighth months are not the festival.

The star field is three shells inside the polar frame, on a black sky. The faint shell is small but still bright enough to read; only the nearer stars show a cool or warm tint and a soft glow. A dense shell gathers toward the Milky Way, which stays a narrow band with dust lanes on the far shell. Point size and brightness ease off with distance, and the shells slip against each other when the date turns. 双月 uses that one sky behind both moons.

## NASA assets

Textures live in `public/assets/moon/` and are loaded only from there.

| File | Origin |
| --- | --- |
| `lroc_color.jpg` | 2025 CGI Moon Kit color map, `lroc_color_16bit_srgb_4k.tif` (4096×2048), encoded as JPEG quality 88. [SVS-4720](https://svs.gsfc.nasa.gov/4720) · [direct TIFF](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif) |
| `ldem_bump.png` | LOLA elevation `ldem_16_uint.tif` (5760×2880), resampled to 2048×1024 and contrast-stretched for bump shading. [direct TIFF](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16_uint.tif) |

Credit: NASA / Goddard Space Flight Center Scientific Visualization Studio, CGI Moon Kit (SVS-4720). Color from the Lunar Reconnaissance Orbiter Camera (LROC, Arizona State University); elevation from the Lunar Orbiter Laser Altimeter (LOLA). U.S. Government work, public domain. NASA does not endorse this project. See `public/assets/moon/ATTRIBUTION.txt`.

## GitHub Pages

`vite.config.js` sets `base: '/moon-phase-3d/'`. `npm run build` writes `dist/`.

Preferred deploy: `.github/workflows/deploy-pages.yml` builds on every push to `main` and publishes `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The site URL is `https://oooq18.github.io/moon-phase-3d/`.

To publish without Actions, build locally and either push `dist/` to a `gh-pages` branch or copy it into `/docs` and set Pages to deploy from the `docs` folder on `main`. The workflow path is the one this repo is set up for. Do not serve the site from the domain root: asset URLs include the `/moon-phase-3d/` prefix.

## Layout

```
index.html
vite.config.js
package.json
src/main.js          scene, fixed camera, framing
src/moon.js          mesh, NASA textures, lighting, fallback shader
src/stars.js         procedural star field
src/astronomy.js     Shanghai dates and astronomy-engine
src/poems.js         classical lines for each phase name
src/ui.js            panel, date controls, verse
src/style.css
public/assets/moon/  local NASA color map and bump
.github/workflows/deploy-pages.yml
```
