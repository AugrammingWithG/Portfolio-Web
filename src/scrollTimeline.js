/* ==========================================================================
   THE SCROLL TIMELINE — the page's three landmarks and the two numbers every
   scroll-driven part of the site reads off them.

   The hero and Selected Work are both runways: a tall block with a section
   stuck inside it, so the scroll IS the animation. The satellite flight reads
   its progress off the first, the planets' arrival off the second, and the
   carry-in and the case-study "pull to top" both need to know where the
   second one ends. Before this file each hook measured those for itself,
   with its own copy of the arithmetic and its own idea of the degenerate
   cases; the two readings of "arrival" could only agree by hand.

   Landmarks, by id — this module is imported from a hook mounted outside
   <main> and from one inside it, and ids are the one thing both can see:

     #top          the hero runway. Its top is progress 0.
     #work         the Selected Work runway. Its top is progress 1, and
                   arrival 0 — the moment the section pins.
     #work-landed  an anchor the section's CSS places where the planets are
                   home (the end of the pinned stretch). Arrival 1. CSS owns
                   that geometry, including collapsing it under reduced
                   motion; nothing here re-derives it — it is measured.

   Document-space positions are cached and re-measured on resize: they do
   not move on scroll, and every scroll event was paying for four rect reads
   to learn that. refresh() is exported for anything that changes layout
   above the fold without a resize.

   No three.js in here, on purpose: both dynamically imported scenes import
   the easing from this file, and it must stay in the entry bundle without
   dragging them in.
   ========================================================================== */

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* smoothstep — the reference's curve, used by both scenes and both hooks. */
export const ease = (t) => t * t * (3 - 2 * t);

const scrollY = () => window.scrollY || window.pageYOffset || 0;

let cache = null;

function measure() {
  const hero = document.getElementById("top");
  const work = document.getElementById("work");
  const landed = document.getElementById("work-landed");
  if (!hero || !work) return null;
  const y = scrollY();
  const heroTop = y + hero.getBoundingClientRect().top;
  const workTop = y + work.getBoundingClientRect().top;
  const landedTop = landed ? y + landed.getBoundingClientRect().top : workTop;
  return { heroTop, workTop, landedTop };
}

function marks() {
  if (!cache) cache = measure();
  return cache;
}

export function refresh() {
  cache = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", refresh);
  // Fonts and images landing can move everything below them.
  window.addEventListener("load", refresh);
}

/* 0 at the top of the hero, 1 where Selected Work meets the top of the
   viewport. */
export function readProgress() {
  const m = marks();
  if (!m) return 0;
  const span = m.workTop - m.heroTop;
  if (span <= 0) return 0;
  return clamp01((scrollY() - m.heroTop) / span);
}

/* 0 as Selected Work pins, 1 at #work-landed. A collapsed runway (reduced
   motion puts the anchor at the top) has no stretch and reads as landed. */
export function readArrival() {
  const m = marks();
  if (!m) return 1;
  const span = m.landedTop - m.workTop;
  if (span <= 0) return 1;
  return clamp01((scrollY() - m.workTop) / span);
}

/* Where the page is when the system is home, in document space. */
export function landedTop() {
  const m = marks();
  return m ? m.landedTop : 0;
}

/* A custom property that is written on change only, to two decimals. On
   :root a property write invalidates style for the whole document, so the
   hooks quantise their per-frame values before writing; this is that
   pattern once instead of a copy per property. Returns the value written
   (or the last one) so a caller can key a class toggle off it. */
export function quantisedWriter(el, name) {
  let last = -1;
  return (v) => {
    const q = Math.round(v * 100) / 100;
    if (q !== last) {
      last = q;
      el.style.setProperty(name, String(q));
    }
    return q;
  };
}
