import React, { useCallback, useEffect, useRef, useState } from "react";
import { SKILL_ROWS, SKILLS } from "./skills.js";
import useClick from "./useClick.js";

const MUTE_KEY = "pf-keyboard-muted";

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function SpeakerIcon({ muted }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
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
  const active = SKILLS.find((s) => s.id === activeId) || null;
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
    <section className={`kb ${assembled ? "is-assembled" : ""}`} ref={sectionRef} id="skills">
      <header className="kb-intro">
        <div>
          <h2>Skills, one key at a time</h2>
          <p>
            Press a key to hear it and read what it actually means. The {learningCount} keys with a
            dot are ones I&apos;m still learning — worth saying out loud.
          </p>
        </div>

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

      <div className="kb-readout" aria-live="polite">
        {active ? (
          <>
            <p className="kb-readout-head">
              <span className="kb-readout-name">{active.label}</span>
              {active.learning && <span className="kb-tag">still learning</span>}
            </p>
            <p className="kb-readout-desc">{active.desc}</p>
          </>
        ) : (
          <p className="kb-readout-empty">
            Press any key above — or tab to one and hit enter — for a plain-English description.
          </p>
        )}
      </div>
    </section>
  );
}
