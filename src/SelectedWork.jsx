import React, { useEffect, useRef } from "react";
import { PLANETS, LIVE_COUNT, SOON_COUNT } from "./planets.js";
import usePlanetSystem from "./usePlanetSystem.js";

/* ==========================================================================
   SELECTED WORK — the projects as a planet system, and the warp into a case
   study.

   Structured like the site's other scene sections: this component owns the
   DOM, usePlanetSystem.js owns the lifecycle and the input, planetScene.js
   owns the geometry and the timeline.

   THE LABELS ARE THE ACCESSIBLE VERSION. A planet in a WebGL canvas cannot be
   tabbed to or read out, so each one gets a real <button> in a real list,
   carrying the project's name and its status. The scene positions those
   buttons over their planets every frame; take the canvas away — no WebGL, a
   failed chunk — and what is left is a list of the work that still reads and
   still opens. That is why the list is not aria-hidden decoration.

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

  const { ready, failed, view, reduced, open, navTo, close } = usePlanetSystem({
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
    <section
      className={`sector sw ${isOpen ? "is-open" : ""} ${ready ? "is-ready" : ""} ${
        failed ? "is-fallback" : ""
      }`}
      ref={sectionRef}
      id="work"
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

      <div className="pw-stage">
        <canvas className={`pw-canvas ${ready ? "is-ready" : ""}`} ref={canvasRef} aria-hidden="true" />

        {/* The warp pulse. Its own layer, a painted gradient, opacity only —
            nothing here blurs a backdrop, so the streaks cannot make the
            compositor re-blur anything. */}
        <div className="pw-flash" ref={flashRef} aria-hidden="true" />

        <ul className="pw-labels">
          {PLANETS.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`pw-label ${p.soon ? "is-soon" : ""}`}
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                onClick={() => openPlanet(i)}
              >
                <span className="n">{pad(i + 1)}</span>
                <span className="pw-label-name">{p.name}</span>
                {p.soon && <span className="pw-soon">Soon</span>}
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
        <h3 className="pw-name" id="pw-name">
          {project ? project.name : ""}
        </h3>
        <p className="pw-tag">{project && <Field value={project.tag} />}</p>

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
          : "Drag to look around · select a planet to open it"}
      </p>
    </section>
  );
}
