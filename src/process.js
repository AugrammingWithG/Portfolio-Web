/* ==========================================================================
   HOW I BUILD — the steps annotated onto the satellite as it comes apart.

   The same idea as the teardown on cre8tivesync.online: the object separates
   and each layer is called out by name, so the animation is carrying real
   information instead of just moving. The difference is the voice. The studio
   site says "we"; this is a personal portfolio and every other line on it is
   first person, so these are "I" too.

   EDIT THE COPY HERE. Nothing else in the flight restates it — the scene
   projects an anchor, the hook writes the numbers, this file owns the words.

   Each step:
     n      the step number, printed in the caption's mono prefix
     label  the line itself. Keep it to roughly 40 characters — it is set in
            mono on one or two lines out in the margin, and a long line runs
            back over the object it is pointing at.
     anchor which satellite part the leader line points at, by the tag given
            to it in satelliteScene.js. Anchors are chosen so the line tracks
            a piece that is actually travelling at the time the step is up.
     side   which margin the caption sits in. "right" for anything showing
            before ~0.44, because the hero's name and links are still fading
            out of the left column until then (heroFade in satelliteScene.js
            reaches 0 at progress 0.42). After that either side is clear.
     x, y   the leader line's ORIGIN, as viewport percentages — not the text
            box. The caption hangs off this point, outward into the margin,
            so the geometry never depends on how long the label is.
     in/out the progress window the step is visible over, on the same 0..1
            scale as the flight (0 = top of the hero runway, 1 = Selected Work
            at the top of the viewport).

   THE WINDOWS ARE SEQUENTIAL, overlapping by about the length of one fade so
   a step is always handing over to the next rather than the margin going
   empty. They end by 0.76: the parts start dissolving at 0.61 and are gone
   by 0.92, and a label still pointing at nothing reads as a bug.
   ========================================================================== */

export const PROCESS = [
  {
    n: 1,
    label: "Understand the problem before the stack",
    anchor: "dish",
    side: "right",
    x: 76,
    y: 20,
    in: 0.08,
    out: 0.26,
  },
  {
    n: 2,
    label: "Map the flow, then write the code",
    anchor: "base",
    side: "right",
    x: 76,
    y: 62,
    in: 0.2,
    out: 0.38,
  },
  {
    n: 3,
    label: "Build the smallest thing that works",
    anchor: "core",
    side: "right",
    x: 77,
    y: 40,
    in: 0.32,
    out: 0.5,
  },
  {
    n: 4,
    label: "Test on real devices, not just mine",
    anchor: "top",
    side: "left",
    x: 26,
    y: 28,
    in: 0.44,
    out: 0.62,
  },
  {
    n: 5,
    label: "Ship it, then watch how it gets used",
    anchor: "cell",
    side: "left",
    x: 26,
    y: 66,
    in: 0.56,
    out: 0.76,
  },
];
