import React, { useEffect, useRef, useState } from "react";
import { CONTACT } from "./links.js";
import { PROCESS } from "./process.js";
import useFlowField from "./useFlowField.js";

/* Top-right navigation. Same three links, in the order the page now runs:
   Selected Work sits directly after the hero so the flight lands in it, and
   Skills follows. Labels and styling are untouched — only the order moved,
   and it moved to keep matching the page. */
const NAV = [
  /* #work-landed, not #work: #work is the top of the runway where the planets
     are still out in the depth. The anchor at its end is where they are home. */
  { href: "#work-landed", label: "Selected work" },
  { href: "#skills", label: "Skills" },
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
  const [loaded, setLoaded] = useState(false);

  useFlowField(canvasRef, sectionRef);

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
    /* A tall block of scroll with the hero stuck inside it — the same shape the
       teardown section used, and for the same reason: the scroll IS the
       timeline. The satellite needs somewhere to come apart and recede, and it
       does all of that over the hero's own background rather than over another
       section's content.

       The runway carries #top and the ref, so the flight measures from the top
       of the block and useFlowField pauses on the whole block rather than on
       one screen of it. */
    <section className="hero-runway" ref={sectionRef} id="top">
      <div className={`sector hero ${loaded ? "is-loaded" : ""}`}>
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

        {/* Kept from the site's shell: this is the value Selected Work opens
            with, and it is what stops a seam appearing at the boundary. */}
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

        {/* a div, not hero.html's main element. App already owns that landmark.
            .hero-grid centres one block in the viewport; .hero-cols is the two
            columns inside it, bottom-aligned so the object's caption sits on
            the same line as the contact links. */}
        <div className="hero-grid">
          <div className="hero-cols">
            <div className="hero-left">
            {/* Visually the largest line, but the name below is still the page's
                <h1> — size is not heading level. */}
              <p className="hero-role">{CONTACT.role}</p>

              <h1 className="hero-name">
                <span className="reveal">
                  <span>{CONTACT.name}</span>
                </span>
              </h1>

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

            {/* The object itself is not in here. The satellite is a fixed,
                page-wide canvas mounted from App (SatelliteHero.jsx), because
                its flight runs the length of this runway and into Selected
                Work, and a canvas scoped to one screen would be cut off at the
                fold. What stays is the caption, which sits on the contact
                links' line. */}
            <figure className="hero-object">
              {/* The five build steps the satellite is annotated with as it
                  comes apart. The captions out on .sat-notes are aria-hidden
                  and this is the readable copy of them, here rather than in
                  SatelliteHero because that layer is mounted above <main> and
                  would announce a build process before her name.

                  Hidden by default — on screen the satellite is already
                  saying this, and saying it twice is clutter. Reduced motion
                  reveals it: the flight is never bound in that mode, so the
                  annotated version never plays and this is the only place the
                  steps appear at all. Both read process.js; edit the copy
                  there. */}
              <div className="hero-process">
                <p className="hero-process-head">How I build</p>
                <ol className="hero-process-list">
                  {PROCESS.map((step) => (
                    <li key={step.n}>{step.label}</li>
                  ))}
                </ol>
              </div>

              <figcaption className="hero-board-label">
                <span className="k">The satellite</span>
                {/* No count any more: the flight used to land six planets here
                    and it does not, so counting them was pointing at something
                    that had moved to Selected Work. */}
                <span className="v">Scroll to take it apart</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <p className="sector-hint">Scroll · the satellite comes apart</p>
      </div>
    </section>
  );
}
