import { useEffect, useState } from "react";
import { PROCESS } from "./process.js";
import { readProgress, readArrival, quantisedWriter } from "./scrollTimeline.js";

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

   Progress and arrival are read from scrollTimeline.js, which finds the
   runways by id (#top, #work, #work-landed) rather than by threading refs
   from App down two levels: this component is mounted outside <main> so the
   canvas can span the page, and it has no other relationship to either
   section. If an id ever moves, the flight quietly does nothing rather than
   mis-scaling. The planet hook reads the same two numbers from the same
   file, so the layer's exit and the planets' arrival cannot drift apart.

   NOTHING GOES THROUGH REACT. Every value the flight produces — the glow, the
   canvas fade, the glow's horizontal position, the hero copy's fade — moves
   every frame and is written straight onto its element as a custom property.
   A re-render a frame would cost far more than the gradient it repaints.
   ========================================================================== */

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

    /* WHERE EACH LEADER LINE STARTS, in px. This used to be computed from
       step.x/step.y in process.js, which is only true at the width those
       percentages were written for: below 900px the captions are re-parked
       by CSS (one column, low on the screen — see satellite.css) and the
       line was being aimed from a point the caption is not at. That is why
       narrow screens had no pointing at all; the rule that hid the line was
       covering for geometry that would have been wrong.

       So the origin is MEASURED instead — .sat-note is a zero-sized point, so
       its own rect is the origin, whatever the stylesheet has done with it.
       Measured on resize only, never in the loop: the layout read is the
       thing this file is otherwise careful to keep out of the frame. */
    const originX = items.map(() => 0);
    const originY = items.map(() => 0);
    /* WHERE THE NAV ENDS, for the phone layout. Below 900px the captions sit
       at the top of the screen, under the nav (satellite.css), and the nav's
       height is not a constant: it wraps to two lines on a narrow phone and
       to three with a larger text setting. So it is measured here and handed
       to the stylesheet as --sat-nav-b, in the hero's own coordinates
       (offsetTop, not a viewport rect) so the number is right even when the
       resize happens with the page scrolled somewhere else. Written BEFORE
       the origins are read below, because the caption's position depends on
       it and the origin is the caption's position. */
    const nav = document.querySelector(".hero-top");
    const measureOrigins = () => {
      if (nav) {
        layer.style.setProperty("--sat-nav-b", Math.round(nav.offsetTop + nav.offsetHeight) + "px");
      }
      for (let i = 0; i < items.length; i += 1) {
        const r = items[i].getBoundingClientRect();
        originX[i] = r.left;
        originY[i] = r.top;
      }
    };

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
    const writeHero = quantisedWriter(root, "--hero-fade");
    const writeSky = quantisedWriter(root, "--sky-fade");

    /* THE HAND-OVER TO SELECTED WORK. Selected Work pins at the top of the
       viewport and holds for a stretch (see .sw-runway in selected-work.css),
       and over that stretch the planets come forward out of the depth the
       satellite went into. `arrival` is that stretch as 0..1, and it is the
       scene's second input: the ground the satellite dissolves into, the
       jump, and this layer's own fade are all computed there, next to the
       dissolve they belong with — see the timeline at the top of
       satelliteScene.js. This hook only reads the scroll and writes what the
       scene hands back. */

    /* The captions. Each is pinned at a fixed origin in the margin (--sx/--sy,
       set once as inline styles in SatelliteHero) and its leader line runs to
       a moving part of the satellite, which the scene has already projected to
       viewport percentages. All this does is turn those two points into the
       length and angle CSS can rotate a 1px rule by.

       A note that is off stays off cheaply: one write to drop it to zero, then
       nothing until it comes back. Most frames only one or two of the five are
       live, so this skips the majority of the work. */
    const writeNotes = (s) => {
      const heroFade = s.heroFade;
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

        const ox = originX[i];
        const oy = originY[i];
        const dx = (slot.x / 100) * vw - ox;
        const dy = (slot.y / 100) * vh - oy;

        el.style.setProperty("--len", Math.round(Math.hypot(dx, dy)) + "px");
        el.style.setProperty("--ang", ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2) + "deg");
        el.style.setProperty("--o", o.toFixed(3));
        /* Only the narrow layout reads this. There the caption sits under the
           satellite, in the column the hero's name and copy are still fading
           out of, so the line waits for them to go rather than crossing them.
           4x, not 1 - fade: at parity the line was already three quarters up
           while the lede was still plainly readable underneath it. This holds
           it until the copy is under a quarter opacity, which is step 3.
           Wide screens park the captions in the margins, where there is
           nothing to cross, and their CSS ignores it. */
        el.style.setProperty("--line-o", Math.max(0, 1 - heroFade * 4).toFixed(3));
        lastO[i] = o;
      }
    };

    const write = (s) => {
      layer.style.setProperty("--sat-glow", s.glow.toFixed(3));
      layer.style.setProperty("--sat-glow-x", `${s.glowX.toFixed(1)}%`);
      layer.style.setProperty("--sat-glow-scale", s.glowScale.toFixed(3));
      layer.style.setProperty("--sat-fade", s.fade.toFixed(3));
      layer.style.setProperty("--sat-ground", s.ground.toFixed(3));
      writeNotes(s);
      root.classList.toggle("is-flying", writeHero(s.heroFade) < 0.02);
      writeSky(s.skyFade);
    };

    /* One frame: place everything at (cur, arrival), draw it, write it out. */
    const paint = (cur, arr) => {
      const s = scene.update(cur, arr);
      scene.render();
      write(s);
      return s;
    };

    const read = () => {
      target = readProgress();
      arrival = readArrival();
    };

    function loop() {
      if (!alive || !scene) return;
      // Chase the scroll rather than snapping to it, exactly as the reference
      // does: the wheel arrives in jumps and a raw binding stutters.
      current += (target - current) * 0.1;
      const s = paint(current, arrival);

      /* Stop once nothing on the canvas moves on its own and the chase has
         caught up. Everything else this layer shows is a function of the
         scroll, and onScroll starts the loop again for one frame of that. */
      if (!s.live && Math.abs(target - current) < 0.001) {
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
      read();
      start();
    };
    const onResize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      measureOrigins();
      if (!scene) return;
      scene.resize();
      read();
      if (reduce) {
        paint(0, 0);
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
          paint(0, 0);
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

        measureOrigins();
        read();
        current = target;
        paint(current, arrival);
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
    /* The nav's height depends on how its mono face wraps, and that face
       arrives after first paint. Measured once at load, --sat-nav-b was the
       fallback font's number: 100px where the real one wraps to 119px, and
       the caption sat 3px into the nav on a 375-wide phone. Measure again
       once the fonts are in. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (alive) onResize();
      });
    }

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
