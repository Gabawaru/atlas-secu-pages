/**
 * ATLAS hero mark — interactive Three.js Earth
 *   (drag + inertia; teal nodes/arcs). No engraving figure.
 *
 * Gab 2026-11-20: character removed; ritual v2 hooks for scale / auto-rotate / drag.
 * Earth texture: /assets/earth-atmos.jpg
 */
import * as THREE from 'three';

const TEAL = 0x2f8f8a;
const GLOBE_R = 1.0;
/** Fits the circular hero orb with breathing room for drag. */
const GLOBE_SCENE_SCALE = 1.12;
const DEFAULT_CAM_Z = 4.35;

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
  const nodeMeshes = [];
  const arcMeshes = [];

  nodes.forEach(function (pair) {
    const p = latLonToVec(pair[0], pair[1], GLOBE_R * 1.02);
    positions.push(p);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), nodeMat);
    dot.position.copy(p);
    globeGroup.add(dot);
    nodeMeshes.push(dot);
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
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, 0.008, 5, false),
      arcMat.clone()
    );
    globeGroup.add(mesh);
    arcMeshes.push(mesh);
  });

  return { nodeMeshes, arcMeshes, nodeMat, arcMat };
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

  const network = buildNetwork(group);
  group.userData.network = network;
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
 * @param {{
 *   autoRotate?: boolean,
 *   autoRotateSpeed?: number,
 *   onSignificantDrag?: (deg: number) => void,
 *   significantDragDeg?: number,
 * }} [options]
 * @returns {object}
 */
export function mountAtlasHeroMark(host, options) {
  if (!host) {
    return {
      dispose: function () {},
      enableAutoRotate: function () {},
      setAutoRotateSpeed: function () {},
      setSceneScale: function () {},
      setCameraZ: function () {},
      getRotationY: function () { return 0; },
      getAngularVelocity: function () { return 0; },
      getAccumulatedYawDeg: function () { return 0; },
      setNetworkBoost: function () {},
      setDragEnabled: function () {},
      injectSpin: function () {},
      isReady: function () { return false; }
    };
  }

  const opts = options || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const width = function () { return Math.max(1, host.clientWidth); };
  const height = function () { return Math.max(1, host.clientHeight); };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width() / height(), 0.1, 40);
  camera.position.set(0, 0.05, DEFAULT_CAM_Z);
  camera.lookAt(0, 0, 0);

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
  const globeAnchor = new THREE.Group();
  globeAnchor.position.set(0, 0, 0);
  mark.add(globeAnchor);
  scene.add(mark);

  let globe = null;
  let disposed = false;
  let raf = 0;
  let dragEnabled = true;
  /* Default: auto-rotate on (legacy). Ritual passes autoRotate:false until first drag. */
  let autoRotateOn = opts.autoRotate === undefined ? !reduceMotion : (!!opts.autoRotate && !reduceMotion);

  let autoSpeed = typeof opts.autoRotateSpeed === 'number' ? opts.autoRotateSpeed : 0.0032;
  let sceneScaleMul = 1;
  let networkBoost = 0;
  let accumulatedYaw = 0;
  let significantFired = false;
  const significantDeg = typeof opts.significantDragDeg === 'number' ? opts.significantDragDeg : 10;
  let sessionDragYaw = 0;

  const drag = {
    active: false,
    px: 0,
    py: 0,
    velX: 0,
    velY: 0,
    resumeAt: 0
  };

  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');

  function applySceneScale() {
    if (!globe) return;
    globe.scale.setScalar(GLOBE_SCENE_SCALE * sceneScaleMul);
  }

  function applyNetworkBoost() {
    if (!globe || !globe.userData.network) return;
    const net = globe.userData.network;
    const baseEmissive = 0.55;
    const baseArc = 0.55;
    net.nodeMat.emissiveIntensity = baseEmissive + networkBoost * 0.55;
    net.arcMeshes.forEach(function (m) {
      m.material.opacity = Math.min(0.95, baseArc + networkBoost * 0.35);
    });
  }

  function attachGlobe(texture) {
    if (disposed) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    globe = buildGlobe(texture);
    applySceneScale();
    applyNetworkBoost();
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
    if (!dragEnabled) return;
    drag.active = true;
    drag.px = e.clientX;
    drag.py = e.clientY;
    drag.velX = 0;
    drag.velY = 0;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.active || !globe || !dragEnabled) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    drag.px = e.clientX;
    drag.py = e.clientY;
    const sens = 0.0055;
    const dyaw = dx * sens;
    globe.rotation.y += dyaw;
    globe.rotation.x += dy * sens;
    globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
    drag.velX = dyaw;
    drag.velY = dy * sens;
    accumulatedYaw += Math.abs(dyaw);
    sessionDragYaw += Math.abs(dyaw);
    const deg = (sessionDragYaw * 180) / Math.PI;
    if (!significantFired && deg >= significantDeg) {
      significantFired = true;
      if (typeof opts.onSignificantDrag === 'function') {
        opts.onSignificantDrag(deg);
      }
    }
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

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (globe) {
      if (!drag.active) {
        if (Math.abs(drag.velX) > 0.00005 || Math.abs(drag.velY) > 0.00005) {
          globe.rotation.y += drag.velX;
          globe.rotation.x += drag.velY;
          globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
          accumulatedYaw += Math.abs(drag.velX);
          drag.velX *= 0.94;
          drag.velY *= 0.94;
        } else if (autoRotateOn && now >= drag.resumeAt) {
          globe.rotation.y += autoSpeed;
          accumulatedYaw += Math.abs(autoSpeed);
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
    },
    enableAutoRotate: function (on) {
      autoRotateOn = !!on && !reduceMotion;
    },
    setAutoRotateSpeed: function (speed) {
      if (typeof speed === 'number') autoSpeed = speed;
    },
    setSceneScale: function (mul) {
      sceneScaleMul = Math.max(0.2, mul);
      applySceneScale();
    },
    setCameraZ: function (z) {
      camera.position.z = z;
      camera.lookAt(0, 0, 0);
    },
    getCameraZ: function () { return camera.position.z; },
    getDefaultCameraZ: function () { return DEFAULT_CAM_Z; },
    getRotationY: function () {
      return globe ? globe.rotation.y : 0;
    },
    getAngularVelocity: function () {
      return drag.active ? 0 : drag.velX;
    },
    getAccumulatedYawDeg: function () {
      return (accumulatedYaw * 180) / Math.PI;
    },
    setNetworkBoost: function (t) {
      networkBoost = Math.max(0, Math.min(1, t));
      applyNetworkBoost();
    },
    setDragEnabled: function (on) {
      dragEnabled = !!on;
      if (!dragEnabled) drag.active = false;
      renderer.domElement.style.cursor = dragEnabled ? 'grab' : 'default';
    },
    injectSpin: function (velY) {
      drag.velX = velY;
      drag.resumeAt = performance.now() + 400;
    },
    isReady: function () { return !!globe; },
    resize: onResize
  };
}

if (typeof document !== 'undefined') {
  /* Ritual module mounts when present; otherwise idle globe with auto-rotate. */
  const ritualHost = document.getElementById('atlas-hero-ritual');
  if (!ritualHost) {
    const host = document.getElementById('atlas-hero-mark');
    if (host) mountAtlasHeroMark(host);
  }
}
