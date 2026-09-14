import React, { useRef } from "react";
import Hero from "./Hero.jsx";
import SatelliteHero from "./SatelliteHero.jsx";
import usePointerFx from "./usePointerFx.js";
import SkillsKeyboard from "./SkillsKeyboard.jsx";
import SelectedWork from "./SelectedWork.jsx";
import Footer from "./Footer.jsx";

export default function App() {
  const cursorRef = useRef(null);

  // Cursor ring, magnetic buttons and the parallax variables. Lives here
  // rather than in Hero because a cursor that vanished once you scrolled past
  // the hero would read as a bug.
  usePointerFx(cursorRef);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-ambient" aria-hidden="true">
        <span className="app-wash" />
        <span className="app-blob app-blob--gold" />
        <span className="app-blob app-blob--blue" />
        <span className="app-blob app-blob--teal" />
        <span className="app-blob app-blob--brass" />
      </div>

      {/* Page-wide chrome from hero.html. Both are pointer-events:none. */}
      <div className="fx-grain" aria-hidden="true" />
      <div className="fx-cursor" ref={cursorRef} aria-hidden="true">
        <div className="ring" />
      </div>

      {/* The hero's object. Out here rather than inside <Hero> for the same
          reason .fx-grain and .fx-cursor are: it is fixed and spans the page.
          The flight runs from the hero to Selected Work, so it has to outlive
          the section it starts in. Transparent canvas — the hero background
          underneath it is untouched. */}
      <SatelliteHero />

      {/* Selected Work follows the hero directly: the satellite's flight ends
          on its first planet, and this is where it hands over to the real
          ones. Skills sits after it. The teardown section used to run between
          the two — the satellite took over that job, and it is gone. */}
      <main id="main">
        <Hero />
        <SelectedWork />
        <SkillsKeyboard />
      </main>

      <Footer />
    </>
  );
}
