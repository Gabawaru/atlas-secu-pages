/**
 * ATLAS hero mark — classical kneeling Atlas + interactive Earth globe.
 * Character never animates. Globe auto-rotates; pointer/touch drag spins it.
 * Three.js via import map (CDN). Earth texture: /assets/earth-atmos.jpg
 *
 * Body (Gab look brief 2026-11-20): mythological Atlas silhouette —
 * muscular kneeling titan, beard, short curly hair, straining under the
 * globe on shoulders/back. Engraving / white-line-on-dark vibe.
 * Costume (Gab add-on): dark tailored armor/suit (pro-cyber finish) —
 * NOT bare loincloth-only classical nude. Head/beard stay classical.
 * Globe: points/arcs, rotate, drag — unchanged interaction.
 */
import * as THREE from 'three';

const TEAL = 0x2f8f8a;
const TEAL_DEEP = 0x1a5c58;
const GLOBE_R = 1.05;

/**
 * Proportions: body carries the globe (engraving scale), not planet-head.
 * Globe diameter ≈ upper torso; character reads as the titan under the weight.
 */
const CHAR_SCENE_SCALE = 1.15;
const GLOBE_SCENE_SCALE = 0.58;

/** Face — warmer mid-tone so beard/hair read against dark armor. */
const FLESH = 0x4a4540;
const FLESH_HIGH = 0x5c564e;
const HAIR = 0x1a1614;
/** Dark tailored armor / suit (pro-cyber). */
const ARMOR = 0x161c20;
const ARMOR_MID = 0x222a30;
const ARMOR_EDGE = 0x2e383e;
const BOOT = 0x0e1214;

function latLonToVec(latDeg, lonDeg, radius) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon)
  );
}

function makeArcCurve(a, b, radius) {
  const mid = a.clone().add(b).normalize().multiplyScalar(radius * 1.18);
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

function fleshMat(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: roughness == null ? 0.78 : roughness,
    metalness: metalness == null ? 0.08 : metalness
  });
}

/**
 * Classical kneeling Atlas in dark tailored armor (engraving pose).
 * Built once, never animated. Costume covers the body; face/beard stay classical.
 */
