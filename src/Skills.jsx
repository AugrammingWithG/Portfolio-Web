import React, { useCallback, useEffect, useRef, useState } from "react";
import { SKILL_GROUPS, SKILLS, LEARNING_COUNT, USED_IN } from "./skills.js";

/* ==========================================================================
   SKILLS — four groups on a carousel, and every stack labelled on its card.

   Replaced the mechanical keyboard on 2026-09-15. The keyboard was a good toy
   and a poor list: twenty-six caps in a flat grid said nothing about how the
   work fits together, and every description was behind a press, so a reader
   skimming the page saw a keyboard and no skills.

   The shape comes from a reference Augniña sent — a row of full-height cards,
   each with its subject set huge and vertical down one side.

   IT IS A CAROUSEL SINCE 2026-09-15, from a second reference she sent: a
   pill-shaped segmented bar across the top holding the four group names, and
   under it ONE card centred with its neighbours peeking in from both edges.
   There are still exactly four cards — one per group, each holding that
   group's own stack — not one per skill. The bar and the rail are two views
   of the same four things: the bar names them and says which you are on, the
   rail is where they actually live.

   NOTHING IS BEHIND A CLICK. There was a detail dialog behind every skill —
   the gloss and the proof — with a focus trap, a scrim and Prev/Next across
   all twenty-six. It is gone: Augniña asked for the labels to live on the
   card itself, so every stack prints its own description under its name and
   the card is the whole of it. The keyboard this section replaced hid the
   skills behind a press; the dialog hid what they were. Neither is left.

   THE PROOF RIDES WITH EACH STACK. The project names come out of
   projects.json's own stacks (USED_IN in skills.js) — React says Oxilia,
   AiCore and Kwento Kard because those projects say React, not because
   anything here claims it. It is the only line on the site between what she
   knows and what she shipped, and it cannot drift: correct a project's stack
   and this follows. Five skills have one today; the rest print nothing rather
   than announcing that they have none.

   THE FILTER is the honesty dot's own control: the "still learning" count in
   the HUD is a button, and pressing it holds those eight up and quietens the
   rest. It DIMS rather than filters — the cards keep their height and nothing
   reflows, so it is a change of emphasis, not the page rearranging itself.
   ========================================================================== */

const pad = (n) => String(n).padStart(2, "0");

/* How far a drag has to travel before it counts as a swipe rather than a tap
   that wandered. Pixels, on the rail's own axis. */
const SWIPE = 45;

