/* NOT WIRED IN. Selected Work is the planet system now — see SelectedWork.jsx,
   usePlanetSystem.js and planetScene.js. This is the previous version of the
   section: CSS planets, the astronaut and its flight path, with its styles in
   selected-work-orbit.css. Kept the way Projects.jsx is kept — import it from
   App.jsx (and its stylesheet from main.jsx) to put it back. It reads work.js,
   which nothing else uses any more. */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { WORK } from "./work.js";

/* A field left as "TODO" renders dimmed rather than silently blank. */
function Field({ value }) {
  if (!value || value === "TODO") return <span className="todo">// TODO</span>;
  return <>{value}</>;
}

function Flag() {
  return (
    <span className="sw-flag">
      <svg viewBox="0 0 40 46" aria-hidden="true">
        <line className="pole" x1="8" y1="46" x2="8" y2="2" />
        <path className="cloth" d="M8 4 L34 11 L8 20 Z" />
      </svg>
    </span>
  );
}

/* Positioned by the route hook: --ax/--ay are pixel coordinates inside
   .sw-space, --arot is the lean into the direction of travel. Three nested
   elements so the three motions never fight for the transform property:
   outer = travel, .sw-astro-lean = heading, .sw-astro-bob = idle float. */
function Astronaut({ route }) {
  return (
    <div
      className="sw-astro"
      aria-hidden="true"
      style={{ "--ax": `${route.x}px`, "--ay": `${route.y}px`, "--arot": `${route.rot}deg` }}
    >
      <div className="sw-astro-lean">
        <div className="sw-astro-bob">
          <svg viewBox="0 0 130 170" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* tether drifting off toward the lower left */}
            <path d="M40 128 C22 140 12 152 2 168" stroke="#4a4a4a" strokeWidth="1" strokeDasharray="3 4" />
            {/* backpack */}
            <rect x="40" y="60" width="50" height="46" rx="10" fill="#171717" stroke="#5e5e5e" strokeWidth="1.1" />
            {/* arms */}
            <rect x="14" y="70" width="30" height="15" rx="7.5" fill="#1c1c1c" stroke="#6a6a6a" strokeWidth="1.1" transform="rotate(-24 29 77)" />
            <rect x="86" y="70" width="30" height="15" rx="7.5" fill="#1c1c1c" stroke="#6a6a6a" strokeWidth="1.1" transform="rotate(22 101 77)" />
            {/* torso */}
            <rect x="42" y="58" width="46" height="52" rx="16" fill="#242424" stroke="#7a7a7a" strokeWidth="1.2" />
            {/* chest panel */}
            <rect x="55" y="74" width="20" height="13" rx="2" fill="#0d0d0d" stroke="#5e5e5e" strokeWidth="1" />
            <circle cx="60" cy="80.5" r="1.5" fill="#6a6a6a" />
            <circle cx="66" cy="80.5" r="1.5" fill="#4a4a4a" />
            {/* legs */}
            <rect x="46" y="106" width="17" height="40" rx="8.5" fill="#1f1f1f" stroke="#6a6a6a" strokeWidth="1.1" transform="rotate(9 54 126)" />
            <rect x="67" y="106" width="17" height="40" rx="8.5" fill="#1f1f1f" stroke="#6a6a6a" strokeWidth="1.1" transform="rotate(-13 75 126)" />
            {/* helmet */}
            <circle cx="65" cy="38" r="25" fill="#1a1a1a" stroke="#8a8a8a" strokeWidth="1.3" />
            <path d="M48 34 a17 15 0 0 1 34 0 a17 19 0 0 1 -34 0 z" fill="#050505" stroke="#6a6a6a" strokeWidth="1" />
            <path d="M55 28 a9 8 0 0 1 12 -2" stroke="#4f4f4f" strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Flight path — where the astronaut stands, and the line it took to get there.

   Coordinates are plain pixels inside .sw-space, so the curve and the figure
   can never drift apart. The section's compress transform scales both of them
   together, which is why nothing here has to know the panel is open.
   ========================================================================== */

/* Home base, as a fraction of the scene. Narrow screens park it lower-left,
   where the shrunken planets have already moved out of the way. */
const HOME = { x: 0.08, y: 0.81 };
const HOME_NARROW = { x: 0.14, y: 0.86 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Stand beside the planet, never on it: clear of the radius, a little below
   the equator, on whichever side keeps the astronaut inside the scene.
   `face` is the lean that turns the astronaut toward whatever it is next to. */
function dockPoint(id, box) {
  const { w, h, pscale } = box;
  const home = w < 620 ? HOME_NARROW : HOME;
  const p = id ? WORK.find((q) => q.id === id) : null;
  if (!p) return { x: home.x * w, y: home.y * h, face: 0 };

  const cx = (parseFloat(p.x) / 100) * w;
  const cy = (parseFloat(p.y) / 100) * h;
  const r = (p.size * pscale) / 2;
  const side = cx > w * 0.55 ? -1 : 1;

  return {
    x: clamp(cx + side * (r + 64 * pscale), w * 0.07, w * 0.93),
    y: clamp(cy + r * 0.45 + 14 * pscale, h * 0.1, h * 0.9),
    face: -side * 14, // docked left of the planet means turning right to see it
  };
}

/* A quadratic arc bowed off the straight line, so the route reads as a
   trajectory rather than a ruler mark. */
function arc(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const bow = Math.min(d * 0.2, 86);
  const mx = (a.x + b.x) / 2 + (-dy / d) * bow;
  const my = (a.y + b.y) / 2 + (dx / d) * bow;
  const n = (v) => Math.round(v * 10) / 10;
  return `M ${n(a.x)} ${n(a.y)} Q ${n(mx)} ${n(my)} ${n(b.x)} ${n(b.y)}`;
}

function useRoute(spaceRef, sectionRef, openId) {
  const [box, setBox] = useState(null);
  const [route, setRoute] = useState(null);
  const at = useRef(null); // where the astronaut currently stands
  const trip = useRef(0); // bumping this restarts the draw-in animation
  const lastId = useRef(null);

  // Layout size, not rendered size — offsetWidth ignores the compress
  // transform, and --pscale comes straight from the media queries.
  useLayoutEffect(() => {
    const el = spaceRef.current;
    const section = sectionRef.current;
    if (!el || !section) return undefined;

    const read = () => {
      const pscale =
        parseFloat(getComputedStyle(section).getPropertyValue("--pscale")) || 1;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setBox((b) => (b && b.w === w && b.h === h && b.pscale === pscale ? b : { w, h, pscale }));
    };

    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spaceRef, sectionRef]);

  useLayoutEffect(() => {
    if (!box || !box.w || !box.h) return;

    const to = dockPoint(openId, box);
    const from = at.current || to;
    const idChanged = lastId.current !== openId;
    lastId.current = openId;

    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    // A resize repositions without counting as a journey.
    const travelling = idChanged && dist > 4;
    if (travelling) trip.current += 1;
    at.current = to;

    setRoute((prev) => ({
      x: to.x,
      y: to.y,
      // Turns over the course of the trip, so it arrives already facing the
      // planet it flew to.
      rot: to.face,
      dur: clamp(0.62 + dist / 950, 0.7, 1.7),
      path: travelling ? arc(from, to) : prev ? prev.path : null,
      from: travelling ? from : prev ? prev.from : to,
      trip: trip.current,
    }));
  }, [openId, box]);

  return { box, route };
}

/* ==========================================================================
   Starfield — slow drift, faint twinkle.
   Pauses off-screen and on a hidden tab; draws one static frame when
   reduced motion is requested. It sits above the site's ambient light, so
   the gold/blue/teal glow still reads through the stars.
   ========================================================================== */
function useStarfield(canvasRef, sectionRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;

    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars = [];
    let raf = null;
    let visible = true;
    let w = 0;
    let h = 0;

    function seed() {
      // Density scales with area so big screens don't look empty.
      const count = Math.max(70, Math.min(260, Math.round((w * h) / 7000)));
      stars = [];
      for (let i = 0; i < count; i += 1) {
        const depth = Math.random(); // 0 = far, 1 = near
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.35 + depth * 1.15,
          a: 0.12 + depth * 0.62,
          // Nearer stars drift faster. Everything is slow.
          vx: (0.02 + depth * 0.05) * (Math.random() < 0.5 ? -1 : 1),
          vy: (0.01 + depth * 0.03) * (Math.random() < 0.5 ? -1 : 1),
          tw: Math.random() * Math.PI * 2,
          ts: 0.0006 + Math.random() * 0.0014,
        });
      }
    }

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const alpha = s.a * (0.75 + 0.25 * Math.sin(s.tw + t * s.ts));
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function step(t) {
      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -2) s.x = w + 2;
        else if (s.x > w + 2) s.x = -2;
        if (s.y < -2) s.y = h + 2;
        else if (s.y > h + 2) s.y = -2;
      }
      draw(t);
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (raf || reduce || !visible) return;
      raf = requestAnimationFrame(step);
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    sizeCanvas();
    if (reduce) draw(0);
    else start();

    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeCanvas();
        if (reduce) draw(0);
      }, 150);
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    // Don't burn frames while the section is scrolled out of view.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(section);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, [canvasRef, sectionRef]);
}

