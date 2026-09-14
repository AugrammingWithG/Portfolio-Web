/* ==========================================================================
   SELECTED WORK — the planet system, and the warp into a case study.

   Ported from ../prototypes/planet-case-study-fixed.html. The layout, the tween curves, the
   warp, the nav-between-works move and the return are that file's numbers,
   unchanged. Read it before editing any constant in here.

   What is new is only what the prototype could not know about:

     * the data comes from projects.json through planets.js, so the copy is
       not baked into the geometry any more
     * it lives in a section instead of owning the viewport, so everything
       measures against the canvas rather than innerWidth/innerHeight
     * the lights are converted for three r185 — see the note below
     * setArrival(), the system coming forward as the runway is scrolled
     * reduced motion opens a project with a straight fade

   THE LIGHTS. The prototype is three r128; this project is r185, and point
   lights changed units in between: intensity is divided by 4π and `decay`
   defaults to 2 instead of 1. Ported across unchanged they arrive at about a
   twelfth of their brightness with a far steeper falloff, and the planets
   come out near-black. Intensities are multiplied by 4π and decay is pinned
   to 1, which reproduces r128 exactly. Colours, positions and ranges are the
   prototype's, untouched. Same conversion as satelliteScene.js.

   Loaded through a dynamic import, so three.js stays out of the initial
   bundle and is shared with the hero's chunk.
   ========================================================================== */

const GOLD = 0xb8892b; // the site's one accent, and the prototype's
const GOLD_HI = 0xe0a838;

import { clamp01 } from "./scrollTimeline.js";

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Where a selected planet comes to rest: left of centre, so it sits clear of
   the case study panel on the right. The prototype's value. */
const STAGE = [-2.5, 0.2, 2.0];

/* How big it is once it gets there. The prototype multiplied every planet by
   a flat 1.7, which was fine while they were all about the same size in world
   units. They are not any more: planets.js sits them at different depths and
   compensates with world size so they read the SAME on screen, which turns a
   flat multiplier into a hierarchy — the deepest project would open half again
   as big as the nearest one, in the one view that shows a project on its own.
   So the stage is a fixed radius and each planet's scale is whatever reaches
   it. 1.9 is where the old numbers averaged out, so the framing is unchanged.
   (The orbit gives every globe the same world size now, so this is a flat
   multiplier again in practice — kept as a radius so it stays true if that
   ever changes.)                                                            */
const STAGE_R = 1.9;
const stageScale = (proj) => STAGE_R / proj.size;

/* ---- ORBIT ----------------------------------------------------------------
   The system view, since 2026-09-15: a star at CENTRE, seven concentric rings
   round it seen from above and in front, one planet on each, all of them
   turning. planets.js holds each planet's ring radius, phase and period in
   flat ring space; this is where the disc gets its tilt and its place in
   the frame.

   A point at angle θ on a ring of radius r lands at

       x = cx + r cosθ
       y = cy − r sinθ · squash
       z = cz + r sinθ · DEPTH

   so the ring reads as an ellipse: squash is how flat it looks, DEPTH is how
   much of the circle's far side goes back into the picture. sinθ > 0 is the
   near side — lower on screen, nearer the camera, bigger.

   CENTRE sits above the frame's middle so the near side of the outer ring
   clears the strip of tiles that runs along the bottom of the section (see
   .pw-strip in selected-work.css). Measured at 1440×900: the outermost
   planet's lowest point lands about 0.27 of the frame from the bottom edge,
   and the strip takes 0.2.

   SQUASH is not fixed. A 16:9 frame wants the flat, TRAPPIST-1 view; a
   phone is tall and narrow and gets the same disc turned up toward the
   camera, so its height is used instead of its width. squashFor() below.
   The centre drops with it (centreYFor): a disc turned up is taller on
   screen, and on a phone the strip is two rows deep, so the whole orbit
   sits lower to fill the room above the tiles rather than leaving a band
   of nothing between the two.

   THERE IS NO HAND-OFF POINT from the satellite, and there never was one.
   The satellite dissolves deep and centred (satelliteScene.js); the system
   appears out of that same dark under the same scroll — the star first, then
   the rings, inner to outer, each with its planet. See setArrival().        */
