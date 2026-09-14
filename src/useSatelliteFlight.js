import { useEffect, useState } from "react";
import { PROCESS } from "./process.js";

/* ==========================================================================
   The satellite's lifecycle and its binding to the page.

   Build the scene, run it, pause it when it cannot be seen, dispose it on
   unmount — with scroll scrubbing layered on, because this object is dragged
   along a timeline rather than idling in place.

   THE RANGE. The reference file drives progress from a wheel handler and a
   slider, because a page with `overflow:hidden` has no scroll to read. Here
   progress is the real thing: 0 at the top of the hero's runway, 1 where
   Selected Work reaches the top of the viewport. The runway is a tall block
   with the hero stuck inside it (see .hero-runway in hero.css), so the whole
   flight plays over the hero's own background and lands in Selected Work.
   The canvas is fixed and page-wide because it has to outlive the one screen
   the hero occupies.

   The two ends are found by id (#top and #work) rather than by threading refs
   from App down two levels: this component is mounted outside <main> so the
   canvas can span the page, and it has no other relationship to either
   section. If either id ever moves, the flight quietly does nothing rather
   than mis-scaling.

   NOTHING GOES THROUGH REACT. Every value the flight produces — the glow, the
   canvas fade, the glow's horizontal position, the hero copy's fade — moves
   every frame and is written straight onto its element as a custom property.
   A re-render a frame would cost far more than the gradient it repaints.
   ========================================================================== */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => t * t * (3 - 2 * t); // the scene's smoothstep

/* 0 at the top of the hero, 1 where Selected Work meets the top of the
   viewport. Two rect reads per scroll event. */
function readProgress() {
  const hero = document.getElementById("top");
  const work = document.getElementById("work");
  if (!hero || !work) return 0;

  const y = window.scrollY || window.pageYOffset || 0;
  const start = y + hero.getBoundingClientRect().top;
  const end = y + work.getBoundingClientRect().top;
  const span = end - start;
  if (span <= 0) return 0;
  return clamp01((y - start) / span);
}

/* The stretch after that: 0 as Selected Work pins, 1 when its runway is used
   up. The same reading usePlanetSystem.js makes of the same element, so the
   layer's exit and the planets' arrival cannot drift apart. #work is the
   runway; its sticky section is the first element child. A runway with no
   spare height (reduced motion) reads as landed. */
function readArrival() {
  const work = document.getElementById("work");
  if (!work) return 1;
  const section = work.querySelector(".sw");
  const span = work.offsetHeight - (section ? section.offsetHeight : 0);
  if (span <= 0) return 1;
  const y = window.scrollY || window.pageYOffset || 0;
  const top = y + work.getBoundingClientRect().top;
  return clamp01((y - top) / span);
}

