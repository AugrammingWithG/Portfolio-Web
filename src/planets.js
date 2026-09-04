/* ==========================================================================
   PLANETS — the six worlds, shared by the hero flight and Selected Work.

   One list, two readers. The satellite flight (satelliteScene.js) uses the
   name, the tag line and the stack; Selected Work's case studies use every
   field. Keeping them on one array is what stops the two sections disagreeing
   about what the work is or what order it comes in.

   The source is projects.json, copied into src/ so Vite can resolve it from
   inside the app root (the original sits a directory above it, outside the
   Vite root). If the original changes, re-copy it — this file reads it, it
   does not restate it. Nothing here invents copy: a field missing from the
   JSON arrives as null and the panel shows the gap.

   ORDER. `projects` in file order, then `onHold`. That is the order the
   flight visits them and the order the case studies step through.

   INCOMING. Anything under `onHold` is flagged `soon`: dimmed globe, no flag,
   a SOON tag on its label, and a short "still landing" note instead of a
   write-up. Add a project to `onHold` in projects.json and it lands in the
   next free incoming slot on its own — that is the whole mechanism, there is
   no list of names anywhere in the code.
   ========================================================================== */
import data from "./projects.json";

/* ---- layout ------------------------------------------------------------- *
   The positions, sizes and ring tilts are the prototype's, kept exactly.
   They are slots, not projects: the prototype hard-coded a `home` onto each
   name, but the running order comes from projects.json now, so the shape of
   the system has to survive the data changing under it.

   Live work takes the five slots across the middle. Incoming work takes the
   two low, far slots — which is why it reads as further out before you have
   read a single label.                                                      */
const LIVE_SLOTS = [
  { size: 1.25, band: 1.1, home: [-4.6, 1.3, -4] },
  { size: 1.15, band: 0.7, home: [-2.3, -0.9, -3] },
  { size: 1.05, band: 1.4, home: [0, 1.15, -5.5] },
  { size: 1.1, band: 0.9, home: [2.4, -0.7, -3] },
  { size: 1.0, band: 1.2, home: [4.6, 1.0, -4] },
];

const SOON_SLOTS = [
  { size: 0.95, band: 1.0, home: [-3.3, -2.1, -6.5] },
  { size: 0.95, band: 1.3, home: [3.3, -2.2, -6.5] },
];

/* Past the hand-authored slots the system keeps its shape by spreading extra
   worlds around a wider ring, so adding a seventh live project widens the
   system instead of dropping a planet on top of an existing one. */
function overflowSlot(n, soon) {
  const a = 0.9 + n * 1.7;
  const r = soon ? 7.2 : 6.4;
  return {
    size: soon ? 0.95 : 1.0 + ((n * 0.07) % 0.2),
    band: 0.7 + ((n * 0.31) % 0.8),
    home: [Math.cos(a) * r, (soon ? -2.2 : 0.4) + Math.sin(a * 1.7) * 1.2, -4 - ((n * 1.1) % 3)],
  };
}

/* One number per planet, 0..1. It varies the spin and the line each world
   flies in on, so identical icosahedrons do not read as the same planet
   arriving twice. Fixed values, not random: both sections have to look the
   same on every load. */
const SEEDS = [0.17, 0.63, 0.31, 0.88, 0.44, 0.72, 0.55, 0.26];

/* ---- the "shown via" note ------------------------------------------------ *
   A project with a live URL gets a link. A project without one still has to
   say how you can see it, and that line is derived from what is on file
   rather than written per project: a case study either has screenshots
   attached or it is still waiting on its visuals. AiCore is the one waiting —
   its 3D-viewer recording drops into `images` and this line changes itself.

   projects.json can override it with a `shownVia` field if a project ever
   needs to say something more specific.                                     */
function shownVia(p) {
  if (p.shownVia) return p.shownVia;
  if (p.liveUrl) return null;
  return p.images && p.images.length
    ? "Shown via case study + screenshots."
    : "Shown via case study. Visuals to follow.";
}

const LIVE = data.projects.map((p) => ({ p, soon: false }));
const SOON = data.onHold.map((p) => ({ p, soon: true }));

let liveN = 0;
let soonN = 0;

export const PLANETS = [...LIVE, ...SOON].map(({ p, soon }, i) => {
  const pool = soon ? SOON_SLOTS : LIVE_SLOTS;
  const n = soon ? soonN++ : liveN++;
  const slot = pool[n] || overflowSlot(n, soon);

  return {
    id: p.id,
    name: p.name,
    /* The panel's tag line, and the satellite's one-liner. `tagline` is the
       field projects.json uses for it; an entry without one arrives null and
       renders as the site's dimmed // TODO. */
    tag: p.tagline || null,
    problem: p.problem || null,
    role: p.role || null,
    built: p.whatIBuilt || null,
    stack: p.stack || [],
    result: p.result || null,
    live: p.liveUrl || null, // <-- REAL URLS GO IN projects.json, not here
    shown: shownVia(p),
    soon,
    logo: null, // <-- PASTE LOGO PATH HERE (e.g. "images/logo-aicore.svg")
    seed: SEEDS[i % SEEDS.length],
    ...slot,
  };
});

export const LIVE_COUNT = PLANETS.filter((p) => !p.soon).length;
export const SOON_COUNT = PLANETS.length - LIVE_COUNT;

export default PLANETS;