const CENTRE = [0, 0.6, -3];
const DEPTH = 0.9;
const squashFor = (aspect) => Math.min(0.85, Math.max(0.36, 0.36 * Math.pow(1.78 / aspect, 0.6)));
const centreYFor = (sq) => CENTRE[1] - (sq - 0.36) * 0.8;
/* The ring dots. A ring is a loop of points rather than a line: a line one
   pixel wide reads as a wire, and the reference's rings are dotted.

   THE STREAKS. Each dot arrives as one of the satellite's jump streaks: a
   head with a tail behind it, flying in from outside the ring and shortening
   into the dot it becomes. It is the same object drawn two ways, which is
   the point — the lines the hero jumps through do not dissolve and get
   replaced by rings, they SETTLE into the rings. Same construction as
   stepJump() in satelliteScene.js (a Points head, a LineSegments tail, warm
   white rather than gold) so the two read as one effect at either end of the
   flight.

   Streaks come from OUTSIDE and fall inward, tails trailing away from the
   star — the direction the hero's field is already streaming. SPREAD is how
   far out a ring starts, TAIL how long a streak is at its longest, both in
   that ring's own radii, so an outer ring's streaks are longer and travel
   further and the whole thing stays one gesture rather than seven.        */
const RING_DOTS = 180;
const SPREAD = 0.8;
const TAIL = 0.95;

