import { useCallback, useEffect, useRef, useState } from "react";
import { PLANETS } from "./planets.js";
import { CAPTIONS_END } from "./process.js";
import { readProgress, readArrival, landedTop, quantisedWriter } from "./scrollTimeline.js";

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

/* THE ARRIVAL, as a scroll position. The section sits sticky inside a taller
   runway (.sw-runway), the same shape as the hero: it reaches the top of the
   viewport and then holds there while the rest of the runway scrolls under
   it. That held stretch is the arrival — 0 the moment the section pins, 1
   at #work-landed. It is read by readArrival() in scrollTimeline.js, the
   same file the satellite's flight reads its own progress from, so the two
   meet by construction: its 1 is this 0. */

export default function usePlanetSystem(refs) {
  const { canvasRef, sectionRef, flashRef, panelRef, labelRefs } = refs;

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
  /* Which project is open, readable from the callbacks below. They are made
     once and cannot close over `view`. */
  const contentRef = useRef(-1);
  contentRef.current = view.contentIndex;

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

    /* The scrub. Every scroll event while the section is on screen reads
       where it is in its runway and hands it to the scene, which places the
       six planets accordingly; the same number goes on the section as --sw-in
       so the HUD, the corner frame and the hint fade in with the system
       instead of riding the section's edge up the screen while it is still
       empty. */
    const writeIn = quantisedWriter(section, "--sw-in");
    const applyArrival = () => {
      const a = readArrival();
      if (scene) scene.setArrival(a);
      writeIn(a);
    };

    /* THE CARRY-IN. Once the satellite has dissolved the reader is looking
       at dark space with the planets still out in it, and a scroll that stops
       there should not leave them to push the last stretch by hand: the page
       eases to the landed position itself. The arrival is scrubbed by scroll
       and a smooth scroll is scroll, so the carry IS the arrival playing.

       Guards, all of them load-bearing:
         * downward only — a reader backing up out of the system is leaving,
           not arriving, and must not be turned around
         * only once the captions are done (CAPTIONS_END, from process.js —
           move a caption window and this moves with it). Everything after
           that point is the dissolve, the jump and the arrival, none of
           which needs the reader's hand on it
         * only in the system view: while a case study is open the wheel is
           the panel's and the page does not scroll at all
         * never under reduced motion, and never once already there

       scrollend where the browser has it — by definition nothing is in flight
       when it fires, so every scrollend is a fresh decision, and a carry the
       reader interrupted with a second wheel tick simply gets decided again
       at their next stop. Where there is no scrollend, a short debounce on
       scroll stands in; a carry's own scroll events keep pushing it back, and
       once it lands the "already there" guard is what stops it re-issuing.
       The page's CSS proximity snap (see html in styles.css) aims at the same
       point, so the two never disagree about where to settle.               */
    let lastScrollY = window.scrollY || 0;
    let goingDown = true;
    const hasScrollEnd = "onscrollend" in window;
    let carryTimer = null;

    /* HOW LONG THE CARRY TAKES, and why it is not the browser's business.
       This used to be scrollTo({ behavior: "smooth" }), and the whole stretch
       it covers — the satellite dissolving, the jump coming up, the rings
       streaking in — went past in whatever the browser felt like, which is
       roughly half a second whether the distance is 300px or 1600px. The
       longest-worked part of the page was the part nobody could see.

       So it is scrubbed here, on a clock we set. Everything downstream is
       unchanged: this writes window.scrollY, the scroll handler reads it, and
       the flight and the arrival are still pure functions of the scroll
       position. Nothing animates that was not already animating — the reader
       is simply moved down the runway at a readable pace.

       The reader wins every argument. Any wheel, touch or key cancels the
       carry on the spot (onCarryInterrupt), so it can never feel like the
       page has taken the scroll away. */
    const CARRY_MIN = 900;
    const CARRY_PER_PX = 1.6;
    const CARRY_MAX = 3600;
    let carryRaf = null;
    let carryFrom = 0;
    let carryTo = 0;
    let carryT0 = 0;
    let carryDur = 0;
    /* The carry's own scroll events must not look like the reader's, or the
       debounce below would keep pushing the next decision back and the guards
       in carryIn() would be re-evaluated mid-flight. */
    let carrying = false;

    /* html carries scroll-behavior: smooth (styles.css), and a two-argument
       scrollTo inherits it — so every frame of the tween below was being
       smoothed a second time by the browser and the pacing was not ours at
       all. The root's scroll-behavior is turned off for the length of the
       carry and put back afterwards, rather than passing behavior: "instant",
       which throws outright where it is not recognised. */
    const scrollRoot = document.documentElement;
    const stopCarry = () => {
      if (carryRaf) cancelAnimationFrame(carryRaf);
      carryRaf = null;
      if (carrying) scrollRoot.style.scrollBehavior = "";
      carrying = false;
    };

    const carryStep = () => {
      const p = Math.min(1, (performance.now() - carryT0) / carryDur);
      /* easeInOutCubic: leaves and arrives at rest, so it reads as the page
         settling rather than as a jump that was interrupted. */
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, Math.round(carryFrom + (carryTo - carryFrom) * e));
      if (p >= 1) {
        stopCarry();
        return;
      }
      carryRaf = requestAnimationFrame(carryStep);
    };

    const carryIn = () => {
      if (reduce || !goingDown || carrying) return;
      if (stateRef.current !== "system") return;
      if (readProgress() < CAPTIONS_END) return;
      const landed = landedTop();
      const from = window.scrollY || 0;
      if (from >= landed - 2) return;
      carryFrom = from;
      carryTo = landed;
      carryDur = Math.min(CARRY_MAX, Math.max(CARRY_MIN, (landed - from) * CARRY_PER_PX));
      carryT0 = performance.now();
      carrying = true;
      scrollRoot.style.scrollBehavior = "auto";
      carryRaf = requestAnimationFrame(carryStep);
    };

    /* Anything the reader does with the scroll hands it straight back. */
    const onCarryInterrupt = () => {
      if (carrying) stopCarry();
    };

    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y !== lastScrollY) goingDown = y > lastScrollY;
      lastScrollY = y;
      /* Off screen the value is pinned at 0 or 1 and the observer below
         applies it on entry; on screen it is live. */
      if (onScreen) applyArrival();
      if (!hasScrollEnd && !carrying) {
        if (carryTimer) window.clearTimeout(carryTimer);
        carryTimer = window.setTimeout(carryIn, 160);
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

    const release = () => {
      dragging = false;
      if (scene && scene.getState() === "detail") canvas.style.cursor = "grab";
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
      release();
    };

    /* A touch the browser takes for scrolling (touch-action: pan-y on the
       canvas) ends in pointercancel, not pointerup. Without this the drag
       stays armed and the next stray move spins the system. */
    const onCancel = () => release();

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

      /* Over the strip the tile owns the hover (SelectedWork.jsx calls
         hover() from its pointer events); the canvas must not keep clearing
         it from underneath. */
      if (scene.getState() === "system" && !(e.target && e.target.closest && e.target.closest(".pw-strip"))) {
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
      const top = landedTop();
      if (Math.abs((window.scrollY || 0) - top) > 8) {
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

    /* Run gate: the render loop, and the scrub with it, run only while any
       part of the section can be seen. On entry the scrub is applied once
       before the first frame, so the planets are drawn where the scroll has
       already put them. */
    const vis = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) {
          applyArrival();
          start();
        } else stop();
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
    if (hasScrollEnd) window.addEventListener("scrollend", carryIn);
    /* Capture, so a wheel the section itself swallows in detail view still
       cancels a carry that is somehow in flight. */
    window.addEventListener("wheel", onCarryInterrupt, { passive: true, capture: true });
    window.addEventListener("touchstart", onCarryInterrupt, { passive: true });
    window.addEventListener("keydown", onCarryInterrupt, { capture: true });
    /* A tap or click ends it too — a nav link followed mid-carry would
       otherwise be jumped to instantly, because the carry has the root's
       scroll-behavior turned off while it runs. */
    window.addEventListener("pointerdown", onCarryInterrupt, { passive: true, capture: true });
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
      window.removeEventListener("scrollend", carryIn);
      window.removeEventListener("wheel", onCarryInterrupt, { capture: true });
      window.removeEventListener("touchstart", onCarryInterrupt);
      window.removeEventListener("keydown", onCarryInterrupt, { capture: true });
      window.removeEventListener("pointerdown", onCarryInterrupt, { capture: true });
      stopCarry();
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
  /* Open project i — from a tile, or from the name bar at the top of the
     section.

     WITH A CASE STUDY ALREADY OPEN this has to STEP rather than open: the
     scene's select() only runs from the system view, so pressing a second
     name did nothing at all and the bar looked broken. navTo takes a number
     of places to move, so the jump is simply the distance between the two —
     and it is the same move the panel's Prev/Next makes, which is why the
     swap animation and the copy swap come out identical either way. */
  const open = useCallback((i) => {
    if (!api.current) {
      setView((v) => openFallback(v, i));
      return;
    }
    if (stateRef.current === "detail") {
      const from = contentRef.current;
      if (from === i) return; // already the open one
      api.current.navTo(i - from);
      return;
    }
    api.current.openAt(i);
  }, []);

  const navTo = useCallback((d) => {
    if (api.current) api.current.navTo(d);
    else setView((v) => navFallback(v, d));
  }, []);

  const close = useCallback(() => {
    if (api.current) api.current.deselect();
    else setView(closeFallback);
  }, []);

  /* A tile in the strip lighting its planet. Nothing to do without a scene. */
  const hover = useCallback((i) => {
    if (api.current) api.current.setHover(i);
  }, []);

  return { ready, failed, view, reduced, open, navTo, close, hover };
}
