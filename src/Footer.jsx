import React from "react";
import { CONTACT } from "./links.js";

export default function Footer() {
  return (
    <footer className="ft" id="contact">
      <div className="ft-inner">
        <div className="ft-lead">
          <h2>Let's talk</h2>
          <p>
            Open to remote work and freelance projects. The fastest way to reach me is email.
          </p>
        </div>

        <ul className="ft-links">
          <li>
            <span className="ft-key">Email</span>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </li>
          <li>
            <span className="ft-key">GitHub</span>
            <a href={CONTACT.github} target="_blank" rel="noreferrer">
              {CONTACT.githubLabel}
            </a>
          </li>
          <li>
            <span className="ft-key">LinkedIn</span>
            <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">
              {CONTACT.linkedinLabel}
            </a>
          </li>
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
