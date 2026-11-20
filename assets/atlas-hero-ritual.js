/**
 * ATLAS hero ritual v2 — beat sequence around the interactive globe.
 * Spec: docs/atlas-hero-sequence-prompt-2026-11-20.md
 * Once-only key (localStorage): atlas-hero-ritual-v2
 * Replay: localStorage.removeItem('atlas-hero-ritual-v2'); location.reload()
 */
import { mountAtlasHeroMark } from './atlas-hero-mark.js';

const STORAGE_KEY = 'atlas-hero-ritual-v2';
const TRIGGER_DEG_DESKTOP = 10;
const TRIGGER_DEG_MOBILE = 8;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function isMobile() {
  return window.matchMedia('(max-width: 860px)').matches ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 960);
}

function timings() {
  const m = isMobile();
  return {
    scaleMs: m ? 13000 : 10500,
    targetTurns: m ? 4.2 : 3.6,
    aOrbitMs: m ? 6500 : 5500,
    earthAloneMs: m ? 3200 : 2600,
    aSlideMs: m ? 900 : 700,
    letterStaggerMs: m ? 160 : 130,
    sloganMs: m ? 650 : 520,
    ctaMs: m ? 500 : 400,
    explainMs: m ? 600 : 480,
    unlockMs: m ? 700 : 550
  };
}

function migrateLegacySessionFlag() {
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      localStorage.setItem(STORAGE_KEY, '1');
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) { /* ignore */ }
}

function ritualDone() {
  migrateLegacySessionFlag();
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function markRitualDone() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch (_) { /* ignore */ }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) { /* ignore */ }
}

/**
 * Public skip helper for QA:
 *   localStorage.setItem('atlas-hero-ritual-v2','1'); location.reload()
 * Replay:
 *   localStorage.removeItem('atlas-hero-ritual-v2'); location.reload()
 */
export function skipAtlasHeroRitual() {
  markRitualDone();
}

function allowRitualTouchTarget(target) {
  if (!target || !target.closest) return false;
  return !!(
    target.closest('#atlas-hero-mark') ||
    target.closest('.ritual-cta') ||
    target.closest('button') ||
    target.closest('a')
  );
}

let touchScrollBlocker = null;

