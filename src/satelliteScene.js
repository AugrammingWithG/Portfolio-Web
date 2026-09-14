/* ==========================================================================
   SATELLITE — the hero object, and the flight that carries you into
   Selected Work.

   Ported from satellite-hero-reference.html. The silhouette, the rest and
   apart poses of every part, and the camera move are the reference's numbers,
   unchanged. Read that file before editing any constant in here.

   NO PLANETS. The reference ends its flight by swinging a planet in, and this
   file used to do that six times over from projects.json. Selected Work is a
   planet system you can drag and open now, so the flight was arriving at a
   set of planets a screen before the real ones — the same six projects, twice,
   the second time interactive. The arrival was removed rather than the
   section: what the hero owes the page is the satellite coming apart and the
   trip forward, and Selected Work is the arrival.

   What is left that the reference did not have:

     * the parts fade to nothing as they recede. The reference leans on
       FogExp2 alone, which tints geometry toward a colour but never toward
       transparent — over this site's brass-and-teal nebula that read as a
       flat dark patch sliding backwards. Fog still carries the depth cue;
       opacity is what actually dissolves them into the background.
     * a deterministic scatter for the solar cells, so the satellite comes
       apart into the same shape on every load

   Loaded through a dynamic import, so three.js stays out of the initial
   bundle and arrives as its own chunk.
   ========================================================================== */

import { PROCESS } from "./process.js";

const GOLD = 0xb8892b; // the site's one accent, and the reference's
const GOLD_HI = 0xe0a838;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t) => t * t * (3 - 2 * t); // the reference's smoothstep

/* The reference scatters the solar cells with Math.random(), so it comes
   apart differently on every reload. Same spread, seeded, so the shape is
   fixed and reviewable. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* The timeline, in the reference's terms:
     0    .. HALF   the satellite comes apart
     HALF .. 1      the pieces recede and dissolve, the camera eases forward
   HALF is the reference's 0.5. The pieces are gone by about 0.88, and the
   last stretch is the approach — the hero's own sky, and then Selected Work
   rising into it. */
const HALF = 0.5;

/* How long a step's caption spends fading in and out, in progress units. The
   windows in process.js overlap by about this much, so one step is always
   handing over to the next instead of the margin blinking empty. */
const NOTE_FADE = 0.06;

function windowAlpha(p, a, b) {
  if (p <= a || p >= b) return 0;
  return ease(Math.min(clamp01((p - a) / NOTE_FADE), clamp01((b - p) / NOTE_FADE)));
}

