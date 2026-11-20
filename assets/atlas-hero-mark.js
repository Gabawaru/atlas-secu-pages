/**
 * ATLAS hero mark — hybrid:
 *   • Character = static 2D engraving PNG (classical kneeling Atlas + armor overlay)
 *   • Globe = interactive Three.js Earth (auto-rotate + drag; nodes/arcs)
 *
 * Gab 2026-11-20: not obligated to use a 3D body. Match engraving ref.
 * Character never animates. Earth texture: /assets/earth-atmos.jpg
 */
import * as THREE from 'three';

const TEAL = 0x2f8f8a;
const GLOBE_R = 1.0;
/** Matches engraved globe size on the circular plate (~half the plate). */
const GLOBE_SCENE_SCALE = 0.95;
const FIGURE_URL = '/assets/atlas-figure-engraving.png';

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

function buildNetwork(globeGroup) {
  const nodes = [
    [48.8, 2.3], [43.7, 7.4], [51.5, -0.1], [40.7, -74],
    [37.8, -122.4], [35.7, 139.7], [1.3, 103.8], [-33.9, 151.2],
    [19.4, -99.1], [-23.5, -46.6], [25.2, 55.3], [28.6, 77.2],
    [55.8, 37.6], [-1.3, 36.8], [59.3, 18.1], [39.9, 116.4]
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
    globeGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, 0.008, 5, false),
      arcMat
    ));
  });
}

function buildGlobe(texture) {
  const group = new THREE.Group();
  group.name = 'atlas-globe';

  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R, 64, 48),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.78,
      metalness: 0.05
    })
  ));

  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_R * 1.035, 48, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7eb8c8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    })
  ));

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
  const camera = new THREE.PerspectiveCamera(30, width() / height(), 0.1, 40);
  camera.position.set(0, 0.08, 5.4);
  camera.lookAt(0, 0.08, 0);

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

  const hemi = new THREE.HemisphereLight(0xf4f8f9, 0x7a8a8e, 0.95);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2.2, 3.5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8d0cc, 0.4);
  fill.position.set(-2.5, 1, 1.5);
  scene.add(fill);

  const mark = new THREE.Group();

  // —— 2D engraving figure (static) ——
  const plateSize = 3.35;
  const figureMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    opacity: 1
  });
  const figureMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(plateSize, plateSize),
    figureMat
  );
  figureMesh.position.set(0, 0, 0);
  figureMesh.name = 'atlas-engraving';
  mark.add(figureMesh);

  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');
  texLoader.load(
    FIGURE_URL,
    function (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      figureMat.map = tex;
      figureMat.needsUpdate = true;
    }
  );

  /*
   * Interactive globe covers the engraved globe on the plate.
   * Engraved sphere sits in the upper half of the circular plate.
   */
  const globeAnchor = new THREE.Group();
  const effR = GLOBE_R * GLOBE_SCENE_SCALE;
  globeAnchor.position.set(0.02, plateSize * 0.18, 0.28);
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

  texLoader.load(
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
