/**
 * ATLAS hero mark — static cyber-pro figure + interactive Earth globe.
 * Character never animates. Globe auto-rotates; pointer/touch drag spins it.
 * Three.js via import map (CDN). Earth texture: /assets/earth-atmos.jpg
 */
import * as THREE from 'three';

const TEAL = 0x2f8f8a;
const TEAL_DEEP = 0x1f6f6b;
const INK = 0x2a3d45;
const JACKET = 0x243038;
const JACKET_SOFT = 0x354650;
const SKIN = 0xc4a882;
const GLOBE_R = 1.05;
/**
 * Scale-only fix (Gab 2026-11-20 mobile bug): globe was ~body-sized → “planet head”.
 * Character mesh/style unchanged — body redesign waits on Gab look brief + sketch.
 * Effective globe R ≈ GLOBE_R * GLOBE_SCENE_SCALE ≈ shoulder span.
 */
const CHAR_SCENE_SCALE = 1.2;
const GLOBE_SCENE_SCALE = 0.5;

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

/** Stylized kneeling cyber-pro — built once, never posed/animated. */
function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'atlas-character';

  const jacketMat = new THREE.MeshStandardMaterial({
    color: JACKET,
    roughness: 0.72,
    metalness: 0.08
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: TEAL_DEEP,
    roughness: 0.55,
    metalness: 0.15
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: SKIN,
    roughness: 0.85,
    metalness: 0
  });
  const pantMat = new THREE.MeshStandardMaterial({
    color: JACKET_SOFT,
    roughness: 0.8,
    metalness: 0.05
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1a2428,
    roughness: 0.7,
    metalness: 0.1
  });

  // Torso — tech jacket
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.42, 6, 12), jacketMat);
  torso.position.set(0, 0.55, 0.05);
  torso.rotation.x = 0.18;
  root.add(torso);

  // Hood / head
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), jacketMat);
  hood.position.set(0, 1.02, 0.08);
  hood.scale.set(1.05, 0.95, 1.1);
  root.add(hood);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skinMat);
  face.position.set(0, 0.98, 0.18);
  face.scale.set(0.95, 1.05, 0.85);
  root.add(face);

  // Collar / badge strip (cyber accent)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24, Math.PI), trimMat);
  collar.position.set(0, 0.82, 0.12);
  collar.rotation.x = Math.PI / 2;
  collar.rotation.z = Math.PI;
  root.add(collar);

  // Arms raised, cradling globe
  function arm(side) {
    const g = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), jacketMat);
    upper.position.set(0, 0.16, 0);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 4, 8), jacketMat);
    forearm.position.set(0, 0.42, 0.02);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skinMat);
    hand.position.set(0, 0.62, 0.04);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 16), trimMat);
    cuff.position.set(0, 0.52, 0.02);
    cuff.rotation.x = Math.PI / 2;
    g.add(upper, forearm, hand, cuff);
    g.position.set(side * 0.38, 0.72, 0.05);
    g.rotation.z = side * -0.55;
    g.rotation.x = -0.85;
    g.rotation.y = side * 0.25;
    return g;
  }
  root.add(arm(-1), arm(1));

  // Kneeling legs (primary sketch pose)
  const thighL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.32, 4, 8), pantMat);
  thighL.position.set(-0.16, 0.18, 0.18);
  thighL.rotation.x = Math.PI / 2.2;
  thighL.rotation.z = 0.15;
  root.add(thighL);

  const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), pantMat);
  shinL.position.set(-0.2, -0.08, 0.42);
  shinL.rotation.x = 0.2;
  root.add(shinL);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), bootMat);
  bootL.position.set(-0.2, -0.28, 0.52);
  root.add(bootL);

  const thighR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 8), pantMat);
  thighR.position.set(0.22, 0.12, -0.05);
  thighR.rotation.x = 1.15;
  thighR.rotation.z = -0.35;
  root.add(thighR);

  const shinR = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 4, 8), pantMat);
  shinR.position.set(0.38, -0.12, 0.22);
  shinR.rotation.x = 0.35;
  shinR.rotation.z = -0.2;
  root.add(shinR);

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), bootMat);
  bootR.position.set(0.42, -0.28, 0.38);
  root.add(bootR);

  // Soft ground contact shadow (static disc)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshBasicMaterial({ color: 0x2a3d45, transparent: true, opacity: 0.12 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.32;
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
    [48.8, 2.3], // Paris
    [43.7, 7.4], // Monaco-ish
    [51.5, -0.1], // London
    [40.7, -74], // NYC
    [37.8, -122.4], // SF
    [35.7, 139.7], // Tokyo
    [1.3, 103.8], // Singapore
    [-33.9, 151.2], // Sydney
    [19.4, -99.1], // Mexico City
    [-23.5, -46.6], // Sao Paulo
    [25.2, 55.3], // Dubai
    [28.6, 77.2], // Delhi
    [55.8, 37.6], // Moscow
    [-1.3, 36.8], // Nairobi
    [59.3, 18.1], // Stockholm
    [39.9, 116.4] // Beijing
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
  // Rough continent blobs
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
  const camera = new THREE.PerspectiveCamera(36, width() / height(), 0.1, 40);
  camera.position.set(0, 0.55, 5.2);
  camera.lookAt(0, 0.35, 0);

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

  const hemi = new THREE.HemisphereLight(0xf0f7f8, 0xb8c8cc, 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(3.2, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8d4d0, 0.45);
  fill.position.set(-3, 1.5, -2);
  scene.add(fill);

  const mark = new THREE.Group();
  const character = buildCharacter();
  character.position.set(0, -0.5, 0);
  character.scale.setScalar(CHAR_SCENE_SCALE);
  mark.add(character);

  // Shoulder carry: globe diameter ≈ shoulders, not a planet-head on the neck.
  const globeAnchor = new THREE.Group();
  const shoulderY = -0.5 + 0.85 * CHAR_SCENE_SCALE;
  const effR = GLOBE_R * GLOBE_SCENE_SCALE;
  globeAnchor.position.set(0, shoulderY + effR * 0.45, 0.02);
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
        // light inertia after drag
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