function setScrollLock(on) {
  if (on) {
    const y = window.scrollY || 0;
    document.documentElement.style.setProperty('--ritual-scroll-y', String(y));
    document.body.classList.add('is-ritual-scroll-lock');
    document.body.style.top = '-' + y + 'px';
    if (!touchScrollBlocker) {
      touchScrollBlocker = function (e) {
        if (allowRitualTouchTarget(e.target)) return;
        e.preventDefault();
      };
      document.addEventListener('touchmove', touchScrollBlocker, { passive: false });
    }
  } else {
    const y = parseInt(document.documentElement.style.getPropertyValue('--ritual-scroll-y') || '0', 10) || 0;
    document.body.classList.remove('is-ritual-scroll-lock');
    document.body.style.top = '';
    if (touchScrollBlocker) {
      document.removeEventListener('touchmove', touchScrollBlocker);
      touchScrollBlocker = null;
    }
    window.scrollTo(0, y);
  }
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function rafUntil(predicate, maxMs) {
  return new Promise(function (resolve) {
    const start = performance.now();
    function frame(now) {
      if (predicate(now) || now - start > maxMs) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function animateValue(from, to, durationMs, ease, onUpdate) {
  return new Promise(function (resolve) {
    const start = performance.now();
    function frame(now) {
      const t = clamp01((now - start) / durationMs);
      onUpdate(lerp(from, to, ease(t)), t);
      if (t >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function orbitCss(angleRad, radiusPx) {
  const x = Math.sin(angleRad) * radiusPx;
  const z = Math.cos(angleRad);
  const y = Math.sin(angleRad * 0.35) * radiusPx * 0.08;
  const behind = z < 0;
  const scale = 0.72 + 0.28 * ((z + 1) / 2);
  return {
    transform: 'translate(-50%, -50%) translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')',
    opacity: behind ? 0 : 0.15 + 0.85 * ((z + 1) / 2),
    visibility: behind ? 'hidden' : 'visible',
    zIndex: behind ? 0 : 4
  };
}

/**
 * @param {{
 *   markHost: HTMLElement,
 *   stage: HTMLElement,
 *   onComplete?: () => void,
 * }} cfg
 */
export function mountAtlasHeroRitual(cfg) {
  const markHost = cfg.markHost;
  const stage = cfg.stage;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doneAlready = ritualDone();
  const mobile = isMobile();
  const triggerDeg = mobile ? TRIGGER_DEG_MOBILE : TRIGGER_DEG_DESKTOP;
  const aSlideFrom = mobile ? -28 : -42;

  const els = {
    hint: stage.querySelector('[data-ritual="hint"]'),
    sloganOrbit: stage.querySelector('[data-ritual="slogan-orbit"]'),
    brandOrbit: stage.querySelector('[data-ritual="brand-orbit"]'),
    letterA: stage.querySelector('[data-ritual="letter-a"]'),
    wordmark: stage.querySelector('[data-ritual="wordmark"]'),
    letters: stage.querySelectorAll('[data-ritual-letter]'),
    sloganFinal: stage.querySelector('[data-ritual="slogan-final"]'),
    cta: stage.querySelector('[data-ritual="cta"]'),
    explain: stage.querySelector('[data-ritual="explain"]'),
    visual: document.getElementById('hero-visual') || markHost.closest('.hero-visual'),
    heroCopy: document.getElementById('hero-copy'),
    nav: document.querySelector('#view-marketing .nav'),
    below: document.getElementById('below-fold')
  };

  function showEndState(skipAnim) {
    document.body.classList.remove('is-ritual-idle', 'is-ritual-playing', 'is-ritual-fullscreen');
    document.body.classList.add('is-ritual-done');
    stage.classList.add('is-end');
    stage.removeAttribute('hidden');
    if (els.hint) els.hint.hidden = true;
    if (els.sloganOrbit) els.sloganOrbit.hidden = true;
    if (els.brandOrbit) els.brandOrbit.hidden = true;
    if (els.letterA) {
      els.letterA.classList.remove('is-orbiting', 'is-stuck', 'is-off');
      els.letterA.classList.add('is-wordmark-a');
      els.letterA.style.cssText = '';
      els.letterA.setAttribute('aria-hidden', 'true');
      els.letterA.hidden = true;
    }
    if (els.wordmark) {
      els.wordmark.hidden = false;
      els.wordmark.classList.add('is-in');
      els.letters.forEach(function (el) { el.classList.add('is-in'); });
    }
    if (els.sloganFinal) {
      els.sloganFinal.hidden = false;
      els.sloganFinal.classList.add('is-in');
    }
    if (els.cta) {
      els.cta.hidden = false;
      els.cta.classList.add('is-in');
    }
    if (els.explain) {
      els.explain.hidden = false;
      els.explain.classList.add('is-in');
    }
    if (els.heroCopy) els.heroCopy.classList.add('is-ritual-revealed');
    if (els.nav) els.nav.classList.add('is-ritual-revealed');
    if (els.below) els.below.classList.add('is-ritual-revealed');
    document.body.classList.add('is-past-fold');
    setScrollLock(false);
    if (skipAnim) {
      /* no-op */
    }
  }

  if (reduceMotion || doneAlready) {
    /* Persist once-only even for reduced-motion first visit (durable skip). */
    if (reduceMotion) markRitualDone();
    const globe = mountAtlasHeroMark(markHost, { autoRotate: true });
    document.body.classList.add('is-ritual-done', 'is-ritual-skipped');
    showEndState(true);
    stage.classList.add('is-skipped');
    stage.setAttribute('hidden', '');
    if (els.nav) els.nav.classList.add('is-ritual-revealed');
    if (els.below) els.below.classList.add('is-ritual-revealed');
    if (els.heroCopy) {
      els.heroCopy.classList.add('is-ritual-revealed');
      els.heroCopy.style.opacity = '';
      els.heroCopy.style.visibility = '';
    }
    if (typeof cfg.onComplete === 'function') cfg.onComplete();
    return { dispose: function () { globe.dispose(); }, controller: globe };
  }

  /* —— First-visit ritual —— */
  document.body.classList.add('is-ritual-idle');
  setScrollLock(true); /* keep idle composition in view until ritual unlocks */
  stage.removeAttribute('hidden');
  stage.classList.add('is-idle');
  if (els.hint) els.hint.hidden = false;
  if (els.sloganOrbit) els.sloganOrbit.hidden = false;
  if (els.brandOrbit) els.brandOrbit.hidden = false;
  if (els.wordmark) els.wordmark.hidden = true;
  if (els.sloganFinal) els.sloganFinal.hidden = true;
  if (els.cta) els.cta.hidden = true;
  if (els.explain) els.explain.hidden = true;
  if (els.letterA) {
    els.letterA.hidden = true;
    els.letterA.classList.remove('is-orbiting', 'is-stuck', 'is-off', 'is-wordmark-a');
  }

  let phase = 'idle';
  let orbitAngle = 0;
  let orbitRadius = Math.min(window.innerWidth, window.innerHeight) * 0.38;
  let scaleProgress = 0;
  let stuckA = false;
  let hideOrbitText = false;
  let letterAVisible = false;
  let letterABehindCutoff = false; /* false during beat 3 — never vanish */
  const T = timings();

  const globe = mountAtlasHeroMark(markHost, {
    autoRotate: false,
    significantDragDeg: triggerDeg,
    touchBoost: mobile,
    onSignificantDrag: function () {
      if (phase !== 'idle') return;
      beginRitual();
    }
  });

  function updateOrbitLitter(baseAngle) {
    if (hideOrbitText) return;
    const litter = [
      { el: els.hint, offset: 0 },
      { el: els.sloganOrbit, offset: Math.PI * 0.85 },
      { el: els.brandOrbit, offset: -Math.PI * 0.55 }
    ];
    litter.forEach(function (item) {
      if (!item.el || item.el.hidden) return;
      const style = orbitCss(baseAngle + item.offset, orbitRadius);
      item.el.style.transform = style.transform;
      item.el.style.opacity = String(style.opacity);
      item.el.style.visibility = style.visibility;
      item.el.style.zIndex = String(style.zIndex);
    });
  }

  function placeLetterA(angle, radius, opts) {
    if (!els.letterA) return;
    const o = opts || {};
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle);
    const y = Math.sin(angle * 0.2) * radius * 0.05;
    const behind = z < 0;
    const scale = o.scale != null ? o.scale : (0.85 + 0.25 * ((z + 1) / 2));
    els.letterA.style.transform =
      'translate(-50%, -50%) translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
    if (letterABehindCutoff && behind && !stuckA) {
      els.letterA.style.opacity = '0';
      els.letterA.style.visibility = 'hidden';
    } else {
      els.letterA.style.opacity = o.opacity != null ? String(o.opacity) : (behind ? '0.55' : '1');
      els.letterA.style.visibility = 'visible';
    }
    els.letterA.style.zIndex = behind && !stuckA ? '2' : '6';
  }

  let litterRaf = 0;
  function litterLoop() {
    litterRaf = requestAnimationFrame(litterLoop);
    if (phase === 'idle') {
      /* Hint pulse is CSS-only; keep slogan under the circle (no absolute orbit yet). */
      return;
    }
    if (phase === 'expand' || phase === 'drag') {
      const yaw = globe.getRotationY();
      updateOrbitLitter(yaw);
      orbitRadius = lerp(
        Math.min(window.innerWidth, window.innerHeight) * 0.38,
        Math.min(window.innerWidth, window.innerHeight) * 0.55,
        scaleProgress
      );
    }
    if ((phase === 'a-orbit' || phase === 'a-stuck' || phase === 'earth-alone') && letterAVisible) {
      if (stuckA) {
        placeLetterA(globe.getRotationY(), 0, { scale: 1.05, opacity: 1 });
      } else {
        placeLetterA(orbitAngle, orbitRadius * 0.92, { scale: 1.15 });
      }
    }
  }
  litterRaf = requestAnimationFrame(litterLoop);

  async function beginRitual() {
    phase = 'drag';
    document.body.classList.remove('is-ritual-idle');
    document.body.classList.add('is-ritual-playing');
    stage.classList.remove('is-idle');
    stage.classList.add('is-playing');
    setScrollLock(true);

    /* Beat 1 — cue fade, inertia already on globe */
    if (els.hint) {
      els.hint.classList.add('is-fading');
      await wait(420);
      els.hint.hidden = true;
    }
    globe.setNetworkBoost(0.35);
    globe.enableAutoRotate(true);
    globe.setAutoRotateSpeed(0.018);
    /* Keep a bit of user inertia; boost if nearly stopped */
    if (Math.abs(globe.getAngularVelocity()) < 0.004) {
      globe.injectSpin(0.022);
    }

    /* Beat 2 — multi-rotation scale to fullscreen (host grows with progress, no CSS snap) */
    phase = 'expand';
    document.body.classList.add('is-ritual-expanding');
    stage.classList.add('is-expanding');
    const startYaw = globe.getAccumulatedYawDeg();
    const startCam = globe.getDefaultCameraZ();
    /* Keep camera outside globe (radius ≈ scale * 1.12); host CSS grows to fill viewport. */
    const endCam = 2.85;
    const endScale = 1.62;
    const scaleStart = performance.now();
    const startHost = els.visual ? els.visual.getBoundingClientRect().width : 380;

    await rafUntil(function (now) {
      const elapsed = now - scaleStart;
      const timeT = clamp01(elapsed / T.scaleMs);
      const yawDeg = globe.getAccumulatedYawDeg() - startYaw;
      const turnT = clamp01(yawDeg / (T.targetTurns * 360));
      /* Prefer time so duration stays ~8–14s; turns enrich the feel */
      scaleProgress = easeInOutCubic(Math.max(timeT, turnT * 0.55));
      globe.setSceneScale(lerp(1, endScale, scaleProgress));
      globe.setCameraZ(lerp(startCam, endCam, scaleProgress));
      globe.setNetworkBoost(lerp(0.35, 0.85, scaleProgress));
      globe.setAutoRotateSpeed(lerp(0.018, 0.028, scaleProgress));
      const hostPx = lerp(startHost, Math.min(window.innerWidth, window.innerHeight) * 0.92, scaleProgress);
      if (els.visual) {
        els.visual.style.width = hostPx + 'px';
        els.visual.style.height = hostPx + 'px';
        globe.resize();
      }
      if (scaleProgress > 0.55) {
        document.body.classList.add('is-ritual-fullscreen');
        stage.classList.add('is-fullscreen');
      }
      return timeT >= 1;
    }, T.scaleMs + 2000);

    document.body.classList.add('is-ritual-fullscreen');
    stage.classList.add('is-fullscreen');
    document.body.classList.remove('is-ritual-expanding');

    /* Hide orbit text (already cutoff when behind; force clear) */
    hideOrbitText = true;
    [els.hint, els.sloganOrbit, els.brandOrbit].forEach(function (el) {
      if (!el) return;
      el.hidden = true;
      el.style.opacity = '0';
    });

    /* Beat 3 — geometric A full orbit, soft impact, stick */
    phase = 'a-orbit';
    letterAVisible = true;
    letterABehindCutoff = false;
    stuckA = false;
    if (els.letterA) {
      els.letterA.hidden = false;
      els.letterA.classList.add('is-orbiting');
      els.letterA.setAttribute('aria-hidden', 'false');
    }
    orbitAngle = Math.PI * 0.35;
    const orbitStart = orbitAngle;
    const orbitEnd = orbitStart + Math.PI * 2;
    await animateValue(0, 1, T.aOrbitMs, easeInOutCubic, function (t) {
      orbitAngle = lerp(orbitStart, orbitEnd, t);
      orbitRadius = Math.min(window.innerWidth, window.innerHeight) * 0.42;
      placeLetterA(orbitAngle, orbitRadius * 0.92, { scale: lerp(1.2, 1.05, t) });
    });

    /* Soft impact center */
    stuckA = true;
    phase = 'a-stuck';
    if (els.letterA) {
      els.letterA.classList.remove('is-orbiting');
      els.letterA.classList.add('is-stuck', 'is-impact');
    }
    placeLetterA(0, 0, { scale: 1.12, opacity: 1 });
    await wait(180);
    if (els.letterA) els.letterA.classList.remove('is-impact');
    placeLetterA(0, 0, { scale: 1.05, opacity: 1 });
    globe.setAutoRotateSpeed(0.012);
    await wait(1400);

    /* Beat 4 — A rotates with globe until behind, then only Earth */
    phase = 'earth-alone';
    letterABehindCutoff = true;
    const stickStartYaw = globe.getRotationY();
    await rafUntil(function () {
      const dy = globe.getRotationY() - stickStartYaw;
      /* half turn ≈ out of view */
      if (els.letterA && stuckA) {
        const ang = dy;
        const z = Math.cos(ang);
        els.letterA.style.transform =
          'translate(-50%, -50%) translate3d(' + (Math.sin(ang) * 28) + 'px,0,0) scale(1.02)';
        if (z < -0.15) {
          els.letterA.style.opacity = '0';
          els.letterA.style.visibility = 'hidden';
          return true;
        }
        els.letterA.style.opacity = String(0.3 + 0.7 * ((z + 1) / 2));
      }
      return false;
    }, T.earthAloneMs + 2500);

    if (els.letterA) {
      els.letterA.classList.add('is-off');
      els.letterA.hidden = true;
      letterAVisible = false;
    }
    stuckA = false;
    globe.setAutoRotateSpeed(0.0065);
    await wait(T.earthAloneMs * 0.55);

    /* Beat 5 — wordmark from left */
    phase = 'wordmark';
    document.body.classList.add('is-ritual-wordmark');
    stage.classList.add('is-wordmark');

    if (els.wordmark) {
      els.wordmark.hidden = false;
      els.wordmark.classList.add('is-building');
    }

    /* A slides from left to near-center (ATLAS A position) */
    const aLetter = els.wordmark && els.wordmark.querySelector('[data-ritual-letter="A0"]');
    const rest = ['T', 'L', 'A1', 'S'].map(function (id) {
      return els.wordmark && els.wordmark.querySelector('[data-ritual-letter="' + id + '"]');
    });

    if (aLetter) {
      aLetter.classList.add('is-sliding');
      aLetter.style.transform = 'translateX(' + aSlideFrom + 'vw)';
      aLetter.style.opacity = '0';
      void aLetter.offsetWidth;
      await animateValue(0, 1, T.aSlideMs, easeOutCubic, function (t) {
        aLetter.style.opacity = String(t);
        aLetter.style.transform = 'translateX(' + lerp(aSlideFrom, 0, t) + 'vw)';
      });
      aLetter.style.transform = '';
      aLetter.classList.add('is-in');
      aLetter.classList.remove('is-sliding');
    }

    for (let i = 0; i < rest.length; i++) {
      const el = rest[i];
      if (!el) continue;
      el.classList.add('is-slide-out');
      el.style.opacity = '0';
      el.style.transform = 'translateX(-0.55em)';
      void el.offsetWidth;
      await animateValue(0, 1, T.letterStaggerMs + 80, easeOutCubic, function (t) {
        el.style.opacity = String(t);
        el.style.transform = 'translateX(' + lerp(-0.55, 0, t) + 'em)';
      });
      el.style.transform = '';
      el.classList.add('is-in');
      await wait(T.letterStaggerMs * 0.35);
    }

    if (els.sloganFinal) {
      els.sloganFinal.hidden = false;
      els.sloganFinal.classList.add('is-slide-up');
      els.sloganFinal.style.opacity = '0';
      els.sloganFinal.style.transform = 'translateY(18px)';
      void els.sloganFinal.offsetWidth;
      await animateValue(0, 1, T.sloganMs, easeOutCubic, function (t) {
        els.sloganFinal.style.opacity = String(t);
        els.sloganFinal.style.transform = 'translateY(' + lerp(18, 0, t) + 'px)';
      });
      els.sloganFinal.classList.add('is-in');
      els.sloganFinal.style.transform = '';
    }

    if (els.cta) {
      els.cta.hidden = false;
      els.cta.style.opacity = '0';
      els.cta.style.transform = 'translateY(14px)';
      void els.cta.offsetWidth;
      await animateValue(0, 1, T.ctaMs, easeOutCubic, function (t) {
        els.cta.style.opacity = String(t);
        els.cta.style.transform = 'translateY(' + lerp(14, 0, t) + 'px)';
      });
      els.cta.classList.add('is-in');
      els.cta.style.transform = '';
    }

    if (els.explain) {
      els.explain.hidden = false;
      els.explain.style.opacity = '0';
      els.explain.style.transform = 'translateY(16px)';
      void els.explain.offsetWidth;
      await animateValue(0, 1, T.explainMs, easeOutCubic, function (t) {
        els.explain.style.opacity = String(t);
        els.explain.style.transform = 'translateY(' + lerp(16, 0, t) + 'px)';
      });
      els.explain.classList.add('is-in');
      els.explain.style.transform = '';
    }

    await wait(T.unlockMs * 0.4);

    /* Reveal rest of site + unlock scroll; settle globe scale slightly */
    markRitualDone();
    phase = 'done';
    globe.setDragEnabled(true);
    globe.setAutoRotateSpeed(0.0032);
    await animateValue(1, 0, T.unlockMs, easeInOutCubic, function (t) {
      /* t goes 1→0: ease out of fullscreen camera toward settled hero */
      const u = 1 - t;
      globe.setSceneScale(lerp(endScale, 1.08, u));
      globe.setCameraZ(lerp(endCam, startCam, u));
    });
    globe.setNetworkBoost(0.25);

    document.body.classList.remove(
      'is-ritual-playing', 'is-ritual-fullscreen', 'is-ritual-wordmark', 'is-ritual-expanding'
    );
    document.body.classList.add('is-ritual-done');
    stage.classList.remove('is-playing', 'is-fullscreen', 'is-expanding');
    stage.classList.add('is-end');
    if (els.visual) {
      els.visual.style.width = '';
      els.visual.style.height = '';
    }

    if (els.heroCopy) els.heroCopy.classList.add('is-ritual-revealed');
    if (els.nav) els.nav.classList.add('is-ritual-revealed');
    if (els.below) els.below.classList.add('is-ritual-revealed');
    document.body.classList.add('is-past-fold');
    setScrollLock(false);
    globe.resize();

    if (typeof cfg.onComplete === 'function') cfg.onComplete();
  }

  return {
    dispose: function () {
      cancelAnimationFrame(litterRaf);
      setScrollLock(false);
      globe.dispose();
    },
    controller: globe,
    replay: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
      location.reload();
    }
  };
}

if (typeof document !== 'undefined') {
  const markHost = document.getElementById('atlas-hero-mark');
  const stage = document.getElementById('atlas-hero-ritual');
  if (markHost && stage) {
    const api = mountAtlasHeroRitual({ markHost: markHost, stage: stage });
    try {
      window.__atlasHeroRitual = {
        replay: function () {
          if (api && typeof api.replay === 'function') api.replay();
          else {
            try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
            location.reload();
          }
        },
        skip: skipAtlasHeroRitual
      };
    } catch (_) { /* ignore */ }
  }
}
