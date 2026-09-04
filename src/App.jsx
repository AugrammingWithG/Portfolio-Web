import React, { useRef } from "react";
import Hero from "./Hero.jsx";
import usePointerFx from "./usePointerFx.js";
import Teardown from "./Teardown.jsx";
import SkillsKeyboard from "./SkillsKeyboard.jsx";
import SelectedWork from "./SelectedWork.jsx";
import Footer from "./Footer.jsx";
// The old glassmorphism projects grid is still in the repo as Projects.jsx.
// Swap it back in here if you want to compare the two directions.

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

      <main id="main">
        <Hero />
        <Teardown />
        <SkillsKeyboard />
        <SelectedWork />
      </main>

      <Footer />
    </>
  );
}
