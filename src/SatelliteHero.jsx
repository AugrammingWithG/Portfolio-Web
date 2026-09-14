import React, { useRef } from "react";
import useSatelliteFlight from "./useSatelliteFlight.js";
import { PROCESS } from "./process.js";

/* ==========================================================================
   SATELLITE HERO — the hero's object, the trip forward into Selected Work,
   and the steps annotated onto it on the way.

   Structured the way the keyboard hero was: a component that owns the canvas,
   a hook that owns the lifecycle (useSatelliteFlight.js), and a scene module
   that owns the geometry and the timeline (satelliteScene.js). Same three
   files, same split of responsibility — only the object changed.

   It is mounted from App rather than from inside <section class="hero">, for
   one reason: the flight runs the length of the hero's runway and into
   Selected Work, so the canvas has to be fixed and page-wide. hero.css
   already keeps .fx-grain and .fx-cursor out here for the same reason, and
   says so.

   NO PANEL. There used to be a card here naming each project as its planet
   swung in. Selected Work is a planet system you can drag and open now, so
   that card was introducing the same six projects a screen before the real
   ones did, and the planets it described were introducing themselves twice.
   Both went; the arrival belongs to Selected Work. See the note at the top of
   satelliteScene.js.

   THREE LAYERS, deliberately separate:

     .sat-canvas  the transparent WebGL canvas. The hero's own background —
                  the aurora, the milky way, the flow field — is untouched
                  underneath it and shows straight through.
     .sat-glow    the gold bloom. A painted radial gradient whose only
                  animated property is opacity, the same deal .kb-glow makes
                  in the Skills section. It never blurs a backdrop, so a
                  scroll cannot re-trigger one.
     .sat-notes   the teardown captions. Five steps from process.js, each
                  pinned in a margin with a leader line running to a real part
                  of the satellite. Text and line are DOM, not WebGL: mono
                  type stays crisp at any pixel ratio, it costs no draw calls,
                  and the copy stays greppable.

   THE CAPTIONS ARE aria-hidden, and they are the only copy on this site that
   is stated twice. What a screen reader gets is the ordered list in Hero.jsx,
   which is the same five steps from the same file, in the right place in the
   document — this layer is mounted above <main>, so reading it here would
   announce her build process before her name. That list is also what a
   reduced-motion visitor sees, because with the flight unbound these captions
   never fade in at all. One source, two presentations; edit process.js.
   ========================================================================== */

const pad = (n) => String(n).padStart(2, "0");

export default function SatelliteHero() {
  const layerRef = useRef(null);
  const canvasRef = useRef(null);
  const notesRef = useRef(null);
  const { ready } = useSatelliteFlight(canvasRef, layerRef, notesRef);

  return (
    /* The wrapper carries the hand-over fade, so the canvas and the captions
       leave together. It is not aria-hidden — .sat is, and .sat-notes is —
       because a wrapper that hid everything would leave nothing to un-hide. */
    <div className="sat-layer" ref={layerRef}>
      <div className="sat" aria-hidden="true">
        <canvas className={`sat-canvas ${ready ? "is-ready" : ""}`} ref={canvasRef} />

        {/* GOLD — the bloom, on its own cheap layer. */}
        <div className="sat-glow" />
      </div>

      {/* --sx/--sy are the leader line's origin and never change; the hook
          writes --len, --ang and --o onto each item every frame. Set here as
          inline styles because they are content, not state: React renders
          them once and then never touches this list again. */}
      <ul className="sat-notes" ref={notesRef} aria-hidden="true">
        {PROCESS.map((step) => (
          <li
            key={step.n}
            className={`sat-note sat-note--${step.side}`}
            style={{ "--sx": `${step.x}%`, "--sy": `${step.y}%` }}
          >
            <i className="sat-note-line" />
            <span className="sat-note-tx">
              <b>{pad(step.n)}</b>
              {/* Which step of how many. Only the narrow layout shows it —
                  there the captions arrive one at a time under the satellite
                  with nothing else on screen to say a sequence is running,
                  and five steps can go by in one flick without it. Wide
                  screens have all five origins laid out in the margins, so
                  the count is already visible in the composition. */}
              <i className="sat-note-of">/ {pad(PROCESS.length)}</i>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
