import { useCallback, useEffect, useRef } from "react";

/**
 * A short mechanical click, generated on the fly with the Web Audio API.
 * No audio files: a filtered noise transient for the "click", plus a fast
 * falling triangle tone for the "thock" underneath it.
 *
 * Returns play(variant, force). `force` lets the mute toggle play its own
 * confirmation click on the same tick it unmutes, before state has settled.
 */
export default function useClick(muted) {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") ctx.close();
    };
  }, []);

  return useCallback((variant = "normal", force = false) => {
    if (mutedRef.current && !force) return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    if (!ctxRef.current) {
      try {
        const ctx = new Ctx();
        const master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);
        ctxRef.current = ctx;
        masterRef.current = master;
      } catch {
        return; // no audio available; the keyboard still works silently
      }
    }

    const ctx = ctxRef.current;
    const master = masterRef.current;
    // Browsers keep the context suspended until a real gesture. A key press is one.
    if (ctx.state === "suspended") ctx.resume();

    const t = ctx.currentTime;
    const soft = variant === "soft";

    // 1. Click transient — a very short burst of band-passed noise.
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const fade = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = soft ? 1500 : 2400;
    band.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(soft ? 0.14 : 0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    noise.connect(band).connect(noiseGain).connect(master);

    // 2. Body — a fast downward sweep, so it reads as a switch and not a beep.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(soft ? 170 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(soft ? 80 : 95, t + 0.06);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(soft ? 0.12 : 0.22, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
    osc.connect(oscGain).connect(master);

    noise.start(t);
    noise.stop(t + 0.04);
    osc.start(t);
    osc.stop(t + 0.1);
  }, []);
}
