import { useEffect } from "react";

/* ==========================================================================
   The hero canvas — three layers, painted back to front.

     1. STAR SHEET   a Milky Way: thousands of stars, dense along a tilted
                     galactic band, thinned again by the dust lane running
                     through its middle. Drawn once to an offscreen canvas and
                     blitted, so its cost per frame is a single drawImage no
                     matter how many stars are in it.
     2. TWINKLE      a small subset that breathes, drawn live. Real stars do
                     not move on a human timescale, so nothing here drifts —
                     the aurora and the current supply the motion.
     3. GOLD CURRENT hero.html's flow field, maths untouched: same field
                     function, constants, cursor push radius, colour, alpha.

   Everything is additive (`lighter`), which is what lets the band read as
   luminance building up rather than as scattered dots.

   Three things differ from hero.html, none of them visible: it measures its
   own box rather than the window, it stops when the hero is off-screen or the
   tab is hidden, and it tears down on unmount — the app runs in StrictMode,
   which mounts effects twice in development.

   Reduced motion actually stops everything here: the field clock, the twinkle
   and the particle positions. hero.html froze only the clock, which left the
   current flowing — see the note at the integration step.
   ========================================================================== */

/* Density of the galactic band at a point, 0..1.

   `glow` is a gaussian falling off either side of the band's centre line;
   `dust` is a narrower gaussian subtracted just off-centre, which is the dark
   lane you see splitting the real Milky Way. Doing the lane here rather than
   as a dark overlay means the stars genuinely thin out inside it, instead of
   being painted over. */
function bandWeight(x, y, w, h) {
  const TILT = -0.42; // radians the band runs at
  const nx = Math.sin(TILT);
  const ny = -Math.cos(TILT);
  const d = ((x - w * 0.5) * nx + (y - h * 0.52) * ny) / (h * 0.5);
  const glow = Math.exp(-(d * d) / 0.24);
  const dust = Math.exp(-((d - 0.06) * (d - 0.06)) / 0.016) * 0.74;
  return Math.max(0, glow - dust);
}

/* Mostly white, a few hot blue, a few cool amber — roughly how a naked-eye
   star field actually distributes. */
function starColour(r) {
  if (r < 0.62) return [255, 250, 242];
  if (r < 0.84) return [196, 216, 255];
  return [255, 214, 168];
}

