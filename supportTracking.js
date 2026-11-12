/**
 * Atlas — support tracking (static Pages soft twin).
 * Default: local-only via localStorage. Tables stay empty until the user
 * requests « prise en charge ». Optional remote: set window.ATLAS_API_BASE
 * to an Atlas API origin that exposes POST /v1/support/handoff.
 *
 * Store key: atlas.support-tracking.v1
 * Shape: {
 *   handoffRequested: boolean,
 *   requestedAt: string|null,
 *   mode: 'local'|'remote'|'soft-twin',
 *   tickets: [{ id, subject, status, updatedAt }],
 *   vulns:   [{ id, title, risk, ticketId, status }],
 *   progress:[{ ticketId, label, pct, note, updatedAt }]
 * }
 * No email / name / session fields are persisted or rendered.
 */
(function (global) {
  var KEY = 'atlas.support-tracking.v1';

  function emptyState() {
    return {
      handoffRequested: false,
      requestedAt: null,
      mode: 'local',
      tickets: [],
      vulns: [],
      progress: []
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      return {
        handoffRequested: !!parsed.handoffRequested,
        requestedAt: parsed.requestedAt || null,
        mode: parsed.mode || 'local',
        tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
        vulns: Array.isArray(parsed.vulns) ? parsed.vulns : [],
        progress: Array.isArray(parsed.progress) ? parsed.progress : []
      };
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function shortId(prefix) {
    var n = Math.floor(Math.random() * 1e6)
      .toString(16)
      .toUpperCase()
      .padStart(5, '0');
    return prefix + '-' + n.slice(-5);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function seedAfterHandoff(existing) {
    var ticketId = shortId('TKT');
    var vulnId = shortId('CCV');
    var at = nowIso();
    return {
      handoffRequested: true,
      requestedAt: at,
      mode: existing.mode || 'local',
      tickets: [
        {
          id: ticketId,
          subject: 'Prise en charge Pragma',
          status: 'ouvert',
          updatedAt: at
        }
      ],
      vulns: [
        {
          id: vulnId,
          title: 'Vulnérabilité signalée (local)',
          risk: 'moyen',
          ticketId: ticketId,
          status: 'en revue'
        }
      ],
      progress: [
        {
          ticketId: ticketId,
          label: 'Prise en charge reçue',
          pct: 15,
          note: 'File d’attente support (soft twin local)',
          updatedAt: at
        }
      ]
    };
  }

  function apiBase() {
    var base = global.ATLAS_API_BASE;
    if (!base || typeof base !== 'string') return '';
    return base.replace(/\/$/, '');
  }

  /**
   * Soft twin: attempt remote handoff when ATLAS_API_BASE is set;
   * always keep a local copy. Never sends email/name/session payload.
   */
  function tryRemoteHandoff(ticketPayload) {
    var base = apiBase();
    if (!base) {
      return Promise.resolve({ ok: true, mode: 'local' });
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    if (ctrl) {
      timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (e) {}
      }, 1800);
    }
    return fetch(base + '/v1/support/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        kind: 'prise_en_charge',
        ticket: ticketPayload,
        source: 'atlas-secu-pages'
      }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) return { ok: true, mode: 'soft-twin' };
        return { ok: true, mode: 'remote' };
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        return { ok: true, mode: 'soft-twin' };
      });
  }

  function getState() {
    return load();
  }

  function isHandoffRequested() {
    return !!load().handoffRequested;
  }

  /**
   * Request prise en charge. Idempotent if already requested:
   * returns current state without reseeding.
   */
  function requestHandoff() {
    var current = load();
    if (current.handoffRequested) {
      return Promise.resolve({ ok: true, state: current, already: true });
    }
    var seeded = seedAfterHandoff(current);
    if (!save(seeded)) {
      return Promise.resolve({ ok: false, reason: 'storage', state: current });
    }
    var ticket = seeded.tickets[0];
    return tryRemoteHandoff({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status
    }).then(function (remote) {
      seeded.mode = remote.mode || 'local';
      save(seeded);
      return { ok: true, state: seeded, already: false, mode: seeded.mode };
    });
  }

  function reset() {
    var empty = emptyState();
    save(empty);
    return empty;
  }

  global.AtlasSupportTracking = {
    KEY: KEY,
    getState: getState,
    isHandoffRequested: isHandoffRequested,
    requestHandoff: requestHandoff,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : this);
