/* ==========================================================================
   SELECTED WORK — the planet system, and the warp into a case study.

   Ported from planet-case-study-fixed.html. The layout, the tween curves, the
   warp, the nav-between-works move and the return are that file's numbers,
   unchanged. Read it before editing any constant in here.

   What is new is only what the prototype could not know about:

     * the data comes from projects.json through planets.js, so the copy is
       not baked into the geometry any more
     * it lives in a section instead of owning the viewport, so everything
       measures against the canvas rather than innerWidth/innerHeight
     * the lights are converted for three r185 — see the note below
     * arrive(), the system coming forward as the section is reached
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

   Read this before touching planets.js's DISC or its depths.               */
const STAGE_R = 1.9;
const stageScale = (proj) => STAGE_R / proj.size;

/* THERE IS NO HAND-OFF POINT, and there never was one. This file used to
   claim the satellite "flies to (3.6, -0.3, -3.5) and fades its canvas out
   there", and started the first planet on that mark so the two sections would
   read as one trip. Both halves of that were wrong:

     * The satellite does not end there. satelliteScene.js drives it to
       z = -seg2 * 34 while pulling it back to the middle, and dissolves it
       outright — satFade reaches 0 at seg2 0.84, well before the flight ends.
       It vanishes deep and centred, on purpose: "what recedes into the nebula
       is the nebula, not a dark shape laid over it".
     * Even had it ended somewhere, the coordinate would not transfer. That
       scene is fov 42 with a lookAt that MOVES down the flight; this one is
       fov 46 with a fixed one. The same world point is not the same pixel.

   So the first planet was sliding in from a spot that corresponded to nothing
   on screen, on its own, while the other five just faded up — which is
   exactly what it looked like: Gourmet Getaway moving out of nowhere.

   What replaces it is in arrive() below: the system comes forward out of the
   same depth the satellite disappeared into, all six together. That is a
   continuation of the flight which is actually true of the flight.

   If a real hand-off is ever wanted it has to be done in screen space — end
   the satellite visibly, project that point through ITS camera, unproject it
   through this one. A shared world constant cannot do it.                  */