function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'atlas-character';

  const skin = fleshMat(FLESH, 0.82, 0.06);
  const skinHigh = fleshMat(FLESH_HIGH, 0.7, 0.1);
  const hairMat = fleshMat(HAIR, 0.95, 0.02);
  const armor = fleshMat(ARMOR, 0.55, 0.28);
  const armorMid = fleshMat(ARMOR_MID, 0.48, 0.32);
  const armorEdge = fleshMat(ARMOR_EDGE, 0.42, 0.38);
  const trim = new THREE.MeshStandardMaterial({
    color: TEAL_DEEP,
    emissive: TEAL,
    emissiveIntensity: 0.4,
    roughness: 0.35,
    metalness: 0.55
  });
  const bootMat = fleshMat(BOOT, 0.65, 0.2);

  // —— Cuirass / tailored jacket (muscular silhouette under armor) ——
  const ribcage = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), armor);
  ribcage.position.set(0, 0.72, 0.02);
  ribcage.scale.set(1.08, 0.88, 0.74);
  ribcage.rotation.x = 0.55;
  root.add(ribcage);

  // Chest plates (sculpted pecs as armor panels)
  function chestPlate(side) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), armorMid);
    p.position.set(side * 0.17, 0.84, 0.2);
    p.scale.set(1.15, 0.78, 0.65);
    p.rotation.x = 0.4;
    root.add(p);
  }
  chestPlate(-1);
  chestPlate(1);

  // Center sternum ridge + teal pipe
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.08), armorEdge);
  sternum.position.set(0, 0.72, 0.28);
  sternum.rotation.x = 0.45;
  root.add(sternum);

  const chestPipe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.3, 0.02), trim);
  chestPipe.position.set(0, 0.72, 0.33);
  chestPipe.rotation.x = 0.45;
  root.add(chestPipe);

  // Abdominal armor bands
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.26, 6, 14), armor);
  core.position.set(0, 0.48, 0.08);
  core.scale.set(1.08, 1, 0.72);
  core.rotation.x = 0.45;
  root.add(core);

  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.07), armorEdge);
    band.position.set(0, 0.42 - i * 0.09, 0.24);
    band.rotation.x = 0.35;
    root.add(band);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.02), trim);
    seam.position.set(0, 0.42 - i * 0.09, 0.28);
    seam.rotation.x = 0.35;
    root.add(seam);
  }

  // Back plate (globe rests here)
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), armor);
  back.position.set(0, 0.78, -0.14);
  back.scale.set(1.18, 0.72, 0.68);
  back.rotation.x = 0.5;
  root.add(back);

  // Pauldrons
  function pauldron(side) {
    const g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), armorMid);
    pad.scale.set(1.2, 0.75, 1.0);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.022, 8, 20, Math.PI * 1.2),
      trim
    );
    rim.rotation.y = Math.PI / 2;
    rim.rotation.z = side * 0.35;
    rim.position.set(side * 0.02, 0.02, 0.05);
    g.add(pad, rim);
    g.position.set(side * 0.42, 0.94, 0.02);
    root.add(g);
  }
  pauldron(-1);
  pauldron(1);

  // Gorget / collar under the beard
  const gorget = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 24), armorEdge);
  gorget.position.set(0.02, 0.88, 0.22);
  gorget.rotation.x = Math.PI / 2 + 0.35;
  gorget.scale.set(1.05, 0.9, 1);
  root.add(gorget);

  const collarTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.012, 6, 24, Math.PI),
    trim
  );
  collarTrim.position.set(0.02, 0.88, 0.22);
  collarTrim.rotation.x = Math.PI / 2 + 0.35;
  collarTrim.rotation.z = Math.PI;
  root.add(collarTrim);

  // —— Head tucked down (classical face — not armored) ——
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), skin);
  skull.position.set(0.02, 0.95, 0.28);
  skull.scale.set(0.95, 1.05, 1.0);
  skull.rotation.x = 0.85;
  root.add(skull);

  const hairRoot = new THREE.Group();
  hairRoot.position.copy(skull.position);
  hairRoot.rotation.x = 0.85;
  const curlOffsets = [
    [0, 0.16, 0], [0.1, 0.14, 0.06], [-0.1, 0.14, 0.06],
    [0.14, 0.1, -0.04], [-0.14, 0.1, -0.04], [0, 0.12, -0.12],
    [0.08, 0.08, 0.14], [-0.08, 0.08, 0.14], [0.12, 0.06, 0.08],
    [-0.12, 0.06, 0.08], [0.06, 0.14, -0.08], [-0.06, 0.14, -0.08],
    [0, 0.06, 0.18], [0.16, 0.04, 0], [-0.16, 0.04, 0]
  ];
  curlOffsets.forEach(function (o) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (Math.abs(o[0]) * 0.02), 10, 8), hairMat);
    c.position.set(o[0], o[1], o[2]);
    hairRoot.add(c);
  });
  root.add(hairRoot);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), hairMat);
  jaw.position.set(0.02, 0.82, 0.4);
  jaw.scale.set(1.1, 0.9, 1.2);
  jaw.rotation.x = 0.5;
  root.add(jaw);

  [
    [0, 0.72, 0.46], [0.08, 0.74, 0.42], [-0.08, 0.74, 0.42],
    [0.05, 0.68, 0.4], [-0.05, 0.68, 0.4], [0, 0.66, 0.38]
  ].forEach(function (o) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), hairMat);
    b.position.set(o[0], o[1], o[2]);
    root.add(b);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), skinHigh);
  nose.position.set(0.02, 0.9, 0.46);
  nose.rotation.x = 1.2;
  root.add(nose);

  // —— Armored arms + gauntlets, gripping globe ——
  function arm(side) {
    const g = new THREE.Group();

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.34, 6, 12), armor);
    upper.position.set(0, 0.18, 0);

    const bicepPlate = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), armorMid);
    bicepPlate.position.set(0, 0.12, 0.02);
    bicepPlate.scale.set(1.2, 0.9, 1.05);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), armorEdge);
    elbow.position.set(0, 0.36, 0.02);

    const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 6, 16), trim);
    elbowRing.position.set(0, 0.36, 0.02);
    elbowRing.rotation.x = Math.PI / 2;

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 12), armor);
    forearm.position.set(0, 0.52, 0.04);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 16), trim);
    cuff.position.set(0, 0.66, 0.05);
    cuff.rotation.x = Math.PI / 2;

    // Gauntlet (not bare hand)
    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.18), armorEdge);
    gauntlet.position.set(0, 0.74, 0.06);
    gauntlet.rotation.x = 0.35;

    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.05), trim);
    knuckle.position.set(0, 0.78, 0.12);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.055, 3, 6), armorMid);
      finger.position.set((f - 1.5) * 0.035, 0.82, 0.1);
      finger.rotation.x = 0.55;
      g.add(finger);
    }

    g.add(upper, bicepPlate, elbow, elbowRing, forearm, cuff, gauntlet, knuckle);

    g.position.set(side * 0.42, 0.88, 0.0);
    g.rotation.z = side * -0.35;
    g.rotation.x = -1.15;
    g.rotation.y = side * 0.35;
    return g;
  }
  root.add(arm(-1), arm(1));

  // —— Hip plate + armored skirt (replaces loincloth) ——
  const hip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), armor);
  hip.position.set(0, 0.28, 0.06);
  hip.scale.set(1.18, 0.72, 0.88);
  root.add(hip);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24), armorEdge);
  belt.position.set(0, 0.32, 0.06);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.05, 0.85, 1);
  root.add(belt);

  const beltTrim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 6, 24), trim);
  beltTrim.position.set(0, 0.32, 0.06);
  beltTrim.rotation.x = Math.PI / 2;
  beltTrim.scale.set(1.05, 0.85, 1);
  root.add(beltTrim);

  // Front armor apron / skirt panels
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.08), armorMid);
  apron.position.set(0, 0.12, 0.24);
  apron.rotation.x = 0.3;
  root.add(apron);

  const apronPipe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.02), trim);
  apronPipe.position.set(0, 0.12, 0.29);
  apronPipe.rotation.x = 0.3;
  root.add(apronPipe);

  function skirtPanel(side, zOff) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.2), armor);
    panel.position.set(side * 0.22, 0.1, zOff);
    panel.rotation.z = side * 0.12;
    root.add(panel);
  }
  skirtPanel(-1, 0.1);
  skirtPanel(1, 0.05);

  // —— Armored legs: right knee down, left foot planted ——
  const thighL = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.36, 6, 12), armor);
  thighL.position.set(-0.16, 0.22, 0.28);
  thighL.rotation.x = 0.95;
  thighL.rotation.z = 0.2;
  root.add(thighL);

  const quadL = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), armorMid);
  quadL.position.set(-0.16, 0.28, 0.22);
  quadL.scale.set(1.1, 0.85, 1.0);
  root.add(quadL);

  const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 6, 12), armor);
  shinL.position.set(-0.22, -0.08, 0.52);
  shinL.rotation.x = -0.15;
  root.add(shinL);

  const greaveL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.1), armorEdge);
  greaveL.position.set(-0.22, -0.1, 0.6);
  root.add(greaveL);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.34), bootMat);
  bootL.position.set(-0.22, -0.3, 0.62);
  root.add(bootL);

  const bootStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.04), trim);
  bootStripeL.position.set(-0.22, -0.24, 0.76);
  root.add(bootStripeL);

  const thighR = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.34, 6, 12), armor);
  thighR.position.set(0.22, 0.18, 0.05);
  thighR.rotation.x = 1.25;
  thighR.rotation.z = -0.35;
  root.add(thighR);

  const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), armorEdge);
  kneeR.position.set(0.32, -0.02, 0.28);
  root.add(kneeR);

  const kneeRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 6, 16), trim);
  kneeRing.position.set(0.32, -0.02, 0.28);
  kneeRing.rotation.y = Math.PI / 2;
  root.add(kneeRing);

  const shinR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 12), armor);
  shinR.position.set(0.38, -0.14, 0.18);
  shinR.rotation.x = 0.85;
  shinR.rotation.z = -0.25;
  root.add(shinR);

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.3), bootMat);
  bootR.position.set(0.42, -0.3, 0.02);
  bootR.rotation.y = -0.4;
  root.add(bootR);

  const bootStripeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.04), trim);
  bootStripeR.position.set(0.48, -0.24, 0.12);
  bootStripeR.rotation.y = -0.4;
  root.add(bootStripeR);

  // Ground shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 40),
    new THREE.MeshBasicMaterial({ color: 0x1a2226, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.05, -0.34, 0.2);
  root.add(shadow);

  root.traverse(function (obj) {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  return root;
}

function buildNetwork(globeGroup) {
  const nodes = [
    [48.8, 2.3],
    [43.7, 7.4],
    [51.5, -0.1],
    [40.7, -74],
    [37.8, -122.4],
    [35.7, 139.7],
    [1.3, 103.8],
    [-33.9, 151.2],
    [19.4, -99.1],
    [-23.5, -46.6],
    [25.2, 55.3],
    [28.6, 77.2],
    [55.8, 37.6],
    [-1.3, 36.8],
    [59.3, 18.1],
    [39.9, 116.4]
  ];

  const nodeMat = new THREE.MeshStandardMaterial({
    color: TEAL,
    emissive: TEAL,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2
  });
  const positions = [];

  nodes.forEach(function (pair) {
    const p = latLonToVec(pair[0], pair[1], GLOBE_R * 1.02);
    positions.push(p);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), nodeMat);
    dot.position.copy(p);
    globeGroup.add(dot);
  });

  const arcMat = new THREE.MeshBasicMaterial({
    color: TEAL,
    transparent: true,
    opacity: 0.55
  });

  const links = [
    [0, 1], [0, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
    [3, 8], [8, 9], [0, 10], [10, 11], [2, 12], [10, 13],
    [2, 14], [5, 15], [1, 10], [4, 6], [9, 13], [11, 6], [14, 12]
  ];

  links.forEach(function (pair) {
    const a = positions[pair[0]];
    const b = positions[pair[1]];
    if (!a || !b) return;
    const curve = makeArcCurve(a, b, GLOBE_R);
    const geo = new THREE.TubeGeometry(curve, 24, 0.008, 5, false);
    globeGroup.add(new THREE.Mesh(geo, arcMat));
  });
}

function buildGlobe(texture) {
  const group = new THREE.Group();
  group.name = 'atlas-globe';

  const earthMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.78,
    metalness: 0.05
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 64, 48), earthMat);
  group.add(earth);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R * 1.035, 48, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7eb8c8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    })
  );
  group.add(atmo);

  buildNetwork(group);
  return group;
}

