import React, { useEffect, useRef, useState } from "react";
import { PLANETS, LIVE_COUNT, SOON_COUNT } from "./planets.js";
import usePlanetSystem from "./usePlanetSystem.js";

/* ==========================================================================
   SELECTED WORK — the projects as a planet system, and the warp into a case
   study.

   Structured like the site's other scene sections: this component owns the
   DOM, usePlanetSystem.js owns the lifecycle and the input, planetScene.js
   owns the geometry and the timeline.

   THE STRIP IS THE ACCESSIBLE VERSION. A planet in a WebGL canvas cannot be
   tabbed to or read out, so each one gets a real <button> in a real list —
   the row of tiles under the orbit, each a small planet with the work's name
   in a rectangle, after the scale strip in the TRAPPIST-1 reference. The
   tiles are laid out by CSS, not by the scene; the scene only fades each one
   in with its planet and lights it on hover. Take the canvas away — no
   WebGL, a failed chunk — and what is left is that same row, which still
   reads and still opens. That is why the list is not aria-hidden decoration.

   The panel is a dialog rather than a region because it takes over the
   section: while it is open the wheel belongs to this section (see the scroll
   rule in usePlanetSystem.js), so Esc, Back and Prev/Next all have to be
   reachable, and focus has to be inside it.
   ========================================================================== */

const pad = (n) => String(n).padStart(2, "0");

/* Same convention as the rest of the site: a gap shows as a dimmed // TODO
   rather than collapsing to nothing, so what is missing stays visible. */
function Field({ value }) {
  if (!value) return <span className="todo">// TODO</span>;
  return <>{value}</>;
}

/* One screenshot. Lazy, because the panel is off-stage until a project is
   opened and nothing should load for a case study nobody has asked for. A
   file that fails to load drops out of the grid rather than leaving a broken
   image in a portfolio. */
function Shot({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <li>
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </li>
  );
}

/* What an incoming project says instead of a write-up. One place, so adding a
   project to `onHold` in projects.json needs no copy anywhere in the code. */
const SOON_COPY = {
  problem: "This one's still landing. The full write-up goes live once it's ready to show properly.",
  result: "Check back shortly.",
};

