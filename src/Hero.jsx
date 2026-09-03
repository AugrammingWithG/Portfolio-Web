import React from "react";
import { CONTACT } from "./links.js";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <p className="hero-eyebrow">
          {CONTACT.location} <span aria-hidden="true">·</span> open to remote worldwide
        </p>

        <h1 className="hero-name">{CONTACT.name}</h1>

        <p className="hero-role">{CONTACT.role}</p>

        <p className="hero-line">
          I build the whole thing — the screens people use and the logic behind them — for client
          sites, team tools, and apps that run every day.
        </p>

        <ul className="hero-links">
          <li>
            <a className="btn btn--gold" href={`mailto:${CONTACT.email}`}>
              Email me
            </a>
          </li>
          <li>
            <a className="btn" href={CONTACT.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </li>
          <li>
            <a className="btn" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
