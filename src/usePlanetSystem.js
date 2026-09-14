import { useCallback, useEffect, useRef, useState } from "react";
import { PLANETS } from "./planets.js";

/* ==========================================================================
   Selected Work's lifecycle, and every input the section listens to.

   Same shape as the other scene hooks on the site: build the scene, run it,
   pause it when it cannot be seen, dispose it on unmount. What is specific to
   this one is the input handling, because the prototype could assume it owned
   the whole viewport and this cannot.

   THE SCROLL RULE. The prototype sets `body { overflow:hidden }`, so its
   wheel handler could never fight anything. On a real page it can, so the
   rule is narrow and absolute:

     * not in detail  -> the handler returns immediately and the page scrolls
                         exactly as it would with no JavaScript here at all
     * in detail      -> the wheel belongs to this section. The panel gets it
                         first, and only once the panel has nothing left to
                         give does the wheel move between projects.

   In detail the handler always calls preventDefault and drives the panel by
   hand rather than letting some wheels through, because "let it through"
   depends on where the pointer is: over the canvas the browser would scroll
   the page, over the panel it would scroll the panel, and the same gesture
   would do two different things. Owning it outright is what makes the rule
   the same everywhere on the section. Esc, Back, and Prev/Next are always
   there to get out, so this is never a trap.

   WHAT GOES THROUGH REACT. The state machine, which project is open, and
   whether the panel is mid-swap — a handful of updates per interaction. The
   warp flash writes itself straight to its own element inside the scene.
   ========================================================================== */

/* The state moves the scene would have made, for when there is no scene. Kept
   out here so the effect's key and wheel handlers and the component's buttons
   all go through the same three moves rather than each growing their own
   copy — the fallback drifting out of step with the real thing is exactly the
   bug that hides until someone has no WebGL. */
const openFallback = (v, i) => ({ ...v, state: "detail", index: i, contentIndex: i, panelDim: false });
const navFallback = (v, d) => {
  const n = (v.contentIndex + d + PLANETS.length) % PLANETS.length;
  return { ...v, index: n, contentIndex: n };
};
const closeFallback = (v) => ({ ...v, state: "system", index: -1 });

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* THE ARRIVAL, as a scroll position. The section sits sticky inside a taller
   runway (.sw-runway), the same shape as the hero: it reaches the top of the
   viewport and then holds there while the rest of the runway scrolls under
   it. That held stretch is the arrival — 0 the moment the section pins, 1
   when the runway is used up and the section is about to release. The
   satellite's flight is read the same way from its own runway, and the two
   meet: its 1 is this 0.

   A runway with no spare height (reduced motion collapses it) has no stretch
   to scrub, and reads as already landed. */
function readArrival(runway, section) {
  if (!runway || !section) return 1;
  const span = runway.offsetHeight - section.offsetHeight;
  if (span <= 0) return 1;
  const y = window.scrollY || window.pageYOffset || 0;
  const top = y + runway.getBoundingClientRect().top;
  return clamp01((y - top) / span);
}