export default function SelectedWork() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const flashRef = useRef(null);
  const panelRef = useRef(null);
  const backRef = useRef(null);
  const labelRefs = useRef([]);
  const lastFocused = useRef(null);

  const { ready, failed, view, reduced, open, navTo, close, hover } = usePlanetSystem({
    canvasRef,
    sectionRef,
    flashRef,
    panelRef,
    labelRefs,
  });

  const isOpen = view.state === "detail";
  const project = view.contentIndex >= 0 ? PLANETS[view.contentIndex] : null;

  // Move focus into the panel when it opens, and hand it back to the planet
  // that opened it when it closes.
  useEffect(() => {
    if (isOpen && backRef.current) backRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (view.state === "system" && lastFocused.current) {
      lastFocused.current.focus();
      lastFocused.current = null;
    }
  }, [view.state]);

  // A fresh project means a fresh scroll position, or the reader lands
  // halfway down the previous case study.
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [view.contentIndex]);

  const openPlanet = (i) => {
    lastFocused.current = labelRefs.current[i] || null;
    open(i);
  };

  return (
    /* A runway with the section stuck inside it, the same shape as the hero
       and for the same reason: the arrival is scrubbed by scroll, so the
       system needs a stretch of page to come forward over while the frame
       holds still. #work is the runway's top — that is where the satellite's
       flight ends and this one begins. #work-landed sits at the end of the
       stretch, where the planets are home; the nav and the panel's "pull to
       top" both go there, so nobody lands in front of six planets that have
       not arrived yet. Both are read by id in scrollTimeline.js. */
    <div className="runway sw-runway" id="work">
    <i className="sw-landed" id="work-landed" aria-hidden="true" />
    <section
      className={`sector sw ${isOpen ? "is-open" : ""} ${ready ? "is-ready" : ""} ${
        failed ? "is-fallback" : ""
      }`}
      ref={sectionRef}
    >
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
          <b>{pad(LIVE_COUNT)}</b> live
          <span className="sector-sep">·</span>
          <b>{pad(SOON_COUNT)}</b> incoming
        </p>
      </header>

      {/* ---- the name bar -------------------------------------------------
          THE WAY IN FOR SOMEBODY WHO DOES NOT KNOW THE PLANETS ARE CLICKABLE.
          Augniña's problem, in her words: "if there were a normal guy and non
          techy, he wouldn't know that he has to click the planet so that he
          can see my work." Everything this section had was either a diagram
          or a legend under one — and a recruiter reads project NAMES long
          before they wonder what a planet does.

          So the seven names sit in a pill at the top of the section, in the
          same shape as the group picker in Skills, and pressing one opens its
          case study. The orbit underneath is untouched.

          WHY EACH SEGMENT CARRIES ITS OWN HIGHLIGHT rather than one block
          sliding between them, which is what Skills does: four short group
          names share an equal-width step, but "Gourmet Getaway Tours" and
          "AiCore" do not. Equal segments would either truncate the long name
          or leave the short ones swimming, and a block sized to a step cannot
          land on segments that are not steps. Per-segment it is, in the same
          colours, so the two bars still read as one idea.

          IT STANDS DOWN WHILE A CASE STUDY IS OPEN, the same as the strip of
          tiles. It was meant to stay up — knowing which of the seven you are
          on is worth most right then — but the panel is 58vw and covers it
          from the fourth name onward, so what was actually on screen was
          three reachable names and a highlight hidden behind the panel.
          Half a control is worse than none; Prev/Next and Back carry it from
          there. (open() in usePlanetSystem.js still handles being called with
          a project while another is open — it steps instead of opening — so
          this can come back if the panel ever narrows.) */}
      {/* The names and the invitation as ONE positioned block. The bar wraps
          to three rows on a phone and one on a desktop, so anything placed
          under it by a fixed offset is wrong at every width but the one it
          was measured at. Positioned as a pair, the gap is a gap. */}
      <div className="pw-top">
      <nav className="pw-bar" aria-label="Projects">
        <ul>
          {PLANETS.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`pw-bar-item ${view.contentIndex === i && isOpen ? "is-on" : ""}`}
                onClick={() => openPlanet(i)}
                onPointerEnter={() => hover(i)}
                onPointerLeave={() => hover(-1)}
                aria-current={view.contentIndex === i && isOpen ? "true" : undefined}
              >
                <span className="n">{pad(i + 1)}</span>
                <span className="pw-bar-name">{p.name}</span>
                {p.soon && <span className="pw-bar-soon">Soon</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* The invitation, under the names. Quiet on purpose: the bar above it
          is what a reader who does not want to play with a 3D scene will use,
          and this is for the one who might. It says the orbit is a thing you
          touch, which is the only part the bar cannot say.

          It rides the arrival in with the planets and stands down with the
          bar while a case study is open, so it never sits over the panel.
          Unlike .sector-hint, which hud.css hides below 900px, this shows at
          every width — a phone reader needs it more, not less. */}
      <p className="pw-invite">Click a planet and start exploring!</p>
      </div>

      <div className="pw-stage">
        <canvas className={`pw-canvas ${ready ? "is-ready" : ""}`} ref={canvasRef} aria-hidden="true" />

        {/* The warp pulse. Its own layer, a painted gradient, opacity only —
            nothing here blurs a backdrop, so the streaks cannot make the
            compositor re-blur anything. */}
        <div className="pw-flash" ref={flashRef} aria-hidden="true" />

        <ul className="pw-strip">
          {PLANETS.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className="pw-label"
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                onClick={() => openPlanet(i)}
                onPointerEnter={() => hover(i)}
                onPointerLeave={() => hover(-1)}
              >
                {/* The planet, small: a globe and its gold band, tilted the
                    way that planet's band is tilted in the scene. Decorative —
                    the name is what the button says. */}
                <svg className="pw-tile-orb" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="24" cy="24" r="13" />
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="19"
                    ry="5.5"
                    transform={`rotate(${Math.round((p.band - 1) * 38 - 18)} 24 24)`}
                  />
                </svg>
                {/* The number, the name and the SOON chip are one inline run
                    inside the box, not three flex items. As flex items the
                    name was an unbreakable block that dropped to its own line
                    before wrapping inside itself, so "01 Gourmet Getaway
                    Tours" came out three lines deep while every other tile
                    was one — a ragged row. Inline, it flows as text and
                    wraps where it runs out of box. */}
                <span className="pw-tile-tag">
                  <span className="pw-tile-text">
                    <span className="n">{pad(i + 1)}</span>{" "}
                    <span className="pw-label-name">{p.name}</span>
                    {p.soon && <span className="pw-soon">Soon</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="pw-back"
        ref={backRef}
        onClick={close}
        tabIndex={isOpen ? 0 : -1}
        aria-hidden={isOpen ? undefined : "true"}
      >
        ← Back to the system
      </button>

      <aside
        className={`pw-panel ${isOpen ? "is-open" : ""} ${view.panelDim ? "is-dim" : ""}`}
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="pw-name"
        inert={isOpen ? undefined : ""}
      >
        <p className="pw-eyebrow">
          // Project {pad(view.contentIndex + 1)}
          {project && project.soon ? " · Incoming" : ""}
        </p>
        {/* The mark and the name, side by side. The tile is only rendered when
            the project has one — Gourmet Getaway and MealPlanner do not — and
            the name sits flush left when it is missing, so a gap never shows
            where a logo should have been. Decorative: the name beside it is
            the accessible name of the dialog. */}
        <div className={`pw-head ${project && project.logo ? "has-logo" : ""}`}>
          {project && project.logo && (
            <img className="pw-logo" src={project.logo} alt="" width="512" height="512" />
          )}
          <div className="pw-head-text">
            <h3 className="pw-name" id="pw-name">
              {project ? project.name : ""}
            </h3>
            <p className="pw-tag">{project && <Field value={project.tag} />}</p>
          </div>
        </div>

        <div className="pw-row">
          <p className="k">The problem</p>
          <p className="v">
            {project && (project.soon ? SOON_COPY.problem : <Field value={project.problem} />)}
          </p>
        </div>

        <div className="pw-row">
          <p className="k">My role</p>
          <p className="v">{project && (project.soon ? "Not yet." : <Field value={project.role} />)}</p>
        </div>

        <div className="pw-row">
          <p className="k">What I built</p>
          <p className="v">{project && (project.soon ? "Not yet." : <Field value={project.built} />)}</p>
        </div>

        <div className="pw-row">
          <p className="k">Stack</p>
          <ul className="pw-stack">
            {project && project.soon ? (
              <li>Coming soon</li>
            ) : project && project.stack.length ? (
              project.stack.map((s) => <li key={s}>{s}</li>)
            ) : (
              <li className="todo">// TODO</li>
            )}
          </ul>
        </div>

        <div className="pw-row">
          <p className="k">Result</p>
          <p className="v">
            {project && (project.soon ? SOON_COPY.result : <Field value={project.result} />)}
          </p>

          {/* A live link when there is one, otherwise the line that says how
              else you can see it. Both come from projects.json — see
              shownVia() in planets.js. */}
          {project && !project.soon && project.live && (
            <a className="pw-live" href={project.live} target="_blank" rel="noreferrer">
              View live ↗
            </a>
          )}
          {project && !project.soon && !project.live && project.shown && (
            <p className="pw-shown">{project.shown}</p>
          )}
        </div>

        {/* The evidence, last: the spec sheet reads first and the recording
            and screenshots follow it. A row only exists when there is
            something to show — the "Visuals to follow" line above is what
            covers the gap.

            The recording is a real <video>, not an autoplaying loop: it is
            56 seconds with a soundtrack, so it waits for a press. Muted by
            default (the sound is a room, not narration), preload="none" so a
            case study nobody opens never fetches 7MB, and the poster holds
            the frame until then. */}
        {project && !project.soon && project.video && (
          <div className="pw-row">
            <p className="k">Recording</p>
            <video
              className="pw-video"
              src={project.video}
              poster={project.videoPoster || undefined}
              controls
              muted
              playsInline
              preload="none"
              width="1280"
              height="720"
            >
              {"Your browser can't play this recording."}
            </video>
          </div>
        )}

        {project && !project.soon && project.shots.length > 0 && (
          <div className="pw-row">
            <p className="k">Screens</p>
            <ul className={`pw-shots pw-shots--${project.platform}`}>
              {project.shots.map((src, i) => (
                <Shot
                  key={src}
                  src={src}
                  alt={`${project.name} screenshot ${i + 1} of ${project.shots.length}`}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="pw-nav">
          <button type="button" onClick={() => navTo(-1)}>
            ← Prev work
          </button>
          <button type="button" onClick={() => navTo(1)}>
            Next work →
          </button>
        </div>
      </aside>

      <p className="sector-hint">
        {isOpen
          ? reduced
            ? "← → to move between projects · Esc to go back"
            : "Drag to inspect · scroll or ← → to move · Esc to go back"
          : /* "Select a planet to open it" moved up to .pw-invite, where it
               is legible and where a phone can see it. What is left here is
               the extra a curious reader can find. */
            "Drag to tilt the orbit"}
      </p>
    </section>
    </div>
  );
}
