import React from "react";
import Hero from "./Hero.jsx";
import SkillsKeyboard from "./SkillsKeyboard.jsx";
import Projects from "./Projects.jsx";
import Footer from "./Footer.jsx";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-ambient" aria-hidden="true">
        <span className="app-blob app-blob--gold" />
        <span className="app-blob app-blob--blue" />
        <span className="app-blob app-blob--teal" />
      </div>

      <main id="main">
        <Hero />
        <SkillsKeyboard />
        <Projects />
      </main>

      <Footer />
    </>
  );
}