export default function usePlanetSystem(refs) {
  const { canvasRef, sectionRef, runwayRef, flashRef, panelRef, labelRefs } = refs;

  const [ready, setReady] = useState(false);
  /* The scene could not be built — no WebGL, or the chunk failed. The section
     falls back to the label list, which is the same work in the same order
     and still opens every case study. */
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState({
    state: "system",
    index: -1,
    contentIndex: -1,
    panelDim: false,
  });
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // The scene, held so the component's buttons can drive it.
  const api = useRef(null);
  /* The current state, readable from inside the effect's handlers. They run
     from listeners registered once, so they cannot close over `view`. */
  const stateRef = useRef("system");
  stateRef.current = view.state;

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);

    let scene = null;
    let raf = null;
    let alive = true;
    let onScreen = false;
    let wheelLock = null;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;

    const emit = (patch) => {
      if (alive) setView((v) => ({ ...v, ...patch }));
    };

    /* The scrub. Every scroll event reads where the section is in its runway
       and hands it to the scene, which places the six planets accordingly;
       the same number goes on the section as --sw-in so the HUD, the corner
       frame and the hint fade in with the system instead of riding the
       section's edge up the screen while it is still empty. Quantised and
       written only on change, for the same reason --hero-fade is. */
    const runway = runwayRef ? runwayRef.current : null;
    let lastIn = -1;
    const applyArrival = () => {
      const a = readArrival(runway, section);
      if (scene) scene.setArrival(a);
      const q = Math.round(a * 100) / 100;
      if (q !== lastIn) {
        lastIn = q;
        section.style.setProperty("--sw-in", String(q));
      }
    };
    /* THE CARRY-IN. Once the satellite has dissolved the reader is looking
       at dark space with the planets still out in it, and a scroll that stops
       there should not leave them to push the last stretch by hand: the page
       eases to the landed position itself. The arrival is scrubbed by scroll
       and a smooth scroll is scroll, so the carry IS the arrival playing.

       Guards, all of them load-bearing:
         * downward only — a reader backing up out of the system is leaving,
           not arriving, and must not be turned around
         * only once the captions are done — from 0.76 of the hero's runway
           (the last caption closes at 0.76, see process.js) to just short of
           landed. Everything after that point is the dissolve, the jump and
           the arrival, none of which needs the reader's hand on it
         * only in the system view: while a case study is open the wheel is
           the panel's and the page does not scroll at all
         * never under reduced motion

       scrollend where the browser has it — by definition nothing is in flight
       when it fires, so every scrollend is a fresh decision, and a carry the
       reader interrupted with a second wheel tick simply gets decided again
       at their next stop. Where there is no scrollend, a short debounce on
       scroll stands in, with a latch so a carry in progress is not restarted
       every 160ms by its own scroll events. The page's CSS proximity snap
       (see html in styles.css) aims at the same point, so the two never
       disagree about where to settle.                                       */
    let lastScrollY = window.scrollY || 0;
    let goingDown = true;
    let carrying = false;
    let carryTimer = null;
    const carryIn = () => {
      if (reduce || !runway || !goingDown) return false;
      if (stateRef.current !== "system") return false;
      const span = runway.offsetHeight - section.offsetHeight;
      if (span <= 0) return false;
      const top = runway.getBoundingClientRect().top;
      /* Where we are in the hero's flight, read the way the flight reads it:
         the runway's top is the flight's end, its height the flight's span. */
      const hero = document.getElementById("top");
      const heroSpan = hero ? hero.offsetHeight : 0;
      const p = heroSpan > 0 ? 1 - top / heroSpan : 1;
      if (p < 0.76) return false;
      const y = window.scrollY || 0;
      const landed = top + y + span;
      if (y >= landed - 2) return false;
      window.scrollTo({ top: landed, behavior: "smooth" });
      return true;
    };
    const onScrollEnd = () => {
      carryIn();
    };
    const carryDebounced = () => {
      if (carrying) return;
      if (carryIn()) {
        carrying = true;
        window.setTimeout(() => {
          carrying = false;
        }, 900);
      }
    };
    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y !== lastScrollY) goingDown = y > lastScrollY;
      lastScrollY = y;
      applyArrival();
      if (!("onscrollend" in window)) {
        if (carryTimer) window.clearTimeout(carryTimer);
        carryTimer = window.setTimeout(carryDebounced, 160);
      }
    };

    function loop() {
      if (!alive || !scene) return;
      scene.frame();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (raf || !scene || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    /* ---- pointer ---------------------------------------------------------
       Down on the canvas starts a drag; up decides whether it was a drag or a
       click. `moved` is the prototype's 4px slop, so a small wobble while
       clicking a planet still opens it.                                     */
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      if (scene && scene.getState() === "detail") canvas.style.cursor = "grabbing";
    };

    const onUp = (e) => {
      if (!scene) return;
      if (dragging && moved < 4 && scene.getState() === "system") {
        const p = local(e);
        // Only count a click that actually landed on the canvas.
        if (p.x >= 0 && p.y >= 0 && p.x <= canvas.clientWidth && p.y <= canvas.clientHeight) {
          const i = scene.pick(p.x, p.y);
          if (i >= 0) openAt(i);
        }
      }
      dragging = false;
      if (scene.getState() === "detail") canvas.style.cursor = "grab";
    };

    /* A touch the browser takes for scrolling (touch-action: pan-y on the
       canvas) ends in pointercancel, not pointerup. Without this the drag
       stays armed and the next stray move spins the system. */
    const onCancel = () => {
      dragging = false;
      if (scene && scene.getState() === "detail") canvas.style.cursor = "grab";
    };

    const onMove = (e) => {
      if (!scene) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      if (dragging) {
        moved += Math.abs(dx) + Math.abs(dy);
        if (scene.getState() === "system") scene.orbit(dx, dy);
        else if (scene.getState() === "detail") scene.inspect(dx, dy);
        lastX = e.clientX;
        lastY = e.clientY;
      }

      if (scene.getState() === "system") {
        const p = local(e);
        const inside =
          p.x >= 0 && p.y >= 0 && p.x <= canvas.clientWidth && p.y <= canvas.clientHeight;
        const i = inside ? scene.pick(p.x, p.y) : -1;
        if (scene.setHover(i)) canvas.style.cursor = i >= 0 ? "pointer" : "default";
      }
    };

    /* One reading of "is a project open", whether or not there is a scene, so
       the scroll rule and the keys behave identically in the fallback. */
    const inDetail = () =>
      scene ? scene.getState() === "detail" : stateRef.current === "detail";
    const doNav = (d) => {
      if (scene) scene.navTo(d);
      else setView((v) => navFallback(v, d));
    };
    const doClose = () => {
      if (scene) scene.deselect();
      else setView(closeFallback);
    };

    /* ---- wheel — see THE SCROLL RULE above ------------------------------- */
    const onWheel = (e) => {
      if (!inDetail()) return; // hands off the page

      e.preventDefault();

      const el = panelRef.current;
      if (el) {
        const canScroll = el.scrollHeight > el.clientHeight + 4;
        if (canScroll) {
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
          const atTop = el.scrollTop <= 2;
          if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
            el.scrollTop += e.deltaY;
            return;
          }
        }
      }

      if (wheelLock) return;
      wheelLock = window.setTimeout(() => {
        wheelLock = null;
      }, 750);
      doNav(e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e) => {
      if (!inDetail()) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        doNav(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        doNav(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        doClose();
      }
    };

    /* Opening pulls the page to the LANDED position first — the end of the
       runway, where the section is still pinned and the system is fully
       home. Once a project is open the wheel belongs to this section, so a
       half-scrolled section would be a half-visible case study with no way
       to fix it, and a half-arrived one would open over planets still on
       their way in. */
    function openAt(i) {
      if (!scene) return;
      const base = runway || section;
      const top =
        base.getBoundingClientRect().top +
        window.scrollY +
        (runway ? Math.max(0, runway.offsetHeight - section.offsetHeight) : 0);
      if (Math.abs(window.scrollY - top) > 8) {
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      }
      scene.select(i);
    }

    const onResize = () => scene && scene.resize();
    const onVisibility = () => (document.hidden ? stop() : start());

    (async () => {
      try {
        const { createScene } = await import("./planetScene.js");
        if (!alive) return;
        scene = await createScene(canvas, PLANETS, {
          reduce,
          emit,
          flash: flashRef.current,
        });
        if (!alive) {
          scene.dispose();
          scene = null;
          return;
        }
        scene.setLabels(labelRefs.current);
        scene.resize();
        api.current = { ...scene, openAt };
        setReady(true);
        start();
        // The page may already be anywhere in the runway when this import lands.
        applyArrival();
      } catch (err) {
        // No WebGL, or the chunk failed. The section still lists every
        // project as text — see the labels in SelectedWork.jsx.
        console.warn("planet system unavailable:", err);
        if (alive) setFailed(true);
      }
    })();

    /* Run gate: the render loop runs only while any part of the section can
       be seen. The arrival used to be gated here too, on a visibility ratio
       and a timer; it is read off the scroll now (applyArrival) and needs no
       gate — off screen, the scrub still places the planets, and the first
       frame on screen draws them where they are. */
    const vis = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 }
    );
    vis.observe(section);
    applyArrival();

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("pointermove", onMove);
    // passive:false — in detail this handler calls preventDefault.
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    if ("onscrollend" in window) window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      stop();
      vis.disconnect();
      if (wheelLock) window.clearTimeout(wheelLock);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      if (carryTimer) window.clearTimeout(carryTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      api.current = null;
      if (scene) scene.dispose();
    };
  }, [canvasRef, sectionRef, flashRef, panelRef, labelRefs]);

  /* With a scene these drive it and the state comes back through emit(). With
     no scene — no WebGL, a failed chunk — they move the same state directly,
     so every case study still opens, still steps Prev/Next, and still closes.
     The planets are the part that needs a GPU; the work does not. */
  const open = useCallback((i) => {
    if (api.current) api.current.openAt(i);
    else setView((v) => openFallback(v, i));
  }, []);

  const navTo = useCallback((d) => {
    if (api.current) api.current.navTo(d);
    else setView((v) => navFallback(v, d));
  }, []);

  const close = useCallback(() => {
    if (api.current) api.current.deselect();
    else setView(closeFallback);
  }, []);

  return { ready, failed, view, reduced, open, navTo, close };
}