export default function useFlowField(canvasRef, sectionRef) {
  useEffect(() => {
    const cv = canvasRef.current;
    const section = sectionRef.current;
    if (!cv || !section) return undefined;

    const g = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let ps = [];
    let twinkle = [];
    let sheet = null;
    let t = 0;
    let tw = 0;
    let mx = -9999;
    let my = -9999;
    let raf = null;
    let onScreen = true;

    // CSS stretches this canvas with inset:0 plus an explicit 100%/100%, so
    // only the backing store is set here. Writing style.width/height too would
    // over-constrain the box and pin it at the canvas default of 300x150.
    function size() {
      const cssW = Math.max(1, cv.clientWidth);
      const cssH = Math.max(1, cv.clientHeight);
      const nw = Math.round(cssW * dpr);
      const nh = Math.round(cssH * dpr);
      if (nw === w && nh === h) return false;
      w = cv.width = nw;
      h = cv.height = nh;
      return true;
    }

    /* ---- layer 1: the Milky Way, baked once ---- */
    function buildSheet() {
      // Scales with area so a wide monitor does not look emptier than a phone.
      const N = Math.round(Math.min(1700, Math.max(520, (w * h) / (1700 * dpr))));
      sheet = document.createElement("canvas");
      sheet.width = w;
      sheet.height = h;
      const s = sheet.getContext("2d");
      s.globalCompositeOperation = "lighter";

      let placed = 0;
      let guard = 0;
      while (placed < N && guard < N * 40) {
        guard += 1;
        const x = Math.random() * w;
        const y = Math.random() * h;
        // Rejection sampling: a sparse field everywhere, piling up in the band.
        const p = 0.07 + 0.93 * bandWeight(x, y, w, h);
        if (Math.random() > p) continue;
        placed += 1;

        // Cubed uniform: overwhelmingly faint pinpricks, a handful of bright.
        const mag = Math.random() ** 3;
        const r = (0.26 + mag * 0.95) * dpr;
        const a = 0.12 + mag * 0.62;
        const [cr, cg, cb] = starColour(Math.random());

        s.beginPath();
        s.arc(x, y, r, 0, 6.28);
        s.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
        s.fill();

        // Bloom is rare on purpose. At 10% of stars with a 7x radius it read
        // as bokeh rather than sky — this is ~2%, tight, and barely there.
        if (mag > 0.94) {
          const grd = s.createRadialGradient(x, y, 0, x, y, r * 4);
          grd.addColorStop(0, `rgba(${cr},${cg},${cb},${a * 0.3})`);
          grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
          s.beginPath();
          s.arc(x, y, r * 4, 0, 6.28);
          s.fillStyle = grd;
          s.fill();
        }
      }

      /* ---- layer 2: the subset that breathes ---- */
      twinkle = [];
      const M = Math.round(Math.min(110, N * 0.05));
      for (let i = 0; i < M; i += 1) {
        let x = Math.random() * w;
        let y = Math.random() * h;
        for (let k = 0; k < 12; k += 1) {
          if (Math.random() < 0.2 + 0.8 * bandWeight(x, y, w, h)) break;
          x = Math.random() * w;
          y = Math.random() * h;
        }
        const [cr, cg, cb] = starColour(Math.random());
        twinkle.push({
          x,
          y,
          r: (0.35 + Math.random() * 0.8) * dpr,
          a: 0.18 + Math.random() * 0.34,
          ph: Math.random() * Math.PI * 2,
          sp: 0.008 + Math.random() * 0.022,
          c: `${cr},${cg},${cb}`,
        });
      }
    }

    /* ---- layer 3: hero.html's gold current, unchanged ---- */
    function seed() {
      const N = window.innerWidth < 760 ? 150 : 340;
      ps = [];
      for (let i = 0; i < N; i += 1) {
        const z = Math.random() * 0.7 + 0.3;
        ps.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          sz: z * 1.9 * dpr,
          a: 0.12 + z * 0.5,
        });
      }
    }

    // Pointer arrives in viewport space; the canvas is no longer fixed to it.
    function onMove(e) {
      const rect = cv.getBoundingClientRect();
      mx = (e.clientX - rect.left) * dpr;
      my = (e.clientY - rect.top) * dpr;
    }
    function onLeave() {
      mx = -9999;
      my = -9999;
    }

    // smooth flowing angle
    function field(x, y) {
      return (
        Math.sin(x * 0.0016 + t) * 1.3 +
        Math.cos(y * 0.0016 - t * 0.8) * 1.3 +
        Math.sin((x + y) * 0.0011 + t * 0.5) * 1.4
      );
    }

    function frame() {
      t += reduce ? 0 : 0.0016;
      tw += reduce ? 0 : 1;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";

      if (sheet) g.drawImage(sheet, 0, 0);

      for (const s of twinkle) {
        const k = reduce ? 1 : 0.55 + 0.45 * Math.sin(s.ph + tw * s.sp);
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, 6.28);
        g.fillStyle = `rgba(${s.c},${s.a * k})`;
        g.fill();
      }

      const R = 180 * dpr;
      for (const p of ps) {
        // hero.html froze the field clock under reduced motion but still
        // integrated positions every frame, so the current kept flowing and the
        // preference did nothing. Skipping the integration is what it was
        // reaching for; the particles now sit still and only the draw runs.
        if (!reduce) {
          const a = field(p.x, p.y);
          let vx = Math.cos(a) * (0.6 + p.z) * dpr;
          let vy = Math.sin(a) * (0.6 + p.z) * dpr;
          // cursor pushes the current aside
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const f = (1 - d / R) * 3.2;
            vx += (dx / (d + 1)) * f * dpr;
            vy += (dy / (d + 1)) * f * dpr;
          }
          p.x += vx;
          p.y += vy;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
        }
        g.beginPath();
        g.arc(p.x, p.y, p.sz, 0, 6.28);
        g.fillStyle = `rgba(216,180,92,${p.a})`;
        g.fill();
      }

      g.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    size();
    buildSheet();
    seed();
    start();

    const onVisibility = () => (document.hidden ? stop() : start());

    // Watches the element, not the window: the canvas is sized by layout now,
    // and this also catches the first frame where the box is still collapsed.
    const ro = new ResizeObserver(() => {
      if (size()) {
        buildSheet();
        seed();
      }
    });
    ro.observe(cv);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(section);

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      sheet = null;
    };
  }, [canvasRef, sectionRef]);
}