const ARRIVE_BACK = 7;

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
     The prototype's globe, ring, planted flag and per-planet light. The globe
     and the flag are placeholders: `logoSlot` is the room left for the real
     mark — a plane just off the globe's face, hidden until planets.js carries
     a logo path. Nothing about the silhouette has to change to take one.    */
  const logoGeo = new THREE.PlaneGeometry(1.15, 1.15);
  const loader = new THREE.TextureLoader();
  const groups = [];

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
    const band = new THREE.Mesh(new THREE.TorusGeometry(proj.size * 1.08, 0.045, 8, 44), bandMat);
    band.rotation.x = proj.band;
    band.rotation.y = i * 0.5;
    grp.add(band);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6),
      new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.6,
        roughness: 0.4,
        transparent: true,
      })
    );
    pole.position.set(proj.size * 0.15, proj.size + 0.35, 0);
    grp.add(pole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.24, 0.02),
      new THREE.MeshStandardMaterial({
        color: GOLD_HI,
        metalness: 0.6,
        roughness: 0.35,
        emissive: GOLD,
        emissiveIntensity: 0.25,
        transparent: true,
      })
    );
    flag.position.set(proj.size * 0.15 + 0.2, proj.size + 0.55, 0);
    grp.add(flag);

    const logoSlot = new THREE.Mesh(
      logoGeo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    logoSlot.position.set(0, 0, proj.size * 0.94);
    logoSlot.visible = false;
    grp.add(logoSlot);
    if (proj.logo) {
      loader.load(proj.logo, (tex) => {
        logoSlot.material.map = tex;
        logoSlot.material.needsUpdate = true;
        logoSlot.visible = true;
      });
    }

    grp.add(new THREE.PointLight(GOLD, 0.6 * R128, 6, 1));

    grp.position.copy(V(proj.home));
    grp.userData = {
      proj,
      i,
      globe,
      logoSlot,
      /* `home` is where the planet rests and is what the return tween and
         arrive() aim at. `baseHome` is the slot as authored, kept apart from
         it because fitWidth() rewrites home.x on every resize and would
         otherwise be narrowing an already-narrowed ring, frame after frame. */
      home: V(proj.home).clone(),
      baseHome: V(proj.home).clone(),
      spin: 0.002 + proj.seed * 0.004,
      materials: [],
    };
    grp.traverse((o) => {
      if (o.isMesh && o.material) grp.userData.materials.push(o.material);
    });

    scene.add(grp);
    groups.push(grp);
  });

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

  const stageV = V(STAGE);
  let state = "system";
  let selected = null;
  let navBusy = false;
  let warpP = 0;
  let hover = null;
  let yaw = 0;
  let pitch = 0;
  let arrived = false;
  /* True only while the arrival is playing. fitWidth() parks resting planets
     on their home x on every resize, which mid-flight would teleport one. */
  let arriving = false;
  let labels = [];
  // Every setTimeout the scene starts, so dispose() can cancel them and a
  // StrictMode remount cannot leave a dead tween firing into a torn-down scene.
  const timers = [];

  const setOpacity = (grp, o) => {
    grp.userData.materials.forEach((m) => {
      m.opacity = o;
    });
    if (grp.userData.logoSlot.visible) grp.userData.logoSlot.material.opacity = o;
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

    // everything else streaks away from the middle
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
  function navTo(dir) {
    if (state !== "detail" || navBusy) return;
    navBusy = true;

    const cur = selected;
    const ti = (cur.userData.i + dir + groups.length) % groups.length;
    const target = groups[ti];

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
        cur.position.lerpVectors(cs, cs.clone().add(new THREE.Vector3(-dir * 7, 0, -2)), p);
        cur.scale.setScalar(css * (1 - p));
        setOpacity(cur, 1 - p);
      },
      () => {
        cur.scale.setScalar(0.0001);
      }
    );

    target.scale.setScalar(0.0001);
    setOpacity(target, 1);
    const start = stageV.clone().add(new THREE.Vector3(dir * 7, 0, -2));
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

    groups.forEach((g) => {
      const home = g.userData.home.clone();
      const sp = g.position.clone();
      const ss = g.scale.x;
      const so = g.userData.materials[0].opacity;
      tween(700, easeInOut, (p) => {
        g.position.lerpVectors(sp, home, p);
        g.scale.setScalar(ss + (1 - ss) * p);
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
     Runs once, when enough of the section is on screen to watch it happen —
     the ratio gate in usePlanetSystem.js is the other half of this.

     Every planet starts ARRIVE_BACK behind its own home and eases forward on
     to it, fading up as it comes. Straight along z: the x and y it lands on
     are the x and y it starts from, so nothing drifts sideways and no planet
     crosses another's path on the way in.

     The stagger is per planet, taken from the seed planets.js already carries,
     so it is the same on every load rather than reshuffling. It is what keeps
     six objects from moving like one sheet — but every one of them is doing
     the SAME thing, a beat apart. Not one of them is singled out. Singling one
     out was the bug.                                                        */
  function arrive() {
    if (arrived) return;
    arrived = true;
    if (reduce) return;

    arriving = true;
    const legs = groups.map((g) => {
      const home = g.userData.home.clone();
      const from = home.clone();
      from.z -= ARRIVE_BACK;
      g.position.copy(from);
      setOpacity(g, 0);
      return { g, from, home, lead: g.userData.proj.seed * 0.3 };
    });

    tween(
      1200,
      easeOut,
      (p) => {
        /* Open a project inside the first 1.2s and select() owns these
           planets now — it is fading five of them out and flying the sixth to
           the stage. Keep writing position and opacity underneath it and the
           two tweens fight. The arrival simply stands down. */
        if (state !== "system") return;
        legs.forEach(({ g, from, home, lead }) => {
          const t = Math.max(0, Math.min(1, (p - lead) / (1 - lead)));
          g.position.lerpVectors(from, home, t);
          setOpacity(g, t);
        });
      },
      () => {
        arriving = false;
        if (state !== "system") return; // stood down; whatever took over owns them
        /* Land exactly, then let fitWidth have the last word on x — a resize
           during the flight moves home out from under the tween. */
        legs.forEach(({ g, home }) => {
          g.position.copy(home);
          setOpacity(g, 1);
        });
        fitWidth();
      }
    );
  }

  /* ---- picking and dragging ---------------------------------------------- */
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let w = 1;
  let h = 1;

  /* x and y are relative to the canvas, not the window — the prototype owned
     the whole viewport and this does not. */
  function pick(x, y) {
    mouse.x = (x / w) * 2 - 1;
    mouse.y = -(y / h) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(groups.map((g) => g.userData.globe));
    return hits[0] ? hits[0].object.parent.userData.i : -1;
  }

  function setHover(index) {
    const next = index >= 0 ? groups[index] : null;
    if (next === hover) return false;
    if (hover) hover.userData.label && hover.userData.label.classList.remove("is-hot");
    hover = next;
    if (hover && hover.userData.label) {
      hover.userData.label.classList.add("is-hot");
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
     React renders them as real buttons so they can be tabbed to and read; the
     loop below is what puts them over their planet. Positions are written
     straight to the elements — one per planet per frame is far cheaper than
     a re-render.                                                            */
  function setLabels(elements) {
    labels = elements || [];
    groups.forEach((g, i) => {
      g.userData.label = labels[i] || null;
    });
  }

  /* ---- frame ------------------------------------------------------------- */
  const pv = new THREE.Vector3();

  /* ---- how wide the ring gets to be -------------------------------------- *
     planets.js draws the ring at the width a normal window can hold. A frame
     narrower than that would push the outer planets off the sides, so the ring
     is pulled in horizontally to fit instead — never pushed out past what was
     authored, so a wide monitor gets the composition as drawn and a cramped
     window gets the same composition, narrower.

     Only x moves. Heights, depths and sizes are untouched, so the ring keeps
     its proportions and nothing has to be re-measured for a new window.

     MIN_FIT is where that stops. Squeeze the sides in past this and the ring
     starts folding through itself — the two o'clock planet arriving on top of
     the ten o'clock one — which is worse than running off the edge. Below it
     the sides clip, which is what a portrait window did before any of this. */
  const HALF_FOV = Math.tan(((46 / 2) * Math.PI) / 180); // camera's, see above
  const CAM_HOME_Z = 6; // the camera's resting distance, before yaw and pitch
  const EDGE = 0.025; // air kept outside the outermost globe, in frame heights
  const MIN_FIT = 0.7;

  function fitWidth() {
    const halfW = 0.5 * camera.aspect; // frame half-width, in frame heights
    let fit = 1;

    groups.forEach((g) => {
      const b = g.userData.baseHome;
      const span = 2 * HALF_FOV * (CAM_HOME_Z - b.z); // frame height there
      const out = Math.abs(b.x) / span; // how far out it sits
      if (out < 1e-6) return; // dead centre, nothing to pull in
      const rr = (g.userData.proj.size * 1.13) / span; // globe + its band
      fit = Math.min(fit, (halfW - EDGE - rr) / out);
    });

    fit = Math.max(MIN_FIT, Math.min(1, fit));

    groups.forEach((g) => {
      g.userData.home.x = g.userData.baseHome.x * fit;
      /* Only move what is sitting still. A planet mid-warp or on the stage is
         somewhere its tween put it, and its tween already holds the home it
         was aiming at — dragging it sideways here would tear the animation. */
      if (state === "system" && !arriving && g !== selected) g.position.x = g.userData.home.x;
    });
  }

  function resize() {
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitWidth();
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

    groups.forEach((g) => {
      g.children[0].rotation.y += g.userData.spin;
      const el = g.userData.label;
      if (!el) return;

      if (state === "system") {
        pv.copy(g.position);
        pv.y += g.userData.proj.size + 0.9;
        pv.project(camera);
        /* inline-flex, not the prototype's `block`: the number and the name
           are laid out with a flex gap, and `block` silently drops it — which
           is how "02Oxilia" ends up run together. */
        const on = pv.z < 1;
        el.style.display = on ? "inline-flex" : "none";
        if (on) {
          el.style.transform = `translate(-50%,-50%) translate(${((pv.x * 0.5 + 0.5) * w).toFixed(
            1
          )}px, ${((-pv.y * 0.5 + 0.5) * h).toFixed(1)}px)`;
        }
      } else {
        el.style.display = "none";
      }
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
  frame();

  return {
    resize,
    frame,
    dispose,
    select,
    navTo,
    deselect,
    arrive,
    pick,
    setHover,
    orbit,
    inspect,
    setLabels,
    getState: () => state,
  };
}
