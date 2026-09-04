/* ==========================================================================
   TEARDOWN — the keyboard, built in code and taken apart by scroll.

   Loaded through a dynamic import so three.js never reaches the initial
   bundle; it downloads when the section is close. Same split the reference
   site uses for its ScrollScene3D chunk.

   Everything here is primitives. No model file, no Draco, nothing to keep in
   sync with a binary asset — the geometry is generated from the same 7/7/6/6
   row layout the real Skills keyboard uses, so the two can never disagree
   about what the board is.

   Layers, bottom to top:
       case      the shell
       pcb       the board
       plate     the switch plate
       switches  one per key
       caps      one per key

   Scroll drives a single 0..1 value. Each layer has its own rise and its own
   delay, so the board opens in sequence instead of inflating as one lump.
   ========================================================================== */

const ROWS = [7, 7, 6, 6];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* Brass and near-black, the site's palette. Deliberately not the grey/steel a
   real teardown would use — this has to sit next to the gold key glow. */
const COLORS = {
  case: 0x141210,
  pcb: 0x7a5a1e,
  plate: 0x2a2723,
  sw: 0x1b1917,
  capA: 0x2b2f38,
  capB: 0xc9a24b,
};

/* opts.explode false builds the same board for the hero: assembled, framed for
   the closed state only, and posed by idle() instead of by scroll. Same
   geometry and the same calibration, so the hero board and the teardown board
   can never drift apart. */