export default function useSatelliteFlight(canvasRef, layerRef, notesRef) {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!canvas || !layer) return undefined;

    /* The caption elements, collected once. The list is static — five items
       straight out of process.js — so there is nothing here for React to
       re-render, and querying every frame would be five selector runs a frame
       for a list that cannot change. */
    const notes = notesRef && notesRef.current ? notesRef.current : null;
    const items = notes ? Array.from(notes.querySelectorAll(".sat-note")) : [];
    const lastO = items.map(() => -1);

    /* Leader-line geometry is in pixels, so the viewport has to be on hand.
       Cached rather than read per frame: innerWidth/innerHeight force layout
       and neither changes without a resize event. */
    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);

    let scene = null;
    let raf = null;
    let alive = true;
    let target = 0;
    let arrival = 0;
    let current = 0;
    let park = null;

    /* The glow and canvas values live on the layer itself, which is three
       elements deep and cheap to invalidate. The hero's fade has to be read
       by hero.css, so it goes on :root — and a :root custom property
       invalidates style for the whole document, so it is quantised and only
       written when it actually changes. `is-flying` takes the faded copy out
       of the tab order once it is invisible; opacity alone would leave three
       focusable links behind a satellite. */
    const root = document.documentElement;
    let lastHero = -1;
    let lastSky = -1;

    /* THE HAND-OVER TO SELECTED WORK, in two values.

       The layer does not stop at the section's edge any more. Selected Work
       pins at the top of the viewport and holds for a stretch (see .sw-runway
       in selected-work.css), and over that stretch the planets come forward
       out of the depth the satellite went into. `arrival` is that stretch as
       0..1, read from the same runway the planet hook reads it from, and the
       layer leaves across it rather than at the edge, so the stars here hand
       over to the planet scene's own stars instead of cutting to them.

       `ground` is the space the satellite dissolves into. A near-black fill
       on the layer, under the canvas: it comes up as the pieces go (eased
       `current`, so it tracks the dissolve exactly) and clears again as the
       system arrives (raw `arrival`, see below). While it is up it covers the
       page, which is what hides the section sliding in underneath — with it,
       what you see is the satellite gone into deep space and the planets
       coming out of it, not one section scrolling over another.

       Both take the raw scroll for their way OUT: the point of them is that
       the layer is off the planets by the time anyone can drag one, and an
       eased fade misses that whenever the scroll arrives in one jump — an
       anchor link to #work-landed, a restored position, a fast flick. */
    const fadeAt = (arrival) => 1 - clamp01((arrival - 0.35) / 0.45);
    /* The jump. Up as the last pieces go (eased, with the dissolve), held
       through the pin, and down again over the first half of the arrival
       (raw, so it is over before anything can be dragged). The planets
       decelerate into place as the streaks shorten — that is the whole
       transition: not a black beat, a jump you arrive out of. */
    const warpAt = (cur, arrival) =>
      ease(clamp01((cur - 0.84) / 0.13)) * (1 - ease(clamp01((arrival - 0.08) / 0.4)));
    const groundAt = (cur, arrival) =>
      ease(clamp01((cur - 0.88) / 0.11)) * (1 - ease(clamp01(arrival / 0.25)));

    /* The captions. Each is pinned at a fixed origin in the margin (--sx/--sy,
       set once as inline styles in SatelliteHero) and its leader line runs to
       a moving part of the satellite, which the scene has already projected to
       viewport percentages. All this does is turn those two points into the
       length and angle CSS can rotate a 1px rule by.

       A note that is off stays off cheaply: one write to drop it to zero, then
       nothing until it comes back. Most frames only one or two of the five are
       live, so this skips the majority of the work. */
    const writeNotes = (s) => {
      for (let i = 0; i < items.length; i += 1) {
        const el = items[i];
        const slot = s.notes[i];
        if (!el || !slot) continue;

        const o = slot.o;
        if (o <= 0.001) {
          if (lastO[i] !== 0) {
            el.style.setProperty("--o", "0");
            lastO[i] = 0;
          }
          continue;
        }

        const step = PROCESS[i];
        const ox = (step.x / 100) * vw;
        const oy = (step.y / 100) * vh;
        const dx = (slot.x / 100) * vw - ox;
        const dy = (slot.y / 100) * vh - oy;

        el.style.setProperty("--len", Math.round(Math.hypot(dx, dy)) + "px");
        el.style.setProperty("--ang", ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2) + "deg");
        el.style.setProperty("--o", o.toFixed(3));
        lastO[i] = o;
      }
    };

    const write = (s, fade, ground) => {
      layer.style.setProperty("--sat-glow", s.glow.toFixed(3));
      layer.style.setProperty("--sat-glow-x", `${s.glowX.toFixed(1)}%`);
      layer.style.setProperty("--sat-glow-scale", s.glowScale.toFixed(3));
      layer.style.setProperty("--sat-fade", fade.toFixed(3));
      layer.style.setProperty("--sat-ground", ground.toFixed(3));
      writeNotes(s);

      const hero = Math.round(s.heroFade * 100) / 100;
      if (hero !== lastHero) {
        lastHero = hero;
        root.style.setProperty("--hero-fade", String(hero));
        root.classList.toggle("is-flying", hero < 0.02);
      }
      // Same treatment as --hero-fade: on :root, quantised, written on change.
      const sky = Math.round(s.skyFade * 100) / 100;
      if (sky !== lastSky) {
        lastSky = sky;
        root.style.setProperty("--sky-fade", String(sky));
      }
    };

    function loop() {
      if (!alive || !scene) return;
      // Chase the scroll rather than snapping to it, exactly as the reference
      // does: the wheel arrives in jumps and a raw binding stutters.
      current += (target - current) * 0.1;
      const ground = groundAt(current, arrival);
      const fade = fadeAt(arrival);
      const s = scene.update(current, ground, warpAt(current, arrival));
      scene.render();
      write(s, fade, ground);

      // Nothing left to draw once the layer has handed over to Selected Work
      // and the chase has caught up. onScroll starts it again.
      if (fade <= 0.001 && Math.abs(target - current) < 0.001) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (raf || !scene || reduce || document.hidden) return;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    const onScroll = () => {
      target = readProgress();
      arrival = readArrival();
      start();
    };
    const onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      if (!scene) return;
      scene.resize();
      target = readProgress();
      arrival = readArrival();
      if (reduce) {
        write(scene.update(0), 1, 0);
        scene.render();
      } else {
        start();
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    (async () => {
      try {
        const { createScene } = await import("./satelliteScene.js");
        if (!alive) return;
        scene = await createScene(canvas);
        if (!alive) {
          scene.dispose();
          scene = null;
          return;
        }

        if (reduce) {
          /* Reduced motion: the satellite whole, one frame, no fly-in and no
             planets. The sections below reveal themselves the way they always
             do — nothing here is holding them back. */
          write(scene.update(0), 1, 0);
          scene.render();
          setReady(true);
          /* A fixed canvas that never moves would sit over Selected Work and
             Skills for the rest of the page, so it is dismissed once the hero
             is behind you. One class, one transition. */
          /* rootMargin -1px: an element whose bottom edge exactly touches the
             top of the viewport still counts as intersecting, and that is
             exactly where an anchor link to #work-landed puts the hero. Without
             the margin the whole satellite would sit over the planets there. */
          park = new IntersectionObserver(
            ([e]) => layer.classList.toggle("is-parked", !e.isIntersecting),
            { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
          );
          const hero = document.getElementById("top");
          if (hero) park.observe(hero);
          return;
        }

        target = readProgress();
        arrival = readArrival();
        current = target;
        const ground = groundAt(current, arrival);
        write(scene.update(current, ground, warpAt(current, arrival)), fadeAt(arrival), ground);
        scene.render();
        setReady(true);
        start();
      } catch (err) {
        // No WebGL, or the chunk failed. The hero copy, the background and
        // every section below it stand on their own.
        console.warn("satellite scene unavailable:", err);
      }
    })();

    if (!reduce) window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      stop();
      // Leave the document as we found it — the hero owns its own opacity
      // again the moment the flight is not driving it.
      root.style.removeProperty("--hero-fade");
      root.style.removeProperty("--sky-fade");
      root.classList.remove("is-flying");
      if (park) park.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (scene) scene.dispose();
    };
  }, [canvasRef, layerRef, notesRef]);

  return { ready, reduced };
}
