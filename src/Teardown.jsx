import React, { useEffect, useRef, useState } from "react";

/* ==========================================================================
   The teardown section. A tall block of scroll with a sticky stage inside it,
   so the board stays put while the page moves — the scroll *is* the timeline.

   The section is 4 viewports tall: the first is the runway in, the middle two
   carry the disassembly, the last releases into Skills.
   ========================================================================== */

const STAGES = [
  { at: 0.06, label: "Whole", text: "Every project starts as one solid thing." },
  { at: 0.3, label: "Plate", text: "I take it apart to see what it is actually made of." },
  { at: 0.56, label: "Switches", text: "Each piece gets built and tested on its own." },
  { at: 0.82, label: "Caps", text: "Then it goes back together as something you can use." },
];

export default function Teardown() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const [p, setP] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let scene = null;
    let raf = null;
    let onScreen = false;
    let alive = true;
    let target = 0;
    let current = 0;

    const progress = () => {
      const r = section.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return 0;
      return Math.min(1, Math.max(0, -r.top / span));
    };

    function loop() {
      if (!alive || !scene) return;
      // Chase the scroll rather than snapping to it: the wheel arrives in
      // jumps, and a raw binding makes the board stutter between them.
      current += (target - current) * (reduce ? 1 : 0.12);
      scene.update(current);
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

    const onScroll = () => {
      target = progress();
      setP(target);
    };

    // three.js is a big download — only fetch it once the section is close.
    const near = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting || scene) return;
        near.disconnect();
        try {
          const { createScene } = await import("./teardownScene.js");
          if (!alive) return;
          scene = await createScene(canvas);
          if (!alive) {
            scene.dispose();
            scene = null;
            return;
          }
          target = progress();
          current = target;
          scene.update(current);
          scene.render();
          setReady(true);
          if (typeof window !== "undefined") window.__td = scene;
          start();
        } catch (err) {
          // WebGL unavailable or the chunk failed: the section still reads as
          // text, it just does not animate.
          console.warn("teardown scene unavailable:", err);
        }
      },
      { rootMargin: "60% 0px" }
    );
    near.observe(section);

    const vis = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 }
    );
    vis.observe(section);

    const onResize = () => scene && scene.resize();
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();

    return () => {
      alive = false;
      stop();
      near.disconnect();
      vis.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (scene) scene.dispose();
    };
  }, []);

  const active = STAGES.reduce((acc, s, i) => (p >= s.at ? i : acc), 0);

  return (
    <section className="td" ref={sectionRef} id="teardown" aria-labelledby="td-title">
      <div className="td-stage">
        <div className="sector-scrim" aria-hidden="true" />

        <header className="sector-hud">
          <h2 className="sector-hud-label" id="td-title">
            Teardown
          </h2>
          <p className="sector-hud-meta">
            <b>{STAGES[active].label}</b>
            <span className="sector-sep">·</span>
            {String(active + 1).padStart(2, "0")} / {String(STAGES.length).padStart(2, "0")}
          </p>
        </header>

        <canvas
          className={`td-canvas ${ready ? "is-ready" : ""}`}
          ref={canvasRef}
          aria-hidden="true"
        />

        {/* The captions are the accessible version of the animation: all four
            are in the DOM and readable in order, the visual just highlights
            whichever one the scroll is on. */}
        <ol className="td-captions">
          {STAGES.map((s, i) => (
            <li key={s.label} className={i === active ? "is-active" : ""}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="t">{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="td-rail" aria-hidden="true">
          <i style={{ transform: `scaleX(${p})` }} />
        </div>
      </div>
    </section>
  );
}
