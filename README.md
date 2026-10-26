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
- Pick a civil date, or step with 前一天 / 后一天 (also ← / →). The date is read as a Shanghai calendar day; the clock time stays with you. 今天 appears only when that civil date is not today, and returns to the current instant. 分享 saves a PNG of that day’s moon and sky (`moon-YYYY-MM-DD.png`), or hands the file to the system share sheet when the browser allows it. The image carries the phase, the civil date as 几月几日, and the same line and author shown in the instrument.
- The camera is fixed on the moon: dragging does not orbit or zoom. A civil-date step spins the moon through three turns about celestial north — forward one way, backward the other — then eases to a stop on the nearside, while the sunlight eases to that day’s direction. The moon does not keep spinning. People who prefer reduced motion get the new light without the turns. The sky is a magnitude-weighted star sphere with a faint galactic band. It drifts slowly around the polar axis, and the same date step turns that sphere before the slow drift resumes.
- If the local moon textures fail to load, a procedural cratered sphere keeps the same lighting. The page does not depend on a CDN for the moon.

## Astronomy

`Illumination` supplies `phase_angle`, `phase_fraction`, and `geo_dist` (AU → km with 149,597,870.7). `MoonPhase` is the 0–360° geocentric ecliptic phase (0 new, 90 first quarter, 180 full, 270 last quarter) used for the Chinese name and, with `SearchMoonPhase(0)`, for age since the previous new moon. `Elongation` is read as a cross-check (`evening` is waxing, `morning` is waning).

The light vector is not a hard-coded phase angle. It is the Sun’s direction in an Earth-view basis built from the library vectors `gc` (Earth→Moon) and `hc` (Sun→Moon): +Z toward Earth, +Y celestial north, +X west / screen-right.

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
