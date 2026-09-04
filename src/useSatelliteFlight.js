import { useEffect, useState } from "react";

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

export default function useSatelliteFlight(canvasRef, layerRef) {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!canvas || !layer) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);

    let scene = null;
    let raf = null;
    let alive = true;
    let target = 0;
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

    /* The hand-over to Selected Work. Taken from the raw scroll rather than
       the eased `current` every other value here runs on: the point of it is
       that this layer is gone by the time the planet system is on screen, and
       an eased fade misses that deadline whenever the scroll arrives in one
       jump — an anchor link to #work, a restored position, a fast flick. The
       satellite then paints over a section that is itself a 3D scene. */
    const fadeAt = (p) => 1 - clamp01((p - 0.965) / 0.035);

    const write = (s, fade) => {
      layer.style.setProperty("--sat-glow", s.glow.toFixed(3));
      layer.style.setProperty("--sat-glow-x", `${s.glowX.toFixed(1)}%`);
      layer.style.setProperty("--sat-fade", fade.toFixed(3));

      const hero = Math.round(s.heroFade * 100) / 100;
      if (hero !== lastHero) {
        lastHero = hero;
        root.style.setProperty("--hero-fade", String(hero));
        root.classList.toggle("is-flying", hero < 0.02);
      }
    };

    function loop() {
      if (!alive || !scene) return;
      // Chase the scroll rather than snapping to it, exactly as the reference
      // does: the wheel arrives in jumps and a raw binding stutters.
      current += (target - current) * 0.1;
      const s = scene.update(current);
      scene.render();
      const fade = fadeAt(target);
      write(s, fade);

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
      start();
    };
    const onResize = () => {
      if (!scene) return;
      scene.resize();
      target = readProgress();
      if (reduce) {
        write(scene.update(0), fadeAt(0));
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
          write(scene.update(0), fadeAt(0));
          scene.render();
          setReady(true);
          /* A fixed canvas that never moves would sit over Selected Work and
             Skills for the rest of the page, so it is dismissed once the hero
             is behind you. One class, one transition. */
          park = new IntersectionObserver(
            ([e]) => layer.classList.toggle("is-parked", !e.isIntersecting),
            { threshold: 0 }
          );
          const hero = document.getElementById("top");
          if (hero) park.observe(hero);
          return;
        }

        target = readProgress();
        current = target;
        write(scene.update(current), fadeAt(target));
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
      root.classList.remove("is-flying");
      if (park) park.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (scene) scene.dispose();
    };
  }, [canvasRef, layerRef]);

  return { ready, reduced };
}
