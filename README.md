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
| `src/process.js` | The five build steps the satellite is annotated with. Edit the copy here |
| `src/SelectedWork.jsx` + `usePlanetSystem.js` + `planetScene.js` | The planet system and the case-study panel |
| `src/planets.js` | Reads `src/projects.json` into the six planets. Order, "Soon" tagging, screenshots, the "shown via" line |
| `src/projects.json` | **The project data.** A copy of `../projects.json`; keep the two identical |
| `src/SkillsKeyboard.jsx` + `skills.js` + `useClick.js` | The mechanical keyboard: press, generated click, description, assemble, mute. `learning: true` earns the honesty dot |
| `src/Footer.jsx` | GitHub, LinkedIn, email |
| `src/links.js` | Single source of truth for name, role and contact links |
| `src/hud.css` | The shared `.sector` shell and **the scrim handoff chain**. Read that comment before changing any section's top or bottom |
| `src/styles.css`, `hero.css`, `satellite.css`, `selected-work.css`, `skills-keyboard.css` | One stylesheet per section |
| `public/images/` | Project screenshots, referenced by filename from `projects.json` |

The prototypes both 3D sections were ported from live outside the repo, in
`../prototypes/` (`planet-case-study-fixed.html`, `selected-work.html`) and
`../satellite-hero-reference.html`. Earlier versions of the sections
(`Projects.jsx`, the astronaut `SelectedWorkOrbit.jsx`) are in git history.

## Editing the projects

Everything the site says about a project comes from `src/projects.json`.

- `images` — bare filenames under `public/images/`. The case-study panel shows
  them in a Screens row; `platform: "mobile"` lays them out two up.
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
- [ ] AiCore's visual. `public/images/aicore-3d.png` (a before/after of the
      3D reconstruction) is on disk but not yet listed in `projects.json`;
      the panel says "Visuals to follow" until it is.
- [ ] The hero's GitHub and LinkedIn links are `#` on purpose until Augniña
      says go. `links.js` already has the real URLs; the footer uses them.
- [ ] Project logos for the planets (`logo: null` in `planets.js`; the slot is
      built in `planetScene.js`).

## Image sizes

Lead images are resized so the long edge caps at 1400px, then palette-quantized.
No visible loss at display size. Untouched originals stay in the parent
`Portfolio/` folder.