export async function createScene(canvas) {
  const THREE = await import("three");

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const E = (x, y, z) => new THREE.Euler(x, y, z);

  const scene = new THREE.Scene();

  /* Warm, not the reference's blue-black 0x0d0f13. The nebula behind this
     canvas is brass falling into teal; a cool fog put a grey cast on the
     pieces as they went back, which is the seam the opacity fade below
     exists to avoid. Density is a touch lower for the same reason — the fade
     is doing the work fog was doing. */
  scene.fog = new THREE.FogExp2(0x140f08, 0.026);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  const CAM0 = V(0, 1.1, 11);
  const CAM1 = V(0, 0.4, 6);
  camera.position.copy(CAM0);
  camera.lookAt(0, 0, 0);

  /* Transparent, so the hero's aurora, milky way and flow-field stars show
     straight through. The reference already sets this up; it is kept as is. */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);

  /* ---- lights ------------------------------------------------------------ *
     THE SAME LIGHTS THE REFERENCE HAS, converted. Do not copy its numbers
     back in.

     The reference is built on three r128, this project is on r185, and the
     units changed in between. Point and spot lights are physical now: their
     intensity is divided by 4π, and `decay` defaults to 2 instead of 1. Port
     `new PointLight(GOLD, 1.1, 50)` across unchanged and it arrives at about
     a twelfth of its brightness with a far steeper falloff — which is what
     happened first time round. The satellite lit only by the leftover ambient
     and key came out near-black, and against this site's brass wash a
     near-black object is not a silhouette, it is nothing.

     So: point intensities are multiplied by 4π and decay is pinned back to 1,
     which reproduces r128 exactly. Colours, positions and ranges are the
     reference's, untouched. Ambient and directional lights did not change
     units; they are lifted a little because they are now carrying an object
     that sits over a lit background rather than a near-black one.           */
  const R128 = 4 * Math.PI; // point-light intensity, r128 -> r185

  scene.add(new THREE.AmbientLight(0x3a4048, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 5);
  scene.add(key);

  const goldLight = new THREE.PointLight(GOLD, 1.1 * R128, 50, 1);
  goldLight.position.set(-7, 2, 4);
  scene.add(goldLight);

  /* Teal fill. Gold is the only accent on this site, but blue and teal are
     what the ambient light is already made of — see the note at the top of
     styles.css — so a cool fill is inside the palette, not beside it. */
  const fill = new THREE.PointLight(0x2f7d8c, 0.9 * R128, 50, 1);
  fill.position.set(8, -2, -3);
  scene.add(fill);

  /* Depth star field. The page already has stars behind this canvas, so this
     one sits low at rest and only lifts once the fly-in starts — that is the
     parallax the reference wanted it for, without doubling the hero's own sky
     while you are still reading the headline. */
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.09,
    transparent: true,
    opacity: 0.16,
  });
  {
    const g = new THREE.BufferGeometry();
    const n = 800;
    const pos = new Float32Array(n * 3);
    const rand = rng(9187);
    for (let i = 0; i < n; i += 1) {
      const r = 25 + rand() * 45;
      const a = rand() * 6.28;
      const b = Math.acos(2 * rand() - 1);
      pos[i * 3] = r * Math.sin(b) * Math.cos(a);
      pos[i * 3 + 1] = r * Math.sin(b) * Math.sin(a);
      pos[i * 3 + 2] = r * Math.cos(b);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, starMat));
  }

  /* ---- the jump ---------------------------------------------------------- *
     A second, streaming field for the hand-over, separate from the shell
     above. A tube of stars around the line of flight that exists only while
     `warp` is up (warpAt() in useSatelliteFlight.js). Each star is drawn
     twice: a head (Points) and a tail (LineSegments) that runs away from the
     camera along z, so on screen every tail points back at the vanishing
     point and the field reads as streaming past. Tail length and speed both
     follow warp; at 0 the field is hidden and costs nothing.

     The stars really move. It is the one stateful thing in this file, on
     purpose: a jump you can pause halfway through and see frozen is not a
     jump. Everything else here is still a pure function of progress.

     Warm white, not gold — gold is the one accent and it is the bloom's. The
     fog does the rest: the far end of the tube goes dark on its own, which
     is what makes it read as depth rather than lines painted on the glass. */
  const JUMP_N = 480;
  const JUMP_FAR = -64;
  const JUMP_NEAR = 9;
  const jumpPos = new Float32Array(JUMP_N * 3);
  const jumpSeg = new Float32Array(JUMP_N * 6);
  {
    const rand = rng(4421);
    for (let i = 0; i < JUMP_N; i += 1) {
      const r = 1.2 + Math.pow(rand(), 0.7) * 13;
      const a = rand() * 6.28;
      jumpPos[i * 3] = Math.cos(a) * r;
      jumpPos[i * 3 + 1] = Math.sin(a) * r * 0.75;
      jumpPos[i * 3 + 2] = JUMP_FAR + rand() * (JUMP_NEAR - JUMP_FAR);
    }
  }
  const jumpHeadGeo = new THREE.BufferGeometry();
  jumpHeadGeo.setAttribute("position", new THREE.BufferAttribute(jumpPos, 3));
  const jumpHeadMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.07,
    transparent: true,
    opacity: 0,
  });
  const jumpHeads = new THREE.Points(jumpHeadGeo, jumpHeadMat);
  const jumpTailGeo = new THREE.BufferGeometry();
  jumpTailGeo.setAttribute("position", new THREE.BufferAttribute(jumpSeg, 3));
  const jumpTailMat = new THREE.LineBasicMaterial({
    color: 0xf1e6cc,
    transparent: true,
    opacity: 0,
  });
  const jumpTails = new THREE.LineSegments(jumpTailGeo, jumpTailMat);
  jumpHeads.visible = false;
  jumpTails.visible = false;
  jumpHeads.frustumCulled = false;
  jumpTails.frustumCulled = false;
  scene.add(jumpHeads);
  scene.add(jumpTails);
  let jumpClock = 0;

  function stepJump(warp) {
    const on = warp > 0.002;
    jumpHeads.visible = on;
    jumpTails.visible = on;
    if (!on) {
      jumpClock = 0;
      return;
    }
    // Frame-rate independent: a throttled tab must not turn into a slideshow
    // of teleporting stars, so the step is clamped to three frames' worth.
    const now = performance.now();
    const dt = jumpClock ? Math.min(3, (now - jumpClock) / 16.7) : 1;
    jumpClock = now;
    const speed = warp * 0.55 * dt;
    const len = warp * 5;
    const wrap = JUMP_NEAR - JUMP_FAR;
    for (let i = 0; i < JUMP_N; i += 1) {
      let z = jumpPos[i * 3 + 2] + speed;
      if (z > JUMP_NEAR) z -= wrap;
      jumpPos[i * 3 + 2] = z;
      const x = jumpPos[i * 3];
      const y = jumpPos[i * 3 + 1];
      const o = i * 6;
      jumpSeg[o] = x;
      jumpSeg[o + 1] = y;
      jumpSeg[o + 2] = z;
      jumpSeg[o + 3] = x;
      jumpSeg[o + 4] = y;
      jumpSeg[o + 5] = z - len;
    }
    jumpHeadGeo.attributes.position.needsUpdate = true;
    jumpTailGeo.attributes.position.needsUpdate = true;
    jumpHeadMat.opacity = warp * 0.9;
    jumpTailMat.opacity = warp * 0.55;
  }

  /* The satellite hangs off one group, so it can sit in the column the
     keyboard used to occupy and drift back to centre once the flight starts.
     The stars stay put — they are the sky, not cargo. */
  const world = new THREE.Group();
  scene.add(world);

  /* ---- materials --------------------------------------------------------- *
     transparent on all four, because these are the ones that dissolve. They
     are shared across every part, so the whole satellite fades as one.      */
  const satMats = [
    new THREE.MeshStandardMaterial({
      color: 0x24262b,
      roughness: 0.72,
      metalness: 0.35,
      transparent: true,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x1a1c20,
      roughness: 0.6,
      metalness: 0.4,
      transparent: true,
    }),
    new THREE.MeshStandardMaterial({
      color: GOLD,
      roughness: 0.42,
      metalness: 0.65,
      emissive: GOLD,
      emissiveIntensity: 0.18,
      transparent: true,
    }),
    new THREE.MeshStandardMaterial({
      color: GOLD_HI,
      roughness: 0.35,
      metalness: 0.7,
      emissive: GOLD,
      emissiveIntensity: 0.3,
      transparent: true,
    }),
  ];
  const [matDark, matPanel, matGold, matGoldHi] = satMats;

  /* ---- satellite --------------------------------------------------------- */
  const sat = new THREE.Group();
  const parts = [];
  /* Tagged parts, for the annotation layer to point at. Only the five named
     in process.js are in here; everything else is scenery and is never looked
     up. A tag that does not resolve parks its note at zero opacity rather
     than throwing — see the projection at the foot of update(). */
  const anchors = new Map();
  world.add(sat);

  function addPart(mesh, rest, apart, tag) {
    mesh.position.copy(rest.p);
    if (rest.r) mesh.rotation.copy(rest.r);
    mesh.userData = {
      rp: rest.p.clone(),
      rr: rest.r || new THREE.Euler(),
      ap: apart.p.clone(),
      ar: apart.r || rest.r || new THREE.Euler(),
    };
    sat.add(mesh);
    parts.push(mesh);
    if (tag) anchors.set(tag, mesh);
  }

  {
    const rand = rng(4241);

    addPart(
      new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 1.6), matDark),
      { p: V(0, 0.28, 0) },
      { p: V(0, 1.7, 0), r: E(0, 0.3, 0) },
      "top"
    );
    addPart(
      new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 1.6), matPanel),
      { p: V(0, -0.28, 0) },
      { p: V(0, -1.7, 0), r: E(0, -0.3, 0) },
      "base"
    );
    addPart(
      new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 1.25), matGold),
      { p: V(0, 0, 0) },
      { p: V(0, 0, 0), r: E(0, 0.6, 0) },
      "core"
    );

    const cols = 3;
    const rows = 4;
    const cw = 0.62;
    const ch = 0.62;
    const gap = 0.05;

    [-1, 1].forEach((side) => {
      const baseX = side * 1.35;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const isGold = (r * cols + c) % 5 === 0;
          const cell = new THREE.Mesh(
            new THREE.BoxGeometry(cw, 0.09, ch),
            isGold ? matGoldHi : matPanel
          );
          const rx = baseX + side * (c * (cw + gap));
          const rz = (r - (rows - 1) / 2) * (ch + gap);
          addPart(
            cell,
            { p: V(rx, 0, rz) },
            {
              p: V(
                side * (4.6 + c * 1.15) + (rand() - 0.5) * 0.4,
                (rand() - 0.5) * 1.6,
                rz * 1.9 + (rand() - 0.5) * 0.6
              ),
              r: E(rand() * 0.6 - 0.3, rand() * 0.8, rand() * 0.6 - 0.3),
            },
            /* One cell carries a note, and it has to be one that ends up on
               the OPPOSITE side to its caption — step 5 sits in the left
               margin, so a cell flying out left would drag the leader line
               back underneath its own text. This one flies out right, which
               makes the longest line on the page and the only one that
               crosses the object, which is the whole look. */
            side === 1 && r === 1 && c === 0 ? "cell" : null
          );
        }
      }
    });

    addPart(
      new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.4, 20, 1, true), matDark),
      { p: V(0, 0.9, 0.2), r: E(Math.PI, 0, 0) },
      { p: V(0, 3.4, 1.2), r: E(Math.PI * 0.7, 0.4, 0) },
      "dish"
    );
    addPart(
      new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), matGold),
      { p: V(0, 0.7, 0.2) },
      { p: V(0.4, 3.0, 1.6), r: E(0.5, 0, 0.3) }
    );
  }

  /* ---- framing ----------------------------------------------------------- */
  const TAN = Math.tan(((42 / 2) * Math.PI) / 180);
  /* The satellite's widest half-extent at rest: the solar wings reach about
     2.7 units either side of centre. resize() measures the frustum against
     this to decide whether the object has to shrink to fit. */
  const SAT_HALF_W = 2.7;
  let offsetX = 0;
  let offsetY = 0;
  let worldScale = 1;

  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    /* ---- fitting the satellite to the screen ----------------------------
       Three numbers, and only the first is a taste call.

       X: wide screens put the satellite in the column the keyboard used to
       occupy, so it clears the headline instead of hanging behind it. Narrow
       screens have no such column, so it stays centred. Either way the offset
       eases back to centre once the flight starts — see update().

       SCALE is derived, not guessed. The satellite is about 5.4 units across
       at rest, and a portrait phone can only see about 3.9 units at the
       camera's resting distance — so at full size the wings ran off both
       edges of the screen. This measures the frustum and shrinks the object
       until it fits inside 78% of it, which leaves desktop untouched (it has
       room to spare and clamps to 1) and scales everything narrower on a
       curve rather than at a breakpoint.

       Y lifts it into the box hero.css reserves above the copy on narrow
       screens. Small numbers: the box is only a little above centre, and the
       object is smaller there anyway. This pairs with the reserved height in
       hero.css's max-width:900 block — change one and check the other, or the
       satellite lands on the headline. */
    const visHalfH = CAM0.z * TAN;
    const visHalfW = visHalfH * camera.aspect;

    offsetX = camera.aspect > 1.25 ? 1.5 : 0;
    worldScale = Math.min(1, (visHalfW * 0.78) / SAT_HALF_W);

    if (camera.aspect < 0.7) offsetY = 0.55;
    else if (camera.aspect < 0.95) offsetY = 0.3;
    else offsetY = 0;
  }

  /* ---- the timeline ------------------------------------------------------ *
     e is 0..1 across the hero -> Selected Work scroll range. From the parts
     loop down to the camera lookAt this is the reference's animate(), line
     for line; the chase that feeds it lives in useSatelliteFlight.js, so this
     module stays a pure function of progress.                               */
  const tmp = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  /* One slot per step in process.js, mutated in place every frame. x and y are
     the anchor's position on screen as viewport percentages — where the leader
     line ENDS. Where it starts is fixed copy in process.js, so only these move.
     They keep their last position while o is 0; nothing reads them then. */
  const state = {
    glow: 0,
    glowX: 50,
    glowScale: 1,
    heroFade: 1,
    skyFade: 1,
    p: 0,
    notes: PROCESS.map(() => ({ x: 50, y: 50, o: 0 })),
  };

  /* `space` is how far the hand-over ground has come up (groundAt() in
     useSatelliteFlight.js). The star field brightens and swells with it: at
     0.5 opacity these stars are a sky behind the aurora, but over the flat
     near-black of the hand-over they all but vanish and the frame reads as
     empty. Pushed toward the planet scene's own field (size 0.09, opacity
     0.55) so the two cross-fade as the same stars rather than a faint set
     cutting to a bright one. */
  /* `warp` is the jump, 0..1 (warpAt() in useSatelliteFlight.js): it
     streams the tube of stars, and it flares and swells the bloom. */
  function update(e, space = 0, warp = 0) {
    const cur = clamp01(e);
    stepJump(warp);
    const seg1 = clamp01(cur / HALF);
    const seg2 = ease(clamp01((cur - HALF) / (1 - HALF)));

    for (const m of parts) {
      const d = m.userData;
      tmp.lerpVectors(d.rp, d.ap, seg1);
      m.position.copy(tmp);
      m.rotation.set(
        d.rr.x + (d.ar.x - d.rr.x) * seg1,
        d.rr.y + (d.ar.y - d.rr.y) * seg1,
        d.rr.z + (d.ar.z - d.rr.z) * seg1
      );
    }
    /* 22, not the reference's 34. At 34 the pieces were specks by two thirds
       of the way down the runway and the last third was empty sky; the point
       of the recession is to still be watchable when the planets take over. */
    sat.position.z = -seg2 * 22;
    sat.rotation.y += 0.0032 * (1 - seg1 * 0.6);
    sat.rotation.x = -0.12 + seg1 * 0.05;

    camera.position.lerpVectors(CAM0, CAM1, seg2);
    camera.lookAt(0, -seg2 * 0.3, seg2 * -1.5);

    /* The dissolve. Solid while it is still the hero's object, gone by the
       time it would be a speck — so what recedes into the nebula is the
       nebula, not a dark shape laid over it. */
    /* On the raw progress, not seg2, so it reads as a place on the runway:
       solid to 0.8, gone at 0.99 — as Selected Work pins
       and the planets start out of the same dark. */
    const satFade = 1 - ease(clamp01((cur - 0.8) / 0.19));
    for (const m of satMats) m.opacity = satFade;
    sat.visible = satFade > 0.004;

    world.position.set(offsetX * (1 - seg2), offsetY * (1 - seg2 * 0.5), 0);
    world.scale.setScalar(worldScale);
    starMat.opacity = 0.16 + seg2 * 0.34 + space * 0.35;
    starMat.size = 0.09 * (1 + space * 0.9);

    /* ---- the annotation layer ------------------------------------------- *
       Each step's caption is a fixed point in the margin; the end of its
       leader line is a real part of the satellite, projected to the screen.
       That is the whole trick — the line is what makes the label read as
       pointing AT something rather than floating near it.

       Alphas first, geometry only if something is actually on screen: for the
       stretch before 0.08 and after 0.76 there is no note up, and projecting
       five anchors for nobody costs a full matrix walk every frame.

       satFade gates the lot. The parts start dissolving at progress 0.61, and
       a leader line still pointing confidently at a part that has faded out
       from under it is the one failure mode this layer has.                 */
    let live = false;
    for (let i = 0; i < PROCESS.length; i += 1) {
      const a = windowAlpha(cur, PROCESS[i].in, PROCESS[i].out) * clamp01(satFade * 2.2);
      state.notes[i].o = a;
      if (a > 0.001) live = true;
    }
    if (live) {
      // project() reads camera.matrixWorldInverse, and the parts moved above.
      // render() would refresh both, but it has not run yet this frame.
      camera.updateMatrixWorld();
      world.updateMatrixWorld(true);
      for (let i = 0; i < PROCESS.length; i += 1) {
        const slot = state.notes[i];
        if (slot.o <= 0.001) continue;
        const mesh = anchors.get(PROCESS[i].anchor);
        if (!mesh) {
          slot.o = 0; // an anchor name that does not resolve, rather than a throw
          continue;
        }
        mesh.getWorldPosition(ndc).project(camera);
        if (ndc.z > 1) {
          slot.o = 0; // behind the camera: NDC wraps and the line would invert
          continue;
        }
        slot.x = (ndc.x * 0.5 + 0.5) * 100;
        slot.y = (0.5 - ndc.y * 0.5) * 100;
      }
    }

    /* What the DOM layers read. Neither goes through React: both are written
       straight onto their element, and both move every frame. */
    state.p = cur;
    /* The reference's `1 - progress * 2.4`. It matters more here than it did
       there: the hero is stuck to the top of its runway, so the copy does not
       scroll away on its own — without this the solar cells fly out across the
       headline and sit on it for the rest of the block. Clear by cur ~0.42. */
    state.heroFade = clamp01(1 - cur * 2.4);
    /* The hero's sky — aurora, milky way, gold current — goes out under the
       receding satellite, so by the time Selected Work slides in beneath this
       layer both sides of its edge are the same near-black and the stars
       here are the only sky. hero.css reads it as --sky-fade. */
    state.skyFade = 1 - ease(clamp01((cur - 0.62) / 0.22));
    state.glow = clamp01(Math.max(0.14 + seg1 * 0.7 * (1 - seg2 * 0.86), warp * 0.8));
    state.glowScale = 1 + warp * 0.6;
    state.glowX = 50 + ((offsetX * (1 - seg2)) / (camera.position.z * TAN * camera.aspect)) * 50;
    /* The layer's own fade is NOT computed here. It is the hand-over to
       Selected Work, so it has to track the real scroll rather than the eased
       value this function runs on — see useSatelliteFlight.js. Easing it left
       the satellite painting over the planet system for as long as the chase
       took to catch up, which is very visible on a jump to #work. */
    return state;
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

  return { resize, update, render, dispose, state };
}
