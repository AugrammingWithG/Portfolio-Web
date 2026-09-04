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
     * arrive(), the hand-off from the hero satellite's flight
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

/* Where the hero satellite leaves its last planet — satelliteScene.js flies
   it to (3.6, -0.3, -3.5) at 1.25 scale and fades its canvas out there. The
   first planet here starts on that exact mark and eases home, so the arrival
   reads as one trip rather than two sections that happen to both have
   planets in them. */
const HANDOFF = [3.6, -0.3, -3.5];
const HANDOFF_SCALE = 1.25;

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
    const soon = proj.soon;
    const base = soon ? 0x232529 : 0x2b2e34;

    const globeMat = new THREE.MeshStandardMaterial({
      color: base,
      roughness: 0.85,
      metalness: 0.2,
      flatShading: true,
      transparent: true,
    });
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(proj.size, soon ? 0 : 1), globeMat);
    grp.add(globe);

    const bandMat = new THREE.MeshStandardMaterial({
      color: soon ? 0x4a4636 : GOLD,
      roughness: 0.5,
      metalness: 0.6,
      emissive: GOLD,
      emissiveIntensity: soon ? 0.04 : 0.16,
      transparent: true,
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(proj.size * 1.08, 0.045, 8, 44), bandMat);
    band.rotation.x = proj.band;
    band.rotation.y = i * 0.5;
    grp.add(band);

    // Incoming work has no flag planted on it yet. That is the point.
    if (!soon) {
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
    }

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

    grp.add(new THREE.PointLight(soon ? 0x2f7d8c : GOLD, (soon ? 0.25 : 0.6) * R128, 6, 1));

    grp.position.copy(V(proj.home));
    grp.userData = {
      proj,
      i,
      globe,
      logoSlot,
      home: V(proj.home).clone(),
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
      grp.scale.setScalar(1.7);
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
        grp.scale.setScalar(ss + (1.7 - ss) * p);
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
      target.scale.setScalar(1.7);
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
        target.scale.setScalar(1.7 * p);
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

  /* ---- the hand-off from the hero flight --------------------------------- *
     Runs once, when the section first comes into view. The first planet
     starts on the mark the satellite left it at and eases home while the rest
     of the system fades up behind it — so the trip that began in the hero
     ends here instead of restarting.                                        */
  function arrive() {
    if (arrived) return;
    arrived = true;
    if (reduce) return;

    const first = groups[0];
    if (!first) return;

    const from = V(HANDOFF);
    const home = first.userData.home.clone();
    first.position.copy(from);
    first.scale.setScalar(HANDOFF_SCALE);
    for (let i = 1; i < groups.length; i += 1) setOpacity(groups[i], 0);

    tween(1100, easeInOut, (p) => {
      first.position.lerpVectors(from, home, p);
      first.scale.setScalar(HANDOFF_SCALE + (1 - HANDOFF_SCALE) * p);
      for (let i = 1; i < groups.length; i += 1) setOpacity(groups[i], p);
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
    if (hover && !hover.userData.proj.soon && hover.userData.label) {
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

  function resize() {
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