export async function createScene(canvas, planets, opts = {}) {
  const THREE = await import("three");

  const reduce = !!opts.reduce;
  /* emit() reaches React and is only ever called on a real change of state —
     which project is open, whether the panel is mid-swap. The warp flash is
     deliberately NOT one of these: it moves every frame, so it is written
     straight to its own element. A re-render a frame to fade a gradient would
     cost more than the gradient. */
  const emit = opts.emit || (() => {});
  const flashEl = opts.flash || null;
  const setFlash = (v) => {
    if (flashEl) flashEl.style.opacity = String(v);
  };
  const R128 = 4 * Math.PI; // point-light intensity, r128 -> r185

  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
  camera.position.set(0, 0, 6);

  /* Transparent, so the site's ambient wash and the section's scrim show
     straight through. The prototype already sets this up; it is kept as is. */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.AmbientLight(0x3a4048, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 6, 5);
  scene.add(key);
  const gA = new THREE.PointLight(GOLD, 1.0 * R128, 60, 1);
  gA.position.set(-8, 3, 5);
  scene.add(gA);
  /* Teal fill. Gold is the only accent on this site, but blue and teal are
     what the ambient light is already made of — see the note at the top of
     styles.css — so a cool fill is inside the palette, not beside it. */
  const gB = new THREE.PointLight(0x2f7d8c, 0.8 * R128, 60, 1);
  gB.position.set(9, -3, -2);
  scene.add(gB);

  /* The star field doubles as the warp: size and opacity are driven by warpP
     while a project is being opened, which is what turns the points into
     streaks. */
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.09,
    transparent: true,
    opacity: 0.55,
  });
  {
    const geo = new THREE.BufferGeometry();
    const n = 1000;
    const p = new Float32Array(n * 3);
    // Seeded, so the sky is the same on every load rather than reshuffling.
    let s = 20773;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < n; i += 1) {
      const r = 18 + rand() * 40;
      const a = rand() * 6.28;
      const b = Math.acos(2 * rand() - 1);
      p[i * 3] = r * Math.sin(b) * Math.cos(a);
      p[i * 3 + 1] = r * Math.sin(b) * Math.sin(a);
      p[i * 3 + 2] = r * Math.cos(b);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(geo, starMat));
  }

  /* ---- the planets -------------------------------------------------------
     The prototype's globe, ring, planted flag and per-planet light. There
     used to be a `logoSlot` here too — a plane just off the globe's face,
     waiting for a logo texture. It went when the real marks arrived
     (2026-09-15): they are square app-icon tiles with their own grounds,
     which spinning on a faceted globe would have read as a sticker. The mark
     lives in the case study panel's header instead (see `logo` in
     planets.js), and the globe stays a globe.                               */
  const groups = [];

  /* Everything that orbits sits in one group at CENTRE — the star, the rings
     and the planets — so fitting the orbit to a narrow frame is one scale on
     this group rather than seven re-solves. Planet positions are written in
     the group's space (ring space plus tilt), which is what orbitPos() returns. */
  const sys = new THREE.Group();
  sys.position.copy(V(CENTRE));
  scene.add(sys);

  /* The star. Small, gold, the one bright thing in the middle; its light is
     what the near side of every planet catches. */
  const starCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0 })
  );
  sys.add(starCore);
  const starHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshBasicMaterial({
      color: GOLD_HI,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sys.add(starHalo);
  const starLight = new THREE.PointLight(GOLD, 1.4 * R128, 14, 1);
  sys.add(starLight);

  /* 1 in the system view, 0 while a case study is open — read by
     writeRing(), which is the only thing that writes a ring's opacity. */
  let ringsUp = 1;

  /* The rings, one per planet, drawn in the same tilted space the planets
     move in. Each is a pair — the dots and their streak tails — and one
     writer places both from that ring's arrival. Opacity is written by
     setArrival() as the ring draws in and by setRings() when a case study
     takes the system away.                                                 */
  const rings = [];
  let squash = 0.36; // live value, set by resize()

  /* Place one ring at arrival k. At 0 its dots are SPREAD radii out with
     full-length tails; at 1 they are on the ring with no tail at all, which
     is exactly the dotted ellipse the reference has. Between the two they
     are streaks falling in. Positions are written here rather than in
     frame(): they are a function of the scroll, so they change when the
     scroll changes and not 60 times a second. */
  function writeRing(ring, k) {
    const { proj, head, seg } = ring.userData;
    ring.userData.k = k;
    const e = 1 - Math.pow(1 - k, 3);
    const rr = proj.r * (1 + SPREAD * (1 - e));
    const len = proj.r * TAIL * (1 - e);
    for (let j = 0; j < RING_DOTS; j += 1) {
      const th = (j / RING_DOTS) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const x = rr * c;
      const y = -rr * sn * squash;
      const z = rr * sn * DEPTH;
      head[j * 3] = x;
      head[j * 3 + 1] = y;
      head[j * 3 + 2] = z;
      // The tail trails outward, along the radius the head came in on.
      const t = rr + len;
      const o = j * 6;
      seg[o] = x;
      seg[o + 1] = y;
      seg[o + 2] = z;
      seg[o + 3] = t * c;
      seg[o + 4] = -t * sn * squash;
      seg[o + 5] = t * sn * DEPTH;
    }
    ring.userData.headGeo.attributes.position.needsUpdate = true;
    ring.userData.segGeo.attributes.position.needsUpdate = true;
    /* A streak is visible as soon as its ring starts, not once it has
       landed — the whole idea is that you watch it come in. So visibility
       ramps ahead of the travel, and the tail fades out as it shortens. */
    const vis = clamp01(k * 2.5);
    ring.userData.headMat.opacity = vis * 0.45 * ringsUp;
    ring.userData.segMat.opacity = vis * (1 - e) * 0.5 * ringsUp;
    ring.userData.tails.visible = ring.userData.segMat.opacity > 0.004;
  }

  function buildRings() {
    rings.forEach((r) => {
      sys.remove(r);
      sys.remove(r.userData.tails);
      r.userData.headGeo.dispose();
      r.userData.segGeo.dispose();
      r.userData.headMat.dispose();
      r.userData.segMat.dispose();
    });
    rings.length = 0;
    planets.forEach((proj, i) => {
      const head = new Float32Array(RING_DOTS * 3);
      const seg = new Float32Array(RING_DOTS * 6);
      const headGeo = new THREE.BufferGeometry();
      headGeo.setAttribute("position", new THREE.BufferAttribute(head, 3));
      const segGeo = new THREE.BufferGeometry();
      segGeo.setAttribute("position", new THREE.BufferAttribute(seg, 3));
      const headMat = new THREE.PointsMaterial({
        color: 0xd8cfbd,
        size: 0.035,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      /* The hero's tail colour, not the site's gold: gold is the one accent
         and it belongs to the bands and the star. */
      const segMat = new THREE.LineBasicMaterial({
        color: 0xf1e6cc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const ring = new THREE.Points(headGeo, headMat);
      const tails = new THREE.LineSegments(segGeo, segMat);
      // Both run well outside the ring while streaking; let them.
      ring.frustumCulled = false;
      tails.frustumCulled = false;
      ring.userData = { i, proj, head, seg, headGeo, segGeo, headMat, segMat, tails, k: 0 };
      sys.add(ring);
      sys.add(tails);
      rings.push(ring);
      writeRing(ring, groups[i] ? groups[i].userData.landed : 0);
    });
  }

  /* Where planet i is on its ring at orbital time T, in sys space. */
  const orbitPos = (proj, T, out) => {
    const th = proj.phase + (reduce ? 0 : (T / proj.period) * Math.PI * 2);
    return out.set(
      proj.r * Math.cos(th),
      -proj.r * Math.sin(th) * squash,
      proj.r * Math.sin(th) * DEPTH
    );
  };
  let T = 0; // orbital time, seconds; advances in frame() while the system is up
  let lastNow = performance.now();

  planets.forEach((proj, i) => {
    const grp = new THREE.Group();

    /* NOTHING BELOW BRANCHES ON proj.soon, and that is the point. Incoming
       work used to get a darker globe, a coarser one, a dead band, a dimmer
       light and no flag — five separate ways of saying "lesser" about a
       project whose only difference is that it has not shipped yet. That is
       carried by the SOON tag on the label and by the panel's copy now. The
       globe is a globe. */
    const globeMat = new THREE.MeshStandardMaterial({
      color: 0x2b2e34,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
    });
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(proj.size, 1), globeMat);
    grp.add(globe);

    const bandMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      roughness: 0.5,
      metalness: 0.6,
      emissive: GOLD,
      emissiveIntensity: 0.16,
      transparent: true,
    });
    /* Everything on a planet is proportional to its globe. The prototype's
       numbers were absolute and drawn for globes of about 1.2 units; on the
       orbit's 0.34 globes they made the flag the biggest thing in the frame.
       These are those numbers over 1.2. */
    const S = proj.size;
    const band = new THREE.Mesh(new THREE.TorusGeometry(S * 1.08, S * 0.038, 8, 44), bandMat);
    band.rotation.x = proj.band;
    band.rotation.y = i * 0.5;
    grp.add(band);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(S * 0.021, S * 0.021, S * 0.58, 6),
      new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.6,
        roughness: 0.4,
        transparent: true,
      })
    );
    pole.position.set(S * 0.15, S + S * 0.29, 0);
    grp.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(S * 0.32, S * 0.2, S * 0.017),
      new THREE.MeshStandardMaterial({
        color: GOLD_HI,
        metalness: 0.6,
        roughness: 0.35,
        emissive: GOLD,
        emissiveIntensity: 0.25,
        transparent: true,
      })
    );
    flag.position.set(S * 0.15 + S * 0.17, S + S * 0.46, 0);
    grp.add(flag);

    /* No per-planet light any more: the star in the middle lights all seven,
       and it lights them from the right side — the side facing it. */

    orbitPos(proj, 0, grp.position);
    grp.userData = {
      proj,
      i,
      globe,
      band: bandMat,
      spin: 0.002 + proj.seed * 0.004,
      materials: [],
      /* How far in this planet is, 0..1 — written by setArrival(), read by
         the label it carries. */
      landed: 0,
    };
    grp.traverse((o) => {
      if (o.isMesh && o.material) grp.userData.materials.push(o.material);
    });

    sys.add(grp);
    groups.push(grp);
  });
  buildRings();

  /* ---- tweens ------------------------------------------------------------
     The prototype's runner, kept whole. Every move in this file is expressed
     as one of these, which is why the timings can be read off against that
     file line for line.                                                     */
  let tweens = [];
  const now = () => performance.now();
  function tween(dur, ease, on, done) {
    tweens.push({ t0: now(), dur: reduce ? 1 : dur, ease, on, done });
  }
  function runTweens() {
    for (let i = tweens.length - 1; i >= 0; i -= 1) {
      const tw = tweens[i];
      let p = (now() - tw.t0) / tw.dur;
      if (p >= 1) p = 1;
      tw.on(tw.ease(p));
      if (p >= 1) {
        tweens.splice(i, 1);
        if (tw.done) tw.done();
      }
    }
  }

  /* STAGE is a world position; the planets are children of `sys`, which sits
     at CENTRE, so the stage is expressed in that space. Same pixel as before. */
  const stageV = V(STAGE).sub(V(CENTRE));
  /* A planet's resting scale in the system view. 1 at full width; fitOrbit()
     shrinks it with the orbit on a narrow frame, so the globes do not end up
     bigger than the gaps between their rings. */
  let restScale = 1;
  let state = "system";
  let selected = null;
  let navBusy = false;
  let warpP = 0;
  let hover = null;
  let yaw = 0;
  let pitch = 0;
  /* Where the system is on its way in, 0..1 (setArrival). Nothing can be
     opened until it has reached LANDED_AT — see canOpen(). */
  let arrival = 0;
  const LANDED_AT = 0.98;
  const canOpen = () => arrival >= LANDED_AT;
  let labels = [];
  // Every setTimeout the scene starts, so dispose() can cancel them and a
  // StrictMode remount cannot leave a dead tween firing into a torn-down scene.
  const timers = [];

  /* Opacity on every material, and `visible` with it: a planet at 0 is out
     in the depth or faded behind an open case study, and there is no reason
     to draw five meshes under eight lights for nothing. On the materials,
     not the group — each group carries a point light, and hiding a light
     changes the light count and recompiles every program in the scene. */
  const setOpacity = (grp, o) => {
    const on = o > 0.004;
    grp.userData.materials.forEach((m) => {
      m.opacity = o;
      m.visible = on;
    });
  };

  /* The rings and the star, together: 1 is the system view, 0 is a case
     study. They go with the other planets when one is opened and come back
     with them on return — a ring round a planet that is off on the stage
     would be a ring round nothing. */
  const setRings = (o) => {
    ringsUp = o;
    // writeRing() reads ringsUp, so re-placing at the same k re-fades it.
    rings.forEach((r) => writeRing(r, r.userData.k));
    starCore.material.opacity = o;
    starHalo.material.opacity = 0.35 * o;
    starLight.intensity = 1.4 * R128 * o;
  };

  const setState = (next) => {
    state = next;
    emit({ state: next });
  };

  /* ---- select from the system view --------------------------------------- */
  function select(index) {
    if (state !== "system") return;
    const grp = groups[index];
    if (!grp) return;
    selected = grp;
    setState("warping");

    if (reduce) {
      /* No streaks, no camera easing — the planet is simply there and the
         panel fades in. Everything below is the same end state, arrived at
         without the journey. */
      yaw = 0;
      pitch = 0;
      groups.forEach((g) => {
        if (g !== grp) setOpacity(g, 0);
      });
      setRings(0);
      grp.position.copy(stageV);
      grp.scale.setScalar(stageScale(grp.userData.proj));
      emit({ index, contentIndex: index, panelDim: false });
      setState("detail");
      return;
    }

    const y0 = yaw;
    const pi0 = pitch;
    tween(600, easeInOut, (p) => {
      yaw = y0 * (1 - p);
      pitch = pi0 * (1 - p);
    }); // recentre the camera

    tween(
      700,
      easeInOut,
      (p) => {
        warpP = Math.sin(p * Math.PI);
        setFlash(warpP * 0.55);
      },
      () => {
        warpP = 0;
        setFlash(0);
      }
    );

    tween(500, easeOut, (p) => setRings(1 - p));

    // everything else streaks away from the star
    groups.forEach((g) => {
      if (g === grp) return;
      const s = g.position.clone();
      const d = s.clone().normalize().multiplyScalar(9);
      tween(600, easeOut, (p) => {
        g.position.lerpVectors(s, s.clone().add(d), p);
        setOpacity(g, 1 - p);
      });
    });

    const s = grp.position.clone();
    const ss = grp.scale.x;
    tween(
      750,
      easeInOut,
      (p) => {
        grp.position.lerpVectors(s, stageV, p);
        grp.scale.setScalar(ss + (stageScale(grp.userData.proj) - ss) * p);
      },
      () => {
        emit({ index, contentIndex: index, panelDim: false });
        setState("detail");
      }
    );
  }

  /* ---- move between works without leaving -------------------------------- */
  /* A step between case studies. `dir` is how many places to move, so ±1 is
     Prev/Next and a larger number is a jump — the name bar in SelectedWork.jsx
     presses a project by name while a case study is already open, which is a
     jump of whatever distance separates the two.

     THE INDEX MOVES BY dir; THE PICTURE MOVES BY ITS SIGN. The old planet
     slides out and the new one flies in from seven units off-stage, and that
     seven was multiplied by dir — fine when dir was only ever ±1, but a jump
     from the first project to the sixth threw the planet forty-two units out
     and it crossed the frame like a thrown rock. The distance is fixed now
     and only the direction comes from dir. */
  function navTo(dir) {
    if (state !== "detail" || navBusy || !dir) return;
    navBusy = true;

    const cur = selected;
    const ti = (cur.userData.i + dir + groups.length * 99) % groups.length;
    const target = groups[ti];
    const way = dir > 0 ? 1 : -1;

    if (reduce) {
      cur.scale.setScalar(0.0001);
      setOpacity(cur, 0);
      setOpacity(target, 1);
      target.position.copy(stageV);
      target.scale.setScalar(stageScale(target.userData.proj));
      selected = target;
      navBusy = false;
      emit({ index: ti, contentIndex: ti, panelDim: false });
      return;
    }

    tween(
      500,
      easeInOut,
      (p) => {
        warpP = Math.sin(p * Math.PI) * 0.6;
        setFlash(warpP * 0.4);
      },
      () => {
        warpP = 0;
        setFlash(0);
      }
    );

    emit({ index: ti, panelDim: true });

    const cs = cur.position.clone();
    const css = cur.scale.x;
    tween(
      420,
      easeInOut,
      (p) => {
        cur.position.lerpVectors(cs, cs.clone().add(new THREE.Vector3(-way * 7, 0, -2)), p);
        cur.scale.setScalar(css * (1 - p));
        setOpacity(cur, 1 - p);
      },
      () => {
        cur.scale.setScalar(0.0001);
      }
    );

    target.scale.setScalar(0.0001);
    setOpacity(target, 1);
    const start = stageV.clone().add(new THREE.Vector3(way * 7, 0, -2));
    target.position.copy(start);

    // The copy swaps while the panel is faded out, so the text never changes
    // under the reader's eye. The prototype's 260ms.
    const swap = setTimeout(() => emit({ contentIndex: ti, panelDim: false }), 260);
    timers.push(swap);

    tween(
      520,
      easeInOut,
      (p) => {
        target.position.lerpVectors(start, stageV, p);
        target.scale.setScalar(stageScale(target.userData.proj) * p);
      },
      () => {
        selected = target;
        navBusy = false;
      }
    );
  }

  /* ---- back to the system ------------------------------------------------ */
  function deselect() {
    if (state !== "detail") return;
    setState("returning");
    navBusy = true;
    emit({ index: -1 });

    tween(700, easeInOut, (p) => setRings(p));

    const home = new THREE.Vector3();
    groups.forEach((g) => {
      const sp = g.position.clone();
      const ss = g.scale.x;
      const so = g.userData.materials[0].opacity;
      tween(700, easeInOut, (p) => {
        /* The orbit kept turning while the case study was open, so "home" is
           wherever this planet's ring has carried it by now — read live, or
           the planet lands on a stale mark and jumps as frame() takes over. */
        orbitPos(g.userData.proj, T, home);
        g.position.lerpVectors(sp, home, p);
        g.scale.setScalar(ss + (restScale - ss) * p);
        setOpacity(g, so + (1 - so) * p);
      });
    });

    const t = setTimeout(
      () => {
        selected = null;
        navBusy = false;
        setState("system");
      },
      reduce ? 20 : 720
    );
    timers.push(t);
  }

  /* ---- the arrival ------------------------------------------------------- *
     Scrubbed by scroll, not played on a timer. Selected Work is pinned for a
     stretch after it reaches the top of the viewport (see .sw-runway in
     selected-work.css), and usePlanetSystem.js turns that stretch into a
     0..1 that lands here every scroll event. The satellite's flight works
     the same way, and it is the same journey: the satellite recedes into the
     dark under your hand, and the system forms out of it under the same
     hand. Reversible, like the flight — scroll back up and it unforms.

     ONE AFTER ANOTHER. The star comes up first. Then each ring draws in with
     its planet, inner to outer, each starting a beat after the last and
     overlapping the one before it, so the system is always visibly forming
     until about two thirds through the stretch and then settles. A planet
     arrives where its ring has it at that moment — scaling up and fading in
     on its mark — so it is in orbit from its first pixel, not flying in
     from somewhere and then starting to circle.

     The tiles in the strip follow their own planet in (placeLabel), and
     nothing can be picked until the system has fully landed: a click on a
     planet still half-formed would open a case study over a half-finished
     arrival.

     Under reduced motion there is no pinned stretch and no scrub: the first
     call parks everything formed and that is the end of it.               */
  /* A tile is as present as its planet, and takes no clicks until the
     system has landed. Written here and from setLabels(), where these values
     change, rather than every frame. */
  const placeLabel = (g) => {
    const el = g.userData.label;
    if (!el) return;
    el.style.opacity = g.userData.landed.toFixed(2);
    el.style.pointerEvents = canOpen() ? "" : "none";
  };

  const STAR_IN = 0.14; // the star is fully up this far into the stretch
  const LAST_START = 0.62; // the outermost ring starts drawing here
  const RING_IN = 0.36; // and each one takes this long to draw

  function setArrival(t) {
    arrival = reduce ? 1 : clamp01(t);
    /* Open a project and select() owns these planets — it is fading six of
       them out and flying the seventh to the stage. Writing scale and opacity
       underneath it and the two fight. The scrub simply stands down; opening
       is gated on canOpen(), so it only ever stands down at home. */
    if (state !== "system") return;

    /* Quadratic: keeps the system visibly forming well into the stretch
       instead of finishing early and idling over empty scroll. */
    const p = 1 - (1 - arrival) * (1 - arrival);
    const star = clamp01(p / STAR_IN);
    starCore.material.opacity = star;
    starHalo.material.opacity = star * 0.35;
    starLight.intensity = 1.4 * R128 * star;

    const n = Math.max(1, groups.length - 1);
    groups.forEach((g, i) => {
      const start = STAR_IN * 0.5 + (i / n) * (LAST_START - STAR_IN * 0.5);
      const k = clamp01((p - start) / RING_IN);
      const ease = 1 - Math.pow(1 - k, 3);
      g.userData.landed = k;
      g.scale.setScalar(Math.max(0.0001, ease * restScale));
      setOpacity(g, ease);
      if (rings[i]) writeRing(rings[i], k);
      placeLabel(g);
    });
  }

  /* ---- picking and dragging ---------------------------------------------- */
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let w = 1;
  let h = 1;

  /* x and y are relative to the canvas, not the window — the prototype owned
     the whole viewport and this does not. */
  function pick(x, y) {
    if (!canOpen()) return -1;
    mouse.x = (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(groups.map((g) => g.userData.globe));
    return hits[0] ? hits[0].object.parent.userData.i : -1;
  }

  function setHover(index) {
    const next = index >= 0 ? groups[index] : null;
    if (next === hover) return false;
    /* Both ends light up: the tile in the strip and the band on the planet,
       whichever of the two the pointer is actually over. */
    if (hover) {
      hover.userData.label && hover.userData.label.classList.remove("is-hot");
      hover.userData.band.emissiveIntensity = 0.16;
    }
    hover = next;
    if (hover) {
      hover.userData.label && hover.userData.label.classList.add("is-hot");
      hover.userData.band.emissiveIntensity = 0.75;
    }
    return true;
  }

  function orbit(dx, dy) {
    if (state !== "system") return;
    yaw += dx * 0.0016;
    pitch += dy * 0.0012;
    pitch = Math.max(-0.4, Math.min(0.4, pitch));
  }

  function inspect(dx, dy) {
    if (state !== "detail" || !selected) return;
    selected.rotation.y += dx * 0.01;
    selected.rotation.x = Math.max(-0.6, Math.min(0.6, selected.rotation.x + dy * 0.008));
  }

  /* ---- labels ------------------------------------------------------------ *
     The tiles in the strip. React renders them as real buttons in a real
     list, laid out by CSS; the scene only writes their opacity as their
     planet arrives, whether they take clicks yet, and the hover.            */
  function setLabels(elements) {
    labels = elements || [];
    groups.forEach((g, i) => {
      g.userData.label = labels[i] || null;
      placeLabel(g);
    });
  }

  /* ---- frame ------------------------------------------------------------- */

  /* ---- how wide the orbit gets to be ------------------------------------- *
     The rings are drawn at the width a normal window holds. A frame narrower
     than that would push the outer ring off both sides, so the whole orbit
     is scaled down to fit instead — never up past what was authored, so a
     wide monitor gets the composition as drawn and a cramped window gets the
     same composition, smaller. The globes shrink with it, but less than the
     rings do, so they stay readable as targets a little longer than the
     rings stay apart.

     MIN_FIT is where that stops: past it the globes are smaller than a
     fingertip. Below it the sides clip, which is what a portrait window did
     before any of this — and on a phone the strip is the way in anyway.   */
  const HALF_FOV = Math.tan(((46 / 2) * Math.PI) / 180); // camera's, see above
  const CAM_HOME_Z = 6; // the camera's resting distance, before yaw and pitch
  const EDGE = 0.03; // air kept outside the outermost globe, in frame heights
  const MIN_FIT = 0.42;

  function fitOrbit() {
    const halfW = 0.5 * camera.aspect; // frame half-width, in frame heights
    const span = 2 * HALF_FOV * (CAM_HOME_Z - CENTRE[2]); // frame height at the star
    const outer = planets.reduce((m, p) => Math.max(m, p.r), 0);
    const rr = (planets[0] ? planets[0].size : 0.3) * 1.13; // globe + band
    let fit = ((halfW - EDGE) * span - rr) / outer;
    fit = Math.max(MIN_FIT, Math.min(1, fit));
    sys.scale.setScalar(fit);
    /* The group's scale already shrinks the globes with the rings; this
       brings them part of the way back up. */
    restScale = Math.pow(1 / fit, 0.35);
    if (state === "system") {
      groups.forEach((g) => {
        const ease = 1 - Math.pow(1 - g.userData.landed, 3);
        g.scale.setScalar(Math.max(0.0001, ease * restScale));
      });
    }
  }

  function resize() {
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const sq = squashFor(camera.aspect);
    if (Math.abs(sq - squash) > 1e-4) {
      squash = sq;
      sys.position.y = centreYFor(sq);
      buildRings();
    }
    fitOrbit();
  }

  function frame() {
    runTweens();

    starMat.size = 0.09 + warpP * 0.6;
    starMat.opacity = 0.55 + warpP * 0.4;

    /* Camera easing. Under reduced motion the drift is skipped and the camera
       simply sits where yaw/pitch put it, so nothing glides on its own. */
    const d = 6;
    const k = reduce ? 1 : 0.06;
    camera.position.x += (Math.sin(yaw) * d - camera.position.x) * k;
    camera.position.z += (Math.cos(yaw) * d - camera.position.z) * k;
    camera.position.y += (pitch * 4 - camera.position.y) * k;
    camera.lookAt(0, 0, -2);

    /* The orbit. Time only runs while the system is drawing — a background
       tab's first frame back would otherwise jump every planet a long way
       round, so dt is capped. In detail the others are faded out and the
       selected one is on the stage; T keeps counting so that on return they
       come back to where the rings have carried them (deselect). */
    const nowT = performance.now();
    const dt = Math.min(0.1, (nowT - lastNow) / 1000);
    lastNow = nowT;
    if (!reduce && state !== "warping") T += dt;

    groups.forEach((g) => {
      g.children[0].rotation.y += g.userData.spin;
      if (state === "system") orbitPos(g.userData.proj, T, g.position);
    });

    renderer.render(scene, camera);
  }

  function dispose() {
    timers.forEach(clearTimeout);
    tweens = [];
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    renderer.dispose();
  }

  resize();
  /* The system starts where the scrub would put it at 0: back in the depth
     and unlit. The first scroll reading lands the real value; under reduced
     motion this same call parks everything formed and in place. */
  setArrival(0);
  frame();

  return {
    resize,
    frame,
    dispose,
    select,
    navTo,
    deselect,
    setArrival,
    pick,
    setHover,
    orbit,
    inspect,
    setLabels,
    getState: () => state,
  };
}
