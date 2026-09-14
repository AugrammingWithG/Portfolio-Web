# Portfolio — Augniña Krizzel Reburiano

Full-Stack Developer & Creative Technologist. Vite + React + three.js, no UI framework.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build locally
```

## Page order

Hero `#top` → Selected Work `#work` → Skills `#skills` → Contact `#contact`.

The hero is a 500vh runway. A satellite comes apart as you scroll it, annotated
with five "How I build" steps, and lands in Selected Work, where the projects
are planets you drag, open, and warp into.

## Layout

| Path | What it is |
| --- | --- |
| `src/App.jsx` | Page order, the ambient wash, grain and cursor |
| `src/Hero.jsx` | Name, role, contact links, the runway the satellite flies down |
| `src/SatelliteHero.jsx` + `useSatelliteFlight.js` + `satelliteScene.js` | The satellite: fixed page-wide transparent canvas, scroll-scrubbed |
| `src/process.js` | The five build steps the satellite is annotated with. Edit the copy here. `x`/`y` are the wide layout's caption origins only — below 900px the captions are re-parked by CSS and the hook measures where they actually are |
| `src/SelectedWork.jsx` + `usePlanetSystem.js` + `planetScene.js` | The orbit (a star, seven dotted rings, one planet each, all turning), its scroll-driven arrival — the rings fly in as the hero's jump streaks and shorten into their dots — the strip of tiles under it, and the case-study panel |
| `src/scrollTimeline.js` | The page’s three landmarks (`#top`, `#work`, `#work-landed`) and the two numbers both scenes read off them: flight progress and arrival. Also the shared easing |
| `src/planets.js` | Reads `src/projects.json` into the seven planets. Order (= ring order, inner to outer), each ring's radius, phase and period, "Soon" tagging, logos, screenshots, the recording, the "shown via" line |
| `src/projects.json` | **The project data.** A copy of `../projects.json`; keep the two identical |
| `src/Skills.jsx` + `skills.js` | Four grouped cards — Frontend, Backend, Data, Delivery — each with its name set vertically. Every skill opens a detail dialog; "Seen in" is derived from the projects' own `stack` fields, so it follows `projects.json`. Edit the groups, their blurbs and the skills in `skills.js`; `learning: true` earns the honesty dot |
| `src/Footer.jsx` | GitHub, LinkedIn, email |
| `src/links.js` | Single source of truth for name, role and contact links |
| `src/hud.css` | The shared `.sector` shell and **the scrim handoff chain**. Read that comment before changing any section's top or bottom |
| `src/styles.css`, `hero.css`, `satellite.css`, `selected-work.css`, `skills.css` | One stylesheet per section |
| `public/images/` | Project screenshots, logo tiles (`logo-*.jpg`, 512² app icons) and the video poster, referenced by filename from `projects.json` |
| `public/video/` | Project recordings (`aicore-viewer.mp4`, 720p, ~7MB, re-encoded from the 25MB phone capture with ffmpeg) |

The prototypes both 3D sections were ported from live outside the repo, in
`../prototypes/` (`planet-case-study-fixed.html`, `selected-work.html`) and
`../satellite-hero-reference.html`. Earlier versions of the sections
(`Projects.jsx`, the astronaut `SelectedWorkOrbit.jsx`) are in git history.

## Editing the projects

Everything the site says about a project comes from `src/projects.json`.

- `images` — bare filenames under `public/images/`. The case-study panel shows
  them in a Screens row; `platform: "mobile"` lays them out two up.
- `logo` — a square tile under `public/images/`, shown beside the name in the
  panel's header. Optional; without one the name sits flush left.
- `video` + `videoPoster` — a recording under `public/video/` and its poster
  under `public/images/`. Rendered as a real `<video>` (controls, muted,
  `preload="none"`) in a Recording row above Screens.
- `liveUrl` — a "View live" link. Leave `null` and the panel says how else the
  work can be seen (with screenshots, or "Visuals to follow").
- `onHold` — anything here becomes a "Soon" planet with placeholder copy and
  takes the next free slot on its own.

No per-project repo links anywhere on this site: client work stays private.

## The performance rules

- The gold glow on a pressed key lives on its own overlay layer (`.kb-glow`).
  The frosted blur is set **once** on `.kb-deck` and never changes; a key press
  only moves a `transform` and fades an `opacity`. Re-triggering
  `backdrop-filter` is what caused lag in the earlier build.
- three.js is code-split behind a dynamic import in both scene hooks. The entry
  bundle stays under ~60 KB gzip; keep three out of anything the entry imports
  (`planets.js` duplicates two camera numbers for exactly this reason).
- Both scenes were ported from three r128 prototypes into r185: point-light
  intensity is multiplied by 4π and decay pinned to 1. Do not copy prototype
  light values back in.

## Deploy

`vite.config.js` uses `base: "./"`, so the build works from a domain root or a
subpath without changes. Nothing is deployed yet.

- **Vercel / Netlify** — import the repo. Build `npm run build`, output `dist`.
- **GitHub Pages** — push `dist/` to `gh-pages`, or use an Actions workflow
  (the repo is private, which Pages needs a paid plan for).

## Before publishing

- [x] Teammate names and chat text in `public/images/oxilia-workspace.png` were
      already blurred in the source screenshot. Verified at 2× zoom on
      2026-09-03; the only legible name is Augniña's own, which stays.
- [x] AiCore's visual: the viewer recording (`public/video/aicore-viewer.mp4`)
      and the before/after still (`aicore-3d.png`) are both in the panel
      since 2026-09-15.
- [ ] Kwento Kard's role, result, live URL and screenshots — added 2026-09-15
      from Augniña's description; those four fields are still hers to fill.
- [ ] The hero's GitHub and LinkedIn links are `#` on purpose until Augniña
      says go. `links.js` already has the real URLs; the footer uses them.
- [x] Project logos: all but MealPlanner have a tile in the panel header
      (2026-09-15). Gourmet Getaway Tours' is a wide wordmark on transparency
      rather than a square app icon, which is why `.pw-logo` uses
      `object-fit: contain`.

## Image sizes

Lead images are resized so the long edge caps at 1400px, then palette-quantized.
No visible loss at display size. Untouched originals stay in the parent
`Portfolio/` folder.
