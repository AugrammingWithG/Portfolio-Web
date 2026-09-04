import React, { useRef } from "react";
import useSatelliteFlight from "./useSatelliteFlight.js";

/* ==========================================================================
   SATELLITE HERO — the hero's object, and the trip forward into Selected Work.

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

   TWO LAYERS, deliberately separate:

     .sat-canvas  the transparent WebGL canvas. The hero's own background —
                  the aurora, the milky way, the flow field — is untouched
                  underneath it and shows straight through.
     .sat-glow    the gold bloom. A painted radial gradient whose only
                  animated property is opacity, the same deal .kb-glow makes
                  in the Skills section. It never blurs a backdrop, so a
                  scroll cannot re-trigger one.

   The whole layer is aria-hidden: with the panel gone there is nothing here
   but scenery, and the work it used to name is a real list in Selected Work.
   ========================================================================== */

export default function SatelliteHero() {
  const layerRef = useRef(null);
  const canvasRef = useRef(null);
  const { ready } = useSatelliteFlight(canvasRef, layerRef);

  return (
    <div className="sat" ref={layerRef} aria-hidden="true">
      <canvas className={`sat-canvas ${ready ? "is-ready" : ""}`} ref={canvasRef} />

      {/* GOLD — the bloom, on its own cheap layer. */}
      <div className="sat-glow" />
    </div>
  );
}
