import React, { useEffect, useRef, useState } from "react";
import { CONTACT } from "./links.js";
import { SKILLS } from "./skills.js";
import { WORK } from "./work.js";
import useFlowField from "./useFlowField.js";
import useHeroBoard from "./useHeroBoard.js";

const pad = (n) => String(n).padStart(2, "0");

/* Top-right navigation. Counts are gone from the labels now that this is a nav
   rather than an index card, but they still drive the keyboard's caption. */
const NAV = [
  { href: "#skills", label: "Skills" },
  { href: "#work", label: "Selected work" },
  { href: "#contact", label: "Contact" },
];

const LINKS = [
  { href: `mailto:${CONTACT.email}`, label: "Email", external: false },
  // TODO: real GitHub URL — CONTACT.github in links.js already has it
  { href: "#", label: "GitHub", external: false },
  // TODO: real LinkedIn URL — CONTACT.linkedin in links.js already has it
  { href: "#", label: "LinkedIn", external: false },
];

export default function Hero() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useFlowField(canvasRef, sectionRef);
  const boardReady = useHeroBoard(boardRef, sectionRef);

  // hero.html waits two frames before adding the class, so the browser has the
  // pre-transition state committed and the reveal actually plays.
  useEffect(() => {
    let raf2 = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setLoaded(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <section className={`sector hero ${loaded ? "is-loaded" : ""}`} ref={sectionRef} id="top">
      {/* Near-black ground plus the aurora and the gold current, masked out at
          the bottom so the section hands over to the site's own ground. */}
      <div className="hero-fx" aria-hidden="true">
        <div className="aurora">
          <i className="g1" />
          <i className="g2" />
          <i className="g3" />
          <i className="g4" />
        </div>
        <div className="milkyway" />
        <canvas className="hero-flow" ref={canvasRef} />
      </div>

      {/* Kept from the site's shell: this is the value Teardown opens with, and
          it is what stops a seam appearing at the boundary. */}
      <div className="sector-scrim" aria-hidden="true" />

      <div className="hero-top">
        <p className="hero-mark">
          // Profile
          <span className="sector-sep">·</span>
          {CONTACT.location}
        </p>
        <nav className="hero-nav" aria-label="Sections">
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} data-hover>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* a div, not hero.html's main element — App already owns that landmark */}
      <div className="hero-grid">
        <div className="hero-left">
          {/* Visually the largest line, but the name below is still the page's
              <h1> — size is not heading level. */}
          <p className="hero-role">{CONTACT.role}</p>

          <h1 className="hero-name">
            <span className="reveal">
              <span>{CONTACT.name}</span>
            </span>
          </h1>

          <p className="hero-blurb">
            <span className="hero-blurb-mark">// what I do</span>
            I build the whole thing — the screens people use and the logic behind them — for
            client sites, team tools, and apps that run every day.
          </p>

          <ul className="hero-links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  data-magnetic
                  data-hover
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <figure className="hero-board" data-depth="-6">
          <canvas
            className={`hero-board-canvas ${boardReady ? "is-ready" : ""}`}
            ref={boardRef}
            aria-hidden="true"
          />
          <figcaption className="hero-board-label">
            <span className="k">The board</span>
            <span className="v">
              {pad(SKILLS.length)} keys · {pad(WORK.length)} projects · scroll to take it apart
            </span>
          </figcaption>
        </figure>
      </div>

      <p className="sector-hint">Scroll · the board comes apart</p>
    </section>
  );
}
