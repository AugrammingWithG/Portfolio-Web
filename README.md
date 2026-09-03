# Portfolio — Augniña Krizzel Reburiano

Full-Stack Developer & Creative Technologist. Vite + React, no UI framework.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build locally
```

## Layout

| Path | What it is |
| --- | --- |
| `src/Hero.jsx` | Name, positioning line, contact buttons |
| `src/SkillsKeyboard.jsx` | The mechanical keyboard — press, sound, description, assemble |
| `src/skills.js` | Every keycap, with `learning: true` for the honesty dots |
| `src/useClick.js` | The key click, generated with the Web Audio API (no audio files) |
| `src/Projects.jsx` | Shipped as-is from the brief. Self-contained styles. |
| `src/Footer.jsx` | GitHub, LinkedIn, email |
| `src/links.js` | Single source of truth for name and contact links |
| `src/styles.css` | Everything except Projects, which styles itself |
| `public/images/` | Project screenshots |

## The performance rule

The gold glow on a pressed key lives on its own overlay layer (`.kb-glow`), the
same trick `Projects.jsx` uses for `.pf-glow`. The frosted blur is set **once**
on `.kb-deck` and never changes. A key press only moves a `transform` and fades
an `opacity` — it never re-triggers `backdrop-filter`, which is what caused lag
in the earlier build. Keep it that way.

## Deploy

`vite.config.js` uses `base: "./"`, so the build works from a domain root or a
subpath without changes.

- **Vercel / Netlify** — import the repo. Build `npm run build`, output `dist`.
- **GitHub Pages** — push `dist/` to `gh-pages`, or use an Actions workflow.

## Before publishing

- [x] Teammate names and chat text in `public/images/oxilia-workspace.png` were already blurred
      in the source screenshot — verified at 2× zoom, both the Members panel and the chat
      message are unreadable. The only legible name is Augniña's own, which stays.
- [ ] Drop in AiCore's screenshot when the recording is done — its card shows a placeholder on purpose until then.

## Image sizes

Lead images are resized so the long edge caps at 1400px, then palette-quantized. No visible
loss at display size. Untouched originals stay in the parent `Portfolio/` folder.

| Image | Before | After |
| --- | --- | --- |
| `ggt-home.png` | 1.78 MB | 356 KB |
| `mealplanner-dashboard.png` | 633 KB | 168 KB |

Moving the lead images to WebP would take `ggt-home` to ~52 KB, but that needs a filename
change in `Projects.jsx`, which ships as-is on purpose.

No per-project repo links anywhere on this site: client work stays private.