function proceduralEarthTexture() {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a4a6e');
  grad.addColorStop(0.5, '#1f6f8a');
  grad.addColorStop(1, '#1a4a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#2d7a4f';
  function blob(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  blob(280, 200, 120, 80);
  blob(520, 180, 90, 70);
  blob(580, 280, 70, 100);
  blob(750, 240, 110, 60);
  blob(820, 320, 80, 50);
  blob(200, 320, 60, 90);
  blob(400, 380, 100, 40);
  blob(900, 180, 70, 55);

  ctx.fillStyle = 'rgba(232,240,242,0.85)';
  blob(520, 80, 180, 40);
  blob(200, 450, 200, 35);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {HTMLElement} host
 * @returns {{ dispose: () => void }}
 */
export function mountAtlasHeroMark(host) {
  if (!host) return { dispose: function () {} };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const width = function () { return Math.max(1, host.clientWidth); };
  const height = function () { return Math.max(1, host.clientHeight); };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width() / height(), 0.1, 40);
  camera.position.set(0.35, 0.55, 5.5);
  camera.lookAt(0.05, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width(), height(), false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  // Engraving read: cool hemi + strong rim (white-line on dark flesh)
  const hemi = new THREE.HemisphereLight(0xe8f2f4, 0x6a787c, 0.75);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(2.5, 4.5, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4c8, 0.4);
  fill.position.set(-2.5, 1.2, 1.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf0f7f8, 0.85);
  rim.position.set(-1.5, 2.0, -4.0);
  scene.add(rim);
  const kick = new THREE.DirectionalLight(0x7eb8b0, 0.25);
  kick.position.set(3, 0.5, -2);
  scene.add(kick);

  const mark = new THREE.Group();
  const character = buildCharacter();
  // Engraving profile: face toward brand text (−X), slight 3/4 toward camera
  character.rotation.y = Math.PI / 2 - 0.45;
  character.position.set(-0.05, -0.45, 0.05);
  character.scale.setScalar(CHAR_SCENE_SCALE);
  mark.add(character);

  /*
   * Globe on upper back / nape (engraving).
   * Back mass local ≈ (0, 0.78, -0.12); after yaw + scale, anchor slightly
   * above/behind shoulders so head tucks under the forward edge of the globe.
   */
  const globeAnchor = new THREE.Group();
  const effR = GLOBE_R * GLOBE_SCENE_SCALE;
  // World-ish shoulder/back height after character.y + scale
  const backY = -0.45 + 0.9 * CHAR_SCENE_SCALE;
  globeAnchor.position.set(0.15, backY + effR * 0.35, -0.05);
  mark.add(globeAnchor);

  let globe = null;
  let disposed = false;
  let raf = 0;

  const drag = {
    active: false,
    px: 0,
    py: 0,
    velX: 0,
    velY: 0,
    resumeAt: 0
  };
  const AUTO = reduceMotion ? 0 : 0.0032;

  function attachGlobe(texture) {
    if (disposed) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    globe = buildGlobe(texture);
    globe.scale.setScalar(GLOBE_SCENE_SCALE);
    globeAnchor.add(globe);
  }

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  loader.load(
    '/assets/earth-atmos.jpg',
    attachGlobe,
    undefined,
    function () {
      attachGlobe(proceduralEarthTexture());
    }
  );

  function onPointerDown(e) {
    drag.active = true;
    drag.px = e.clientX;
    drag.py = e.clientY;
    drag.velX = 0;
    drag.velY = 0;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.active || !globe) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    drag.px = e.clientX;
    drag.py = e.clientY;
    const sens = 0.0055;
    globe.rotation.y += dx * sens;
    globe.rotation.x += dy * sens;
    globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
    drag.velX = dx * sens;
    drag.velY = dy * sens;
  }
  function onPointerUp(e) {
    drag.active = false;
    drag.resumeAt = performance.now() + 900;
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', onPointerUp);

  function onResize() {
    const w = width();
    const h = height();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(host);
  else window.addEventListener('resize', onResize);

  scene.add(mark);

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (globe) {
      if (!drag.active) {
        if (Math.abs(drag.velX) > 0.00005 || Math.abs(drag.velY) > 0.00005) {
          globe.rotation.y += drag.velX;
          globe.rotation.x += drag.velY;
          globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
          drag.velX *= 0.94;
          drag.velY *= 0.94;
        } else if (now >= drag.resumeAt) {
          globe.rotation.y += AUTO;
        }
      }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  return {
    dispose: function () {
      disposed = true;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerUp);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
          else obj.material.dispose();
        }
      });
    }
  };
}

if (typeof document !== 'undefined') {
  const host = document.getElementById('atlas-hero-mark');
  if (host) mountAtlasHeroMark(host);
}