export default function SelectedWork() {
  const [openId, setOpenId] = useState(null);

  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const closeRef = useRef(null);
  const scrollRef = useRef(null);
  const planetRefs = useRef({});
  const lastFocused = useRef(null);
  const spaceRef = useRef(null);

  useStarfield(canvasRef, sectionRef);
  const { box, route } = useRoute(spaceRef, sectionRef, openId);

  const index = WORK.findIndex((p) => p.id === openId);
  const active = index === -1 ? null : WORK[index];

  const close = useCallback(() => {
    setOpenId(null);
    // Send focus back to the planet that opened the panel.
    if (lastFocused.current) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, []);

  const toggle = useCallback(
    (id) => {
      setOpenId((current) => {
        if (current === id) {
          if (lastFocused.current) lastFocused.current = null;
          return null;
        }
        lastFocused.current = planetRefs.current[id] || null;
        return id;
      });
    },
    []
  );

  // Esc closes, from anywhere.
  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId, close]);

  // Move focus into the panel so keyboard users land on the content.
  useEffect(() => {
    if (openId && closeRef.current) {
      closeRef.current.focus();
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [openId]);

  return (
    <section className={`sector sw ${openId ? "is-open" : ""}`} ref={sectionRef} id="work">
      <canvas className="sw-stars" ref={canvasRef} aria-hidden="true" />
      <div className="sector-scrim" aria-hidden="true" />
      <div className="sector-frame" aria-hidden="true">
        <i className="tl" />
        <i className="tr" />
        <i className="bl" />
        <i className="br" />
      </div>

      <header className="sector-hud">
        <h2 className="sector-hud-label">Selected work</h2>
        <p className="sector-hud-meta">
          <b>{String(WORK.length).padStart(2, "0")}</b> objects
          <span className="sector-sep">·</span> sector <span className="sw-sector">AK-01</span>
        </p>
      </header>

      {/* Everything inside .sw-space compresses when a project opens. */}
      <div
        className="sw-space"
        ref={spaceRef}
        style={route ? { "--tdur": `${route.dur}s` } : undefined}
      >
        <div className="sw-orbits" aria-hidden="true">
          <i className="o1" />
          <i className="o2" />
        </div>

        {/* The route just travelled. The dashes are painted through a mask
            that wipes along the same curve, so the line draws itself at
            exactly the pace the astronaut moves. */}
        {box && route && route.path && (
          <svg
            className="sw-trail"
            viewBox={`0 0 ${box.w} ${box.h}`}
            width={box.w}
            height={box.h}
            aria-hidden="true"
          >
            <defs>
              <mask
                id="sw-trail-wipe"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={box.w}
                height={box.h}
              >
                <path key={route.trip} className="sw-trail-mask" d={route.path} pathLength="1" />
              </mask>
            </defs>
            <g mask="url(#sw-trail-wipe)">
              <path className="sw-trail-line" d={route.path} />
              <circle className="sw-trail-origin" cx={route.from.x} cy={route.from.y} r="3" />
            </g>
          </svg>
        )}

        <ul className="sw-planets">
          {WORK.map((p) => (
            <li
              className="sw-wrap"
              key={p.id}
              style={{ "--x": p.x, "--y": p.y, "--size": `${p.size}px` }}
            >
              <button
                type="button"
                className="sw-planet"
                aria-pressed={openId === p.id}
                ref={(node) => {
                  planetRefs.current[p.id] = node;
                }}
                onClick={() => toggle(p.id)}
              >
                <span className="sw-body" style={{ "--lit": `${p.lit}%` }}>
                  {p.ring && <span className="sw-ring" />}
                  <span className="sw-logo">
                    {p.logo ? <img src={p.logo} alt="" /> : <span className="slot">LOGO</span>}
                  </span>
                </span>
                <Flag />
                <span className="sw-tag">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {route && <Astronaut route={route} />}
      </div>

      <aside
        className="sw-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="sw-panel-name"
        inert={openId ? undefined : ""}
      >
        <div className="sw-panel-head">
          <p className="sw-panel-idx">OBJ-{String(index + 1).padStart(2, "0")}</p>
          <button type="button" className="sw-panel-close" ref={closeRef} onClick={close}>
            Esc &nbsp;&#10005;
          </button>
        </div>

        <div className="sw-panel-scroll" ref={scrollRef}>
          <div className="sw-panel-logo">
            {active && active.logo ? (
              <img src={active.logo} alt={`${active.name} logo`} />
            ) : (
              <div className="slot-box slot-box--logo">Logo</div>
            )}
          </div>

          <h3 className="sw-panel-name" id="sw-panel-name">
            {active ? active.name : ""}
          </h3>
          <p className="sw-panel-summary">{active ? active.summary : ""}</p>

          <dl className="sw-panel-meta">
            <div>
              <dt>Role</dt>
              <dd>{active && <Field value={active.role} />}</dd>
            </div>
            <div>
              <dt>What I built</dt>
              <dd>{active && <Field value={active.built} />}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{active && <Field value={active.result} />}</dd>
            </div>
            <div>
              <dt>Stack</dt>
              <dd>
                <ul className="sw-panel-stack">
                  {active && active.stack.length ? (
                    active.stack.map((s) => <li key={s}>{s}</li>)
                  ) : (
                    <li className="todo">// TODO</li>
                  )}
                </ul>
              </dd>
            </div>
            <div>
              <dt>Screens</dt>
              <dd>
                <div className="sw-panel-shots">
                  {active && active.shots.length ? (
                    active.shots.map((src) => (
                      <img key={src} src={src} alt={`${active.name} screenshot`} loading="lazy" />
                    ))
                  ) : (
                    <>
                      <div className="slot-box">Screenshot slot</div>
                      <div className="slot-box">Screenshot slot</div>
                    </>
                  )}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        <div className="sw-panel-foot">
          {active && active.liveUrl ? (
            <a className="sw-panel-cta" href={active.liveUrl} target="_blank" rel="noreferrer">
              Visit live site &nbsp;&#8599;
            </a>
          ) : (
            <p className="sw-panel-note">Case study only — no live link</p>
          )}
        </div>
      </aside>

      <p className="sector-hint">Select an object · Esc to return</p>
    </section>
  );
}
