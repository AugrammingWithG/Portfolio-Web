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

/* How much of the section has to be on screen before the arrival is worth
   playing. At 0 it fired the moment one pixel crossed the viewport edge, so
   it ran while the section was still a sliver at the bottom of the screen. */
const ARRIVE_AT = 0.4;

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
    // Whether the section has ever been on screen enough to earn the arrival.
    let seen = false;
    let wheelLock = null;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let moved = 0;

    const emit = (patch) => {
      if (alive) setView((v) => ({ ...v, ...patch }));
    };

    /* The arrival needs the scene built AND the section actually looked at,
       and those finish in either order — the scene arrives by dynamic import,
       the section by scrolling. Both sides call this; scene.arrive() only
       ever runs once, so whichever is second is the one that starts it. */
    const tryArrive = () => {
      if (scene && seen) scene.arrive();
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

    /* Opening pulls the section to the top of the viewport first. Once a
       project is open the wheel belongs to this section, so a half-scrolled
       section would be a half-visible case study with no way to fix it. */
    function openAt(i) {
      if (!scene) return;
      const top = section.getBoundingClientRect().top + window.scrollY;
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
        // The section may already have been in view before this import landed.
        tryArrive();
      } catch (err) {
        // No WebGL, or the chunk failed. The section still lists every
        // project as text — see the labels in SelectedWork.jsx.
        console.warn("planet system unavailable:", err);
        if (alive) setFailed(true);
      }
    })();

    /* Load-and-run gate. The scene is only built once the section is close,
       and only runs while it is on screen. */
    /* Two thresholds, two jobs. 0 starts and stops the render loop, which
       wants to be running the moment any part of the section can be seen.
       ARRIVE_AT gates the arrival, which wants to be watched.

       The old code did the second job at the first threshold and skipped it
       whenever the scene had not finished importing yet — nothing came back
       to run it once the import landed, so the arrival could be missed
       entirely or played off the bottom of the screen. */
    const vis = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) {
          start();
          if (entry.intersectionRatio >= ARRIVE_AT) {
            seen = true;
            tryArrive();
          }
        } else stop();
      },
      { threshold: [0, ARRIVE_AT] }
    );
    vis.observe(section);

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    // passive:false — in detail this handler calls preventDefault.
    window.addEventListener("wheel", onWheel, { passive: false });
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", onWheel);
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