export default function Skills() {
  /* Off by default: the section's job is to show everything, and a filter
     that starts on would be hiding most of it on arrival. */
  const [onlyLearning, setOnlyLearning] = useState(false);
  /* Which of the four is centred. The bar and the rail both read it.

     IT OPENS ON BACKEND, NOT FRONTEND, and that is a composition decision
     rather than a statement about the work. The rail does not loop, so the
     first card has nothing to its left and the section arrives lopsided —
     half a screen of empty ground beside a card. Starting one in means a card
     peeks from both sides on arrival, which is the reference's shape and also
     the clearest possible hint that there are more of them. Frontend is one
     arrow, one tab or one drag away. */
  const [group, setGroup] = useState(1);

  /* ---- the rail ---------------------------------------------------------- */
  const go = useCallback(
    (i) => setGroup(Math.max(0, Math.min(SKILL_GROUPS.length - 1, i))),
    []
  );

  /* ← → step the rail. Bound to the rail rather than the window so it only
     answers while the reader is actually inside the section. */
  const onRailKey = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(group + (e.key === "ArrowRight" ? 1 : -1));
  };

  /* One card per swipe, whatever the distance: four cards is not a scroller,
     and a long flick landing two groups away is a different gesture from the
     one the reader made. */
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, done: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.done) return;
    const dx = e.clientX - d.x;
    // A mostly-vertical drag is the page being scrolled, not the rail.
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(e.clientY - d.y)) return;
    d.done = true;
    go(group + (dx < 0 ? 1 : -1));
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <section className={`sector sk ${onlyLearning ? "is-filtered" : ""}`} id="skills">
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
          <b>{pad(SKILLS.length)}</b> skills
          <span className="sector-sep">·</span>
          <b>{pad(SKILL_GROUPS.length)}</b> groups
          <span className="sector-sep">·</span>
          {/* The dot's legend lives here, not only in the hint: the hint is
              hidden below 900px (hud.css) and the dots are not, so on a phone
              they would be eight unexplained gold marks. */}
          <button
            type="button"
            className="sk-filter"
            aria-pressed={onlyLearning}
            onClick={() => setOnlyLearning((v) => !v)}
          >
            <b>{pad(LEARNING_COUNT)}</b>
            <i className="sk-dot sk-dot--inline" aria-hidden="true" /> still learning
          </button>
        </p>
      </header>

      <div className="sector-body sk-deck-wrap">
        {/* ---- the segmented bar ------------------------------------------
            One pill, four segments, and a lit block that slides between them.
            The segments are equal width rather than sized to their names: the
            block that moves assumes a step, and a bar whose segments jump
            about as the label changes reads as four buttons rather than one
            control. */}
        <div className="sk-tabs" role="tablist" aria-label="Skill groups">
          <i
            className="sk-tabs-lit"
            aria-hidden="true"
            style={{ "--t": group, "--n": SKILL_GROUPS.length }}
          />
          {SKILL_GROUPS.map((gr, i) => (
            <button
              key={gr.id}
              type="button"
              role="tab"
              id={`sk-tab-${gr.id}`}
              aria-selected={i === group}
              aria-controls={`sk-card-${gr.id}`}
              tabIndex={i === group ? 0 : -1}
              className={`sk-tab ${i === group ? "is-on" : ""}`}
              onClick={() => go(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const n =
                  (group + (e.key === "ArrowRight" ? 1 : -1) + SKILL_GROUPS.length) %
                  SKILL_GROUPS.length;
                setGroup(n);
                const el = document.getElementById(`sk-tab-${SKILL_GROUPS[n].id}`);
                if (el) el.focus();
              }}
            >
              {gr.name}
            </button>
          ))}
        </div>

        {/* The rail. Moved by transform, not by scrolling: the centred card
            has to be centred exactly and the ones either side have to be
            scaled and dimmed by how far out they are, none of which a
            scroller gives for free. --i is the only thing written here. */}
        <div
          className="sk-stage"
          onKeyDown={onRailKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
        {/* The arrows. The reference has none — its rail loops, so there is
            always a card peeking on both sides. Ours does not: at the first
            card the left half of the stage is empty and the composition sits
            lopsided. An arrow fills that side and says what the empty space
            was failing to. Disabled at the ends rather than wrapping, so the
            reader is told there is no more that way instead of being sent
            silently back to the start. */}
        <button
          type="button"
          className="sk-arrow sk-arrow--prev"
          onClick={() => go(group - 1)}
          disabled={group <= 0}
          aria-label="Previous group"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="sk-arrow sk-arrow--next"
          onClick={() => go(group + 1)}
          disabled={group >= SKILL_GROUPS.length - 1}
          aria-label="Next group"
        >
          <span aria-hidden="true">›</span>
        </button>

        <ol className="sk-deck" style={{ "--i": group }}>
          {SKILL_GROUPS.map((g, i) => (
            <li
              className={`sk-panel ${i === group ? "is-on" : ""}`}
              key={g.id}
              id={`sk-card-${g.id}`}
              role="tabpanel"
              aria-labelledby={`sk-tab-${g.id}`}
            >
              {/* The side cards are the rail's other control — the reference
                  has no arrows and does not need any, because the card you
                  can half-see is the thing you press. Not rendered on the
                  centred card, so it can never sit over that card's own
                  skill buttons. */}
              {i !== group && (
                <button
                  type="button"
                  className="sk-panel-hit"
                  onClick={() => go(i)}
                  aria-label={`Show ${g.name}`}
                />
              )}
              {/* The rail: the group set vertically, the way the reference
                  sets its subject. */}
              <div className="sk-rail">
                <p className="sk-index" aria-hidden="true">
                  {pad(i + 1)}
                  <span>/{pad(SKILL_GROUPS.length)}</span>
                </p>
                <h3 className="sk-name">{g.name}</h3>
              </div>

              <div className="sk-body">
                <p className="sk-blurb">{g.blurb}</p>
                {/* The count, on its own rule. It is the card's third level —
                    under the name and the blurb, over the list — and it is
                    what stops the list starting cold. */}
                <p className="sk-count">
                  {onlyLearning ? (
                    <>
                      <b>{pad(g.skills.filter((s) => s.learning).length)}</b> of{" "}
                      {pad(g.skills.length)} still learning
                    </>
                  ) : (
                    <>
                      <b>{pad(g.skills.length)}</b> skills
                    </>
                  )}
                </p>
                {/* Each stack, with its own label under it. Not buttons any
                    more: there is nothing left to open, because what the
                    dialog used to hold is printed right here. */}
                <ul className="sk-list">
                  {g.skills.map((s) => {
                    const used = USED_IN[s.id] || [];
                    return (
                      <li key={s.id} className={s.learning ? "is-learning" : undefined}>
                        <p className="sk-skill">
                          <span className="sk-skill-name">{s.label}</span>
                          {s.learning && (
                            <>
                              <i className="sk-dot" aria-hidden="true" />
                              <span className="sr-only"> — still learning</span>
                            </>
                          )}
                          {/* THE PROOF, and the only line on the site between
                              what she knows and what she shipped. The names
                              come out of projects.json's own stacks (USED_IN
                              in skills.js), so React says Oxilia, AiCore and
                              Kwento Kard because those projects say React —
                              correct a project's stack and this follows.
                              Five skills have one; the rest print nothing
                              rather than announcing that they have none. */}
                          {used.length > 0 && (
                            <span className="sk-used">
                              <span className="sr-only">used in </span>
                              {used.join(" · ")}
                            </span>
                          )}
                        </p>
                        <p className="sk-desc">{s.desc}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        </div>
      </div>

      <p className="sector-hint">
        {onlyLearning
          ? "Showing what I'm still learning · press the count again for all"
          : "Pick a group above · drag or ← → to move between them"}
      </p>

    </section>
  );
}
