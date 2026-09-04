import React, { useCallback, useEffect, useRef, useState } from "react";
import { SKILL_ROWS, SKILLS } from "./skills.js";
import useClick from "./useClick.js";

const MUTE_KEY = "pf-keyboard-muted";

const pad = (n) => String(n).padStart(2, "0");

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      ) : (
        <>
          <path d="M15.2 9.4a3.6 3.6 0 010 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M17.8 7.2a7 7 0 010 9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

export default function SkillsKeyboard() {
  const sectionRef = useRef(null);
  const timerRef = useRef(null);
  const pointerHandled = useRef(false);

  const [assembled, setAssembled] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [activeId, setActiveId] = useState(null);
  const [pressedId, setPressedId] = useState(null);

  const play = useClick(muted);
  const index = SKILLS.findIndex((s) => s.id === activeId);
  const active = index === -1 ? null : SKILLS[index];
  const learningCount = SKILLS.filter((s) => s.learning).length;

  // One orchestrated assemble when the section comes into view.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAssembled(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAssembled(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const pressKey = useCallback(
    (skill) => {
      setActiveId(skill.id);
      setPressedId(skill.id);
      play();
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setPressedId(null), 150);
    },
    [play]
  );

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked — the toggle still works for this visit */
    }
    if (!next) play("soft", true); // confirm sound is back on
  };

  return (
    <section
      className={`sector kb ${assembled ? "is-assembled" : ""} ${active ? "is-reading" : ""}`}
      ref={sectionRef}
      id="skills"
    >
      <div className="sector-scrim" aria-hidden="true" />
      <div className="sector-frame" aria-hidden="true">
        <i className="tl" />
        <i className="tr" />
        <i className="bl" />
        <i className="br" />
      </div>

      <header className="sector-hud">
        <h2 className="sector-hud-label">Skills</h2>
        <p className="sector-hud-meta">
          <b>{pad(SKILLS.length)}</b> keys
          <span className="sector-sep">·</span>
          <b>{pad(learningCount)}</b> still learning
        </p>
        <button
          type="button"
          className="kb-mute"
          onClick={toggleMute}
          aria-pressed={muted}
          title={muted ? "Turn key sound on" : "Turn key sound off"}
        >
          <SpeakerIcon muted={muted} />
          <span>{muted ? "Sound off" : "Sound on"}</span>
        </button>
      </header>

      {/* Panel left, board right, hairline between — the readout no longer
          sits below the deck, so the whole section fits one screen. */}
      <div className="sector-body kb-layout">
        <aside className="kb-panel" aria-live="polite">
          <p className="kb-panel-eyebrow">
            <span>(tech stack)</span>
            <span className="kb-panel-idx">{active ? `KEY-${pad(index + 1)}` : "——"}</span>
          </p>

          {active ? (
            <div className="kb-panel-body" key={active.id}>
              <h3 className="kb-panel-name">{active.label}</h3>
              {active.learning && <p className="kb-panel-tag">still learning</p>}
              <p className="kb-panel-desc">{active.desc}</p>
            </div>
          ) : (
            /* The idle state carries the section's intro copy, so the panel is
               never an empty box waiting to be filled. */
            <div className="kb-panel-body is-idle">
              <h3 className="kb-panel-name">Press a key</h3>
              <p className="kb-panel-desc">
                Every cap is something I actually build with. Press one — or tab to it and hit
                enter — and it lands here in plain English.
              </p>
              <p className="kb-panel-desc">
                The {learningCount} keys wearing a{" "}
                <span className="kb-inline-dot" aria-hidden="true" /> dot are ones I&apos;m still
                learning. Worth saying out loud.
              </p>
            </div>
          )}

          <p className="kb-panel-foot">
            {active ? `${pad(index + 1)} / ${pad(SKILLS.length)}` : "Awaiting input"}
          </p>
        </aside>

        <div className="kb-link" aria-hidden="true">
          <i className="node" />
          <i className="wire" />
        </div>

        <div className="kb-stage">
          <div className="kb-deck">
            <div className="kb-deck-lip" aria-hidden="true" />

            {SKILL_ROWS.map((row, r) => (
              <div className="kb-row" key={r} style={{ "--r": r }}>
                {row.map((skill, c) => {
                  const isDown = pressedId === skill.id;
                  const isActive = activeId === skill.id;
                  return (
                    <button
                      type="button"
                      key={skill.id}
                      className={`kb-key ${isDown ? "is-down" : ""} ${isActive ? "is-active" : ""}`}
                      style={{ "--i": r * 7 + c }}
                      aria-pressed={isActive}
                      onPointerDown={() => {
                        pointerHandled.current = true;
                        pressKey(skill);
                      }}
                      onClick={() => {
                        // Real pointer clicks are already handled above; this catches
                        // clicks synthesised by assistive technology.
                        if (pointerHandled.current) {
                          pointerHandled.current = false;
                          return;
                        }
                        pressKey(skill);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                          e.preventDefault(); // also stops the browser's synthetic click
                          pressKey(skill);
                        }
                      }}
                    >
                      <span className="kb-cap">
                        <span className="kb-glow" aria-hidden="true" />
                        <span className="kb-label">{skill.label}</span>
                        {skill.learning && <span className="kb-dot" aria-hidden="true" />}
                      </span>
                      {skill.learning && <span className="sr-only"> — still learning</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="sector-hint">Press a key · the panel reads it back</p>
    </section>
  );
}
