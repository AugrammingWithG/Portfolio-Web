/* ==========================================================================
   PLANETS — the seven worlds, shared by the hero flight and Selected Work.

   One list, two readers. The satellite flight (satelliteScene.js) uses the
   name, the tag line and the stack; Selected Work's case studies use every
   field. Keeping them on one array is what stops the two sections disagreeing
   about what the work is or what order it comes in.

   The source is projects.json, copied into src/ so Vite can resolve it from
   inside the app root (the original sits a directory above it, outside the
   Vite root). If the original changes, re-copy it — this file reads it, it
   does not restate it. Nothing here invents copy: a field missing from the
   JSON arrives as null and the panel shows the gap.

   ORDER. `projects` in file order, then `onHold`. That is the ring order,
   inner to outer, the order of the strip under the orbit, and the order the
   case studies step through.

   INCOMING. Anything under `onHold` is flagged `soon`, which changes only
   what the section SAYS: a SOON tag on its tile and a short "still landing"
   note instead of a write-up. It does not change how the planet looks or
   which ring it gets — see the layout note below. Add a project to `onHold` in
   projects.json and it lands in the next free slot on its own; that is the
   whole mechanism, there is no list of names anywhere in the code.
   ========================================================================== */
import data from "./projects.json";

/* ---- layout: the orbit --------------------------------------------------- *
   ONE STAR, SEVEN RINGS, ONE PLANET EACH. Since 2026-09-15 the system view is
   an orbital diagram (Augniña's ask, from a TRAPPIST-1 infographic): a small
   gold star in the middle, concentric elliptical rings seen in perspective,
   and every project on its own ring, all of them circling. The scatter this
   replaced was measured to have no hierarchy; the orbit has one by nature —
   inner and outer — so the ring order is simply the file order, the same
   order the case studies step through and the strip below lists. Nothing
   about a ring says "better", the way a bigger planet would have.

   Everything here is in RING SPACE: a radius on a flat disc and a phase. The
   tilt that turns discs into ellipses, the fit to the frame and the actual
   world positions are planetScene.js's (see ORBIT there) — it is the only
   file that knows where the camera is, and the one place the tilt lives.

   MOTION. Each ring turns at its own rate, inner faster than outer, scaled
   from the innermost period by (r / r_in)^0.7 — softer than Kepler's 1.5,
   which would leave the outermost planet barely moving inside one visit.
   Phases are spread by the golden angle, so the seven never bunch on one
   side of the star and rarely pass each other at the same moment.

   SIZE. One radius for all seven. Perspective does the rest: a planet on the
   near side of its ring is closer to the camera and reads bigger, and swaps
   with the far side as it comes round — the reference does the same. The
   equal-on-screen rule the scatter needed is gone with the scatter.        */

const RING_IN = 1.15; // innermost ring's radius, world units
const RING_STEP = 0.5; // between rings
const SIZE = 0.34; // every globe's radius, world units
const PERIOD_IN = 48; // seconds for one lap of the innermost ring
const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~137.5°

/* Band tilts, carried per ring so no two look stamped from one mould. */
const BANDS = [1.1, 0.7, 1.4, 0.9, 1.2, 1, 0.8, 1.3];

function ringSlot(i) {
  const r = +(RING_IN + i * RING_STEP).toFixed(2);
  return {
    ring: i,
    r,
    phase: +((0.9 + i * GOLDEN) % (Math.PI * 2)).toFixed(3),
    period: +(PERIOD_IN * Math.pow(r / RING_IN, 0.7)).toFixed(1),
    size: SIZE,
    band: BANDS[i % BANDS.length],
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
   attached or it is still waiting on its visuals. A recording (`video`)
   counts as a visual too.

   projects.json can override it with a `shownVia` field if a project ever
   needs to say something more specific.                                     */
function shownVia(p) {
  if (p.shownVia) return p.shownVia;
  if (p.liveUrl) return null;
  const shots = p.images && p.images.length;
  if (p.video) return shots ? "Shown via case study, recording + screenshots." : "Shown via case study + recording.";
  return shots ? "Shown via case study + screenshots." : "Shown via case study. Visuals to follow.";
}

const LIVE = data.projects.map((p) => ({ p, soon: false }));
const SOON = data.onHold.map((p) => ({ p, soon: true }));

export const PLANETS = [...LIVE, ...SOON].map(({ p, soon }, i) => {
  /* Ring by position in the list. `soon` is not consulted here and must not
     be: the moment a ring depends on it, "incoming" becomes "outer". */
  const place = ringSlot(i);

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
    /* The screenshots, as paths under public/. `images` in projects.json is
       bare filenames; the panel is what says "Shown via ... screenshots", so
       it is also what has to show them. `platform` decides how they lay out:
       phone shots are tall and sit two up, everything else stacks. */
    shots: (p.images || []).map((f) => `images/${f}`),
    platform: p.platform || "web",
    soon,
    /* The mark, for the panel's header. Optional: a project without one keeps
       the name on its own and the panel holds no space for it. The files are
       square app-icon tiles under public/images/ — `logo` in projects.json.
       They are not painted on the globe; the globe stays a globe. */
    logo: p.logo ? `images/${p.logo}` : null,
    /* A recording, when a project has one. A real <video> at the top of the
       panel's evidence; the poster is what shows before play. */
    video: p.video ? `video/${p.video}` : null,
    videoPoster: p.videoPoster ? `images/${p.videoPoster}` : null,
    seed: SEEDS[i % SEEDS.length],
    ...place,
  };
});

export const LIVE_COUNT = PLANETS.filter((p) => !p.soon).length;
export const SOON_COUNT = PLANETS.length - LIVE_COUNT;

export default PLANETS;
