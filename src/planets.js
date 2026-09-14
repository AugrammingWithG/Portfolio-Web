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

   INCOMING. Anything under `onHold` is flagged `soon`, which now changes only
   what the section SAYS: a SOON tag on its label and a short "still landing"
   note instead of a write-up. It no longer changes how the planet looks or
   where it sits — see the layout note below. Add a project to `onHold` in
   projects.json and it lands in the next free slot on its own; that is the
   whole mechanism, there is no list of names anywhere in the code.
   ========================================================================== */
import data from "./projects.json";

/* ---- layout ------------------------------------------------------------- *
   A SCATTER, SIX PEERS. The pool is one list, not a live one and an incoming
   one: a slot does not know whether the project filling it has shipped. That
   is the whole of "no hierarchy" in mechanism — the rest is arithmetic.

   WHY NOT A RING. It was one, and the ring kept collapsing into a grid. Give
   six points an ellipse and spread them as far as the frame allows and they
   arrange themselves three along the top and three along the bottom, which
   reads as a table of contents rather than a system. So the arrangement is
   scattered on purpose, under rules rather than by taste:

     * no two planets share a height. Sorted by height, every step between
       neighbours is between 0.06 and 0.17 of the frame — a real step, never
       so big it leaves a bare band. That single rule is what kills the rows.
     * no two share a column either, by at least 0.07.
     * no three fall near one line, so the eye cannot join them into a row
       that was not meant to be there.
     * the depths spread over three units, so dragging parallaxes them apart
       instead of sliding one flat plane.

   EQUAL MEANS EQUAL ON SCREEN, which is not equal in world units: a planet
   further from the camera has to be BIGGER to read the same size. So these
   are placed by where they should land in the frame, and the world position
   and size are solved from that. All six project to a disc of DISC frame-
   heights whatever depth they sit at — depth still reads as depth, and none
   of them reads as lesser. planetScene.js carries the matching rule for the
   detail view; see STAGE_R there, and do not reintroduce a flat multiplier.

   Measured, not eyeballed: the six clear each other by 11.1% of the frame's
   height, and hold that at every width the ring is squeezed to, down to the
   0.7 floor in planetScene.js. Every label lands inside the frame.

   HOW WIDE. Drawn at the width a normal browser window holds, not the width
   the narrowest one does — an earlier pass sized it so a 4:3 window would
   never clip and left a 16:9 frame with a quarter of its height as dead
   margin down each side, and real viewports are wider still, nearer 2:1 once
   the browser takes its chrome out of the height. planetScene.js pulls the
   whole arrangement in horizontally when a frame genuinely cannot hold it
   (see fitWidth there), so a 4:3 window gets the same composition, narrower.

   RE-MEASURE AFTER ANY MOVE. These are not numbers to nudge by eye: they are
   the output of a search over exactly the rules above, and the constraint
   that binds is rarely the one that looks tight.                            */

/* A COPY OF THE CAMERA. planetScene.js owns the real one — fov 46, sitting at
   z 6, looking at (0,0,-2) — and it cannot be imported from here without
   dragging three.js into the entry bundle, which is the one thing the dynamic
   import in that file exists to prevent. So these three numbers are duplicated
   on purpose. CHANGE THEM THERE AND THEY MUST CHANGE HERE, or every planet
   below lands somewhere other than where it says it does.                   */
const CAM_Z = 6;
const FOV = 46;

/* Half the frame's height, in world units, at a given depth. */
const halfFrame = (z) => Math.tan(((FOV / 2) * Math.PI) / 180) * (CAM_Z - z);

/* The globe plus the gold band around it, as a multiple of `size` — the band
   is the widest part, so it is what has to clear the neighbours. */
const BAND_R = 1.13;

/* Every planet's on-screen radius, in units of the viewport's height. The one
   number that makes the six read as peers; raise it and they start touching. */
const DISC = 0.145;

/* Place a planet by where it should LAND IN THE FRAME rather than by where it
   sits in space. sx and sy are viewport-height units out from the middle, and
   the size that projects to DISC at that depth falls out of the arithmetic.
   Rounded to two places so the numbers that ship are the numbers measured. */
function slot(sx, sy, z, band) {
  const f = 2 * halfFrame(z);
  return {
    size: +((DISC * f) / BAND_R).toFixed(2),
    band,
    home: [+(sx * f).toFixed(2), +(sy * f).toFixed(2), z],
  };
}

/* The ring, clockwise from the top. The depths alternate so it still reads as
   a system in space rather than six discs painted on glass; the sizes differ
   in world units for the same reason, and cancel out on screen. `band` is the
   ring tilt, carried over per position so no two look stamped from one mould. */
const SLOTS = [
  slot(0.548, -0.264, -4.68, 1.1),
  slot(-0.368, 0.223, -7.42, 0.7),
  slot(-0.168, -0.330, -5.27, 1.4),
  slot(0.659, 0.158, -7.46, 0.9),
  slot(-0.659, -0.123, -6.57, 1.2),
  slot(0.123, 0.016, -6.38, 1),
];

/* Past the six the ring holds, extra worlds keep walking round a wider, looser
   ellipse at the same on-screen size, so the system bends rather than dropping
   a planet on top of an existing one. Six is what this frame fits with daylight
   between every pair, though — a seventh project wants the ring re-measured
   rather than this function trusted. It keeps the shape; it promises no gap. */
function overflowSlot(n) {
  const a = 0.35 + n * 1.9;
  return slot(
    Math.cos(a) * 0.52,
    Math.sin(a) * 0.33,
    -7 - ((n * 1.1) % 3),
    0.7 + ((n * 0.31) % 0.8)
  );
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

export const PLANETS = [...LIVE, ...SOON].map(({ p, soon }, i) => {
  /* One pool, indexed by position in the list. `soon` is not consulted here
     and must not be: the moment a slot depends on it, the hierarchy is back. */
  const place = SLOTS[i] || overflowSlot(i - SLOTS.length);

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
    logo: null, // <-- PASTE LOGO PATH HERE (e.g. "images/logo-aicore.svg")
    seed: SEEDS[i % SEEDS.length],
    ...place,
  };
});

export const LIVE_COUNT = PLANETS.filter((p) => !p.soon).length;
export const SOON_COUNT = PLANETS.length - LIVE_COUNT;

export default PLANETS;
