import { useEffect } from "react";

/* ==========================================================================
   Cursor ring, magnetic buttons and the parallax variables — hero.html's three
   pointer scripts, merged into one requestAnimationFrame loop instead of two.
   Both were doing the same cheap lerp on every frame; running them together
   halves the loops without changing a single easing value.

   Elements opt in exactly as they did in the original, through data
   attributes: [data-hover] grows the ring, [data-magnetic] pulls toward the
   pointer, [data-depth] drifts with the parallax.

   Everything unbinds on unmount. StrictMode mounts effects twice in
   development, and two of these running at once would double every transform.
   ========================================================================== */
export default function usePointerFx(cursorRef) {
  useEffect(() => {
    const cursor = cursorRef.current;
    const fine = window.matchMedia("(hover: hover)").matches;
    if (!fine) return undefined;

    const root = document.documentElement;
    const hoverEls = Array.from(document.querySelectorAll("[data-hover]"));
    const magnetEls = Array.from(document.querySelectorAll("[data-magnetic]"));
    const depthEls = Array.from(document.querySelectorAll("[data-depth]"));

    // cursor position, and the normalised -1..1 pointer used by the parallax
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;
    let tx = 0;
    let ty = 0;
    let X = 0;
    let Y = 0;
    let raf = null;

    function onMove(e) {
      x = e.clientX;
      y = e.clientY;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function loop() {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      if (cursor) cursor.style.transform = `translate(${cx}px,${cy}px)`;

      X += (tx - X) * 0.06;
      Y += (ty - Y) * 0.06;
      root.style.setProperty("--mx", X);
      root.style.setProperty("--my", Y);
      for (const el of depthEls) {
        const d = +el.dataset.depth;
        el.style.transform = `translate(${X * d}px,${Y * d}px)`;
      }
      raf = requestAnimationFrame(loop);
    }

    const grow = () => cursor && cursor.classList.add("grow");
    const shrink = () => cursor && cursor.classList.remove("grow");

    const magnetMove = (e) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.28}px,${
        (e.clientY - r.top - r.height / 2) * 0.4
      }px)`;
    };
    const magnetLeave = (e) => {
      e.currentTarget.style.transform = "";
    };

    window.addEventListener("mousemove", onMove);
    for (const el of hoverEls) {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    }
    for (const el of magnetEls) {
      el.addEventListener("mousemove", magnetMove);
      el.addEventListener("mouseleave", magnetLeave);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      for (const el of hoverEls) {
        el.removeEventListener("mouseenter", grow);
        el.removeEventListener("mouseleave", shrink);
      }
      for (const el of magnetEls) {
        el.removeEventListener("mousemove", magnetMove);
        el.removeEventListener("mouseleave", magnetLeave);
        el.style.transform = "";
      }
      for (const el of depthEls) el.style.transform = "";
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, [cursorRef]);
}