export async function createScene(canvas, opts = {}) {
  const explode = opts.explode !== false;
  const THREE = await import("three");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  /* Lighting: one warm key from the upper left the way the brass wash falls,
     a cool fill from behind so the dark case still reads against a dark page,
     and a dim ambient so nothing goes fully black. */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffd9a0, 2.4);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fb6d8, 1.5);
  rim.position.set(5, 2, -6);
  scene.add(rim);
  const under = new THREE.DirectionalLight(0xc9a24b, 0.7);
  under.position.set(0, -5, 2);
  scene.add(under);

  const root = new THREE.Group();
  scene.add(root);

  // Board proportions, in world units. The real board is 7 keys across.
  const U = 1; // one key pitch
  const gap = 0.09;
  const cols = Math.max(...ROWS);
  const boardW = cols * U + (cols - 1) * gap;
  const boardH = ROWS.length * U + (ROWS.length - 1) * gap;
  const padX = 0.55;
  const padY = 0.5;

  const slab = (w, h, d, color, rough, metal) =>
    new THREE.Mesh(
      new THREE.BoxGeometry(w, d, h),
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
    );

  /* ---- layers ---- */
  const layers = [];
  const addLayer = (name, obj, rise, delay) => {
    root.add(obj);
    layers.push({ name, obj, rise, delay, y0: obj.position.y });
    return obj;
  };

  const caseMesh = slab(boardW + padX * 2, boardH + padY * 2, 0.42, COLORS.case, 0.85, 0.15);
  caseMesh.position.y = -0.34;
  addLayer("case", caseMesh, 0, 0);

  const pcb = slab(boardW + 0.34, boardH + 0.3, 0.07, COLORS.pcb, 0.62, 0.5);
  pcb.position.y = -0.06;
  addLayer("pcb", pcb, 1.15, 0.06);

  const plate = slab(boardW + 0.24, boardH + 0.22, 0.05, COLORS.plate, 0.5, 0.75);
  plate.position.y = 0.06;
  addLayer("plate", plate, 2.15, 0.14);

  /* Switches and caps: instanced grids laid out from the real row counts, so a
     change to skills.js rows would show up here too. */
  const switches = new THREE.Group();
  const caps = new THREE.Group();
  const capGeo = new THREE.BoxGeometry(U * 0.86, 0.2, U * 0.86);
  const swGeo = new THREE.BoxGeometry(U * 0.46, 0.22, U * 0.46);
  const swMat = new THREE.MeshStandardMaterial({
    color: COLORS.sw,
    roughness: 0.7,
    metalness: 0.2,
  });
  const capMatA = new THREE.MeshStandardMaterial({
    color: COLORS.capA,
    roughness: 0.62,
    metalness: 0.28,
  });
  const capMatB = new THREE.MeshStandardMaterial({
    color: COLORS.capB,
    roughness: 0.38,
    metalness: 0.72,
  });

  const y0 = -(boardH - U) / 2;
  let n = 0;
  ROWS.forEach((count, r) => {
    const rowW = count * U + (count - 1) * gap;
    const x0 = -(rowW - U) / 2;
    for (let c = 0; c < count; c += 1) {
      const x = x0 + c * (U + gap);
      const z = y0 + r * (U + gap);

      const sw = new THREE.Mesh(swGeo, swMat);
      sw.position.set(x, 0.2, z);
      switches.add(sw);

      // Every third cap is brass, echoing the still-learning dots.
      const cap = new THREE.Mesh(capGeo, n % 3 === 1 ? capMatB : capMatA);
      cap.position.set(x, 0.42, z);
      cap.userData.i = n;
      caps.add(cap);
      n += 1;
    }
  });
  addLayer("switches", switches, 3.1, 0.24);
  addLayer("caps", caps, 4.4, 0.34);

  /* Frame the board on its DIAGONAL, not its width. The group is turned ~28deg
     about Y, so its projected extent is wider than the case itself — sizing to
     the width alone put the corners outside the frustum. */
  const caseW = boardW + padX * 2;
  const caseD = boardH + padY * 2;
  const fit = Math.hypot(caseW, caseD);
  const HALF_X = fit / 2; // worst-case horizontal reach, at any Y rotation
  const HALF_Y = 3.4; // the exploded stack, measured, with headroom
  const FOV = 34;
  const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);
  const MARGIN = 1.12;
  let baseZ = fit;
  let frameY = 0; // vertical pan found by calibration, not by hand

  let w = 1;
  let h = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;

    /* Framing is derived, not guessed. Distance comes from the vertical reach
       (which sets how big the board reads); if the frustum is then too narrow
       for the board's diagonal — every portrait phone — the whole group scales
       down to fit rather than the camera retreating further, which would shrink
       it on both axes instead of one. A hand-tuned multiplier here was cropping
       portrait by half the board. */
    baseZ = (HALF_Y * MARGIN) / TAN;
    const visHalfW = baseZ * TAN * aspect;
    root.scale.setScalar(Math.min(1, visHalfW / (HALF_X * MARGIN)));

    camera.position.set(0, 0, baseZ);
    camera.updateProjectionMatrix();
    calibrate();
  }

  /* p: 0 = assembled, 1 = fully exploded. The camera lifts and swings round as
     it opens, so you end up looking into the stack rather than at its edge. */
  function update(p) {
    const e = clamp01(p);
    for (const L of layers) {
      const t = easeOut(clamp01((e - L.delay) / (1 - L.delay)));
      L.obj.position.y = L.y0 + L.rise * t;
    }
    // Caps fan out slightly as they lift, so the top layer reads as separate
    // pieces rather than one sheet.
    const capT = easeOut(clamp01((e - 0.34) / 0.66));
    for (const cap of caps.children) {
      const i = cap.userData.i;
      const a = (i * 2.399) % (Math.PI * 2); // golden-angle scatter
      cap.rotation.x = capT * Math.sin(a) * 0.5;
      cap.rotation.z = capT * Math.cos(a) * 0.5;
    }

    /* Positive X rotation tips the key face TOWARD the camera. It was negative,
       which showed the underside of the case and hid every keycap behind the
       far edge. Starts steep so you read it as a keyboard, flattens as it opens
       so the separating layers are seen side-on, which is what makes an
       exploded view legible. */
    root.rotation.x = 0.86 - e * 0.56;
    root.rotation.y = -0.5 + e * 1.0;
    root.position.y = -e * 1.1;
    camera.position.z = baseZ * (1 + e * 0.22);
    // frameY pans the camera and its target together — a pure vertical shift,
    // so it re-centres the board without changing the viewing angle.
    camera.position.y = fit * (0.04 + e * 0.06) + frameY;
    camera.lookAt(0, e * 0.35 + frameY, 0);
  }

  /* Analytic framing gets close but not there: perspective magnifies whichever
     edge is tilted toward the camera, so the closed board hung below the frame
     even though its world-space extent fitted. Rather than tune constants
     against one screen size, sample the whole timeline, measure the real
     projected bounds, and correct distance and vertical pan until the worst
     stage sits inside. Runs once per resize. */
  function calibrate() {
    const SAFE = 0.9; // leave a tenth of the frame as breathing room

    /* What to sample. The teardown walks its whole timeline. The hero never
       leaves p=0, but it does drift and lean with the pointer, so it samples
       the extremes of that swing instead — calibrating only the rest pose let
       the board clip once it turned. */
    const poses = [];
    if (explode) {
      for (let i = 0; i <= 8; i += 1) poses.push({ e: i / 8 });
    } else {
      const SWING = 0.3 + 0.22; // idle drift + full pointer lean
      for (const dy of [-SWING, 0, SWING]) poses.push({ e: 0, ry: -0.5 + dy });
    }

    for (let pass = 0; pass < 8; pass += 1) {
      let lo = Infinity;
      let hi = -Infinity;
      let reach = 0;
      for (const pose of poses) {
        update(pose.e);
        if (pose.ry !== undefined) root.rotation.y = pose.ry;
        const b = screenBounds();
        lo = Math.min(lo, b.y0);
        hi = Math.max(hi, b.y1);
        reach = Math.max(reach, -b.x0, b.x1, -b.y0, b.y1);
      }
      // Re-centre vertically: NDC offset -> world units at the board plane.
      frameY += ((hi + lo) / 2) * baseZ * TAN;
      // Correct in BOTH directions. Only ever pushing back left the hero board
      // filling a third of its canvas, because the starting distance was sized
      // for an explosion the hero never plays.
      const k = reach / SAFE;
      if (Math.abs(k - 1) < 0.02) break;
      baseZ *= k;
    }
    update(0);
  }

  /* Hero pose: a slow drift either side of the three-quarter view, plus a
     little lean toward the pointer. Nothing here reads the scroll. */
  function idle(t, mx = 0, my = 0) {
    update(0);
    root.rotation.y = -0.5 + Math.sin(t * 0.00023) * 0.3 + mx * 0.22;
    root.rotation.x = 0.86 + Math.sin(t * 0.00017) * 0.05 + my * 0.1;
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
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
  update(0);
  render();

  /* Screen-space bounding box of everything, 0..1 of the canvas. Used by the
     tests to prove the board is actually inside the frame at every stage. */
  function screenBounds() {
    const v = new THREE.Vector3();
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.geometry) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      for (let i = 0; i < 8; i += 1) {
        v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
        o.localToWorld(v);
        v.project(camera);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
    });
    return { x0, x1, y0, y1 };
  }

  return { resize, update, idle, render, dispose, screenBounds };
}
