import React from "react";
import { CONTACT } from "./links.js";

const ROWS = [
  { key: "Email", href: `mailto:${CONTACT.email}`, label: CONTACT.email, external: false },
  { key: "GitHub", href: CONTACT.github, label: CONTACT.githubLabel, external: true },
  { key: "LinkedIn", href: CONTACT.linkedin, label: CONTACT.linkedinLabel, external: true },
];

export default function Footer() {
  return (
    <footer className="sector sector--short ft" id="contact">
      <div className="sector-scrim" aria-hidden="true" />
      <div className="sector-frame" aria-hidden="true">
        <i className="tl" />
        <i className="tr" />
        <i className="bl" />
        <i className="br" />
      </div>

      <header className="sector-hud">
        <h2 className="sector-hud-label">Contact</h2>
        <p className="sector-hud-meta">
          <b>Open</b>
          <span className="sector-sep">·</span>
          remote work and freelance
        </p>
      </header>

      <div className="sector-body ft-body">
        <div className="ft-lead">
          <h3 className="ft-title">Let&apos;s talk</h3>
          <p className="ft-blurb">
            Open to remote work and freelance projects. The fastest way to reach me is email.
          </p>
          <a className="btn btn--gold" href={`mailto:${CONTACT.email}`}>
            Email me
          </a>
        </div>

        {/* Same frosted card as the Skills readout, so the last thing on the
            page is built from the same parts as the first. */}
        <ul className="ft-links">
          {ROWS.map((row) => (
            <li key={row.key}>
              <span className="ft-key">{row.key}</span>
              <a
                href={row.href}
                {...(row.external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {row.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="ft-base">
        <span>
          © {new Date().getFullYear()} {CONTACT.name}
        </span>
        <span>{CONTACT.location}</span>
      </p>
    </footer>
  );
}
