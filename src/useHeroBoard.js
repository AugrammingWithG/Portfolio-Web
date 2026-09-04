import { useEffect, useState } from "react";

/* ==========================================================================
   The hero's keyboard. Same geometry module as the teardown section, built in
   its assembled state and posed by a slow idle drift plus a lean toward the
   pointer.

   Three.js arrives through the same dynamic import the teardown uses, so the
   two share one chunk — the hero pays nothing extra for it beyond what the
   page was already going to fetch.

   Pauses off-screen and on a hidden tab, and disposes on unmount so the WebGL
   context is released rather than leaked past a StrictMode double-mount.
   ========================================================================== */
export default function useHeroBoard(canvasRef, sectionRef) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene = null;
    let raf = null;
    let alive = true;
    let onScreen = true;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;

    function loop(t) {
      if (!alive || !scene) return;
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      scene.idle(reduce ? 0 : t, mx, my);
      scene.render();
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

    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => scene && scene.resize();
    const onVisibility = () => (document.hidden ? stop() : start());

    (async () => {
      try {
        const { createScene } = await import("./teardownScene.js");
        if (!alive) return;
        scene = await createScene(canvas, { explode: false });
        if (!alive) {
          scene.dispose();
          scene = null;
          return;
        }
        scene.idle(0, 0, 0);
        scene.render();
        setReady(true);
        start();
      } catch (err) {
        // No WebGL: the label and the rest of the hero still stand on their own.
        console.warn("hero board unavailable:", err);
      }
    })();

    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(section);

    if (!reduce) window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      stop();
      io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (scene) scene.dispose();
    };
  }, [canvasRef, sectionRef]);

  return ready;
}
