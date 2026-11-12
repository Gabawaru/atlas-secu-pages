/**
 * Atlas — support tracking (Pages soft twin + multi-device sync).
 *
 * Default: local-only via localStorage. Tables stay empty until the user
 * requests « prise en charge ». After handoff, an opaque supportSessionId
 * is the only cross-device key — never email / name / login session.
 *
 * When window.ATLAS_API_BASE is set, talk to Atlas API:
 *   POST {base}/v1/support/handoff
 *   GET  {base}/v1/support/tickets|vulns|progress
 * Header: X-Atlas-Support-Session: <opaque id>
 * Failure → soft-twin local seed (UI unchanged).
 *
 * Store key: atlas.support-tracking.v1
 */
(function (global) {
  var KEY = 'atlas.support-tracking.v1';
  var SESSION_HEADER = 'X-Atlas-Support-Session';

  function emptyState() {
    return {
      handoffRequested: false,
      requestedAt: null,
      mode: 'local',
      supportSessionId: null,
      tickets: [],
      vulns: [],
      progress: []
    };
  }

  function sanitizeState(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      handoffRequested: !!parsed.handoffRequested,
      requestedAt: parsed.requestedAt || null,
      mode: parsed.mode || 'local',
      supportSessionId:
        typeof parsed.supportSessionId === 'string' && parsed.supportSessionId
          ? parsed.supportSessionId
          : null,
      tickets: Array.isArray(parsed.tickets)
        ? parsed.tickets.map(sanitizeTicket).filter(Boolean)
        : [],
      vulns: Array.isArray(parsed.vulns)
        ? parsed.vulns.map(sanitizeVuln).filter(Boolean)
        : [],
      progress: Array.isArray(parsed.progress)
        ? parsed.progress.map(sanitizeProgress).filter(Boolean)
        : []
    };
  }

  /* Strip any accidental PII keys — only opaque ids + table fields. */
  function sanitizeTicket(t) {
    if (!t || typeof t !== 'object') return null;
    return {
      id: String(t.id || ''),
      subject: String(t.subject || ''),
      status: String(t.status || ''),
      updatedAt: t.updatedAt ? String(t.updatedAt) : null
    };
  }

  function sanitizeVuln(v) {
    if (!v || typeof v !== 'object') return null;
    return {
      id: String(v.id || ''),
      title: String(v.title || ''),
      risk: String(v.risk || ''),
      ticketId: String(v.ticketId || ''),
      status: String(v.status || ''),
      fingerprint: v.fingerprint ? String(v.fingerprint) : undefined
    };
  }

  function sanitizeProgress(p) {
    if (!p || typeof p !== 'object') return null;
    return {
      ticketId: String(p.ticketId || ''),
      label: String(p.label || ''),
      pct: typeof p.pct === 'number' ? p.pct : Number(p.pct) || 0,
      note: String(p.note || ''),
      updatedAt: p.updatedAt ? String(p.updatedAt) : null
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return emptyState();
      return sanitizeState(JSON.parse(raw));
    } catch (e) {
      return emptyState();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(sanitizeState(state)));
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

  function seedAfterHandoff(existing, overrides) {
    var ticketId =
      (overrides && overrides.ticketId) ||
      (existing.tickets[0] && existing.tickets[0].id) ||
      shortId('TKT');
    var vulnId =
      (overrides && overrides.vulnId) ||
      (existing.vulns[0] && existing.vulns[0].id) ||
      shortId('CCV');
    var at = (overrides && overrides.requestedAt) || nowIso();
    var sessionId =
      (overrides && overrides.supportSessionId) ||
      existing.supportSessionId ||
      null;
    return {
      handoffRequested: true,
      requestedAt: at,
      mode: (overrides && overrides.mode) || existing.mode || 'local',
      supportSessionId: sessionId,
      tickets:
        overrides && Array.isArray(overrides.tickets) && overrides.tickets.length
          ? overrides.tickets.map(sanitizeTicket).filter(Boolean)
          : [
              {
                id: ticketId,
                subject: 'Prise en charge Pragma',
                status: 'ouvert',
                updatedAt: at
              }
            ],
      vulns:
        overrides && Array.isArray(overrides.vulns) && overrides.vulns.length
          ? overrides.vulns.map(sanitizeVuln).filter(Boolean)
          : [
              {
                id: vulnId,
                title: 'Vulnérabilité signalée (local)',
                risk: 'moyen',
                ticketId: ticketId,
                status: 'en revue'
              }
            ],
      progress:
        overrides &&
        Array.isArray(overrides.progress) &&
        overrides.progress.length
          ? overrides.progress.map(sanitizeProgress).filter(Boolean)
          : [
              {
                ticketId: ticketId,
                label: 'Prise en charge reçue',
                pct: 15,
                note: sessionId
                  ? 'Sync multi-appareil (soft twin)'
                  : 'File d’attente support (soft twin local)',
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

  function withTimeout(ms) {
    var ctrl =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;
    if (ctrl) {
      timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (e) {}
      }, ms);
    }
    return {
      signal: ctrl ? ctrl.signal : undefined,
      clear: function () {
        if (timer) clearTimeout(timer);
      }
    };
  }

  function sessionHeaders(supportSessionId) {
    var h = { Accept: 'application/json' };
    if (supportSessionId) h[SESSION_HEADER] = supportSessionId;
    return h;
  }

  function parseSnapshot(data) {
    if (!data || typeof data !== 'object') return null;
    var sid =
      typeof data.supportSessionId === 'string' ? data.supportSessionId : null;
    return {
      supportSessionId: sid,
      tickets: Array.isArray(data.tickets) ? data.tickets : null,
      vulns: Array.isArray(data.vulns) ? data.vulns : null,
      progress: Array.isArray(data.progress) ? data.progress : null,
      requestedAt: data.requestedAt || null
    };
  }

  /**
   * POST handoff — never sends email/name/session. Opaque id only in response.
   */
  function tryRemoteHandoff(ticketPayload, c1) {
    var base = apiBase();
    if (!base) {
      return Promise.resolve({ ok: true, mode: 'local', snapshot: null });
    }
    var t = withTimeout(2500);
    var body = {
      kind: 'prise_en_charge',
      source: 'atlas-secu-pages',
      ticket: {
        id: ticketPayload.id,
        subject: ticketPayload.subject,
        status: ticketPayload.status
      }
    };
    if (c1 && c1.pcConfirmedAt) {
      body.pcConfirmedAt = c1.pcConfirmedAt;
      body.initiatedFrom = c1.initiatedFrom || 'pc';
    }
    return fetch(base + '/v1/support/handoff', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        sessionHeaders(null)
      ),
      body: JSON.stringify(body),
      signal: t.signal
    })
      .then(function (res) {
        t.clear();
        if (!res.ok) return { ok: true, mode: 'soft-twin', snapshot: null };
        return res.json().then(
          function (data) {
            var snap = parseSnapshot(data);
            return {
              ok: true,
              mode: snap && snap.supportSessionId ? 'remote' : 'soft-twin',
              snapshot: snap,
              ticketId: data && (data.ticketId || data.id) || null
            };
          },
          function () {
            return { ok: true, mode: 'soft-twin', snapshot: null };
          }
        );
      })
      .catch(function () {
        t.clear();
        return { ok: true, mode: 'soft-twin', snapshot: null };
      });
  }

  function fetchCollection(path, supportSessionId) {
    var base = apiBase();
    if (!base || !supportSessionId) {
      return Promise.resolve({ ok: false, items: null });
    }
    var t = withTimeout(2500);
    return fetch(base + '/v1/support/' + path, {
      method: 'GET',
      headers: sessionHeaders(supportSessionId),
      signal: t.signal
    })
      .then(function (res) {
        t.clear();
        if (!res.ok) return { ok: false, items: null };
        return res.json().then(
          function (data) {
            if (Array.isArray(data)) return { ok: true, items: data };
            if (data && Array.isArray(data.items))
              return { ok: true, items: data.items };
            if (data && Array.isArray(data[path]))
              return { ok: true, items: data[path] };
            return { ok: false, items: null };
          },
          function () {
            return { ok: false, items: null };
          }
        );
      })
      .catch(function () {
        t.clear();
        return { ok: false, items: null };
      });
  }

  /**
   * Pull tickets/vulns/progress for the opaque session id (multi-device sync).
   * No-op before handoff or without ATLAS_API_BASE / supportSessionId.
   */
  function syncFromRemote() {
    var current = load();
    if (!current.handoffRequested || !current.supportSessionId || !apiBase()) {
      return Promise.resolve({ ok: true, state: current, synced: false });
    }
    var sid = current.supportSessionId;
    return Promise.all([
      fetchCollection('tickets', sid),
      fetchCollection('vulns', sid),
      fetchCollection('progress', sid)
    ]).then(function (parts) {
      var tickets = parts[0];
      var vulns = parts[1];
      var progress = parts[2];
      var any = tickets.ok || vulns.ok || progress.ok;
      if (!any) {
        current.mode = current.mode === 'remote' ? 'soft-twin' : current.mode;
        save(current);
        return { ok: true, state: current, synced: false };
      }
      if (tickets.ok && tickets.items) current.tickets = tickets.items;
      if (vulns.ok && vulns.items) current.vulns = vulns.items;
      if (progress.ok && progress.items) current.progress = progress.items;
      current.mode = 'remote';
      current = sanitizeState(current);
      save(current);
      return { ok: true, state: current, synced: true };
    });
  }

  function getState() {
    return load();
  }

  function isHandoffRequested() {
    return !!load().handoffRequested;
  }

  function getSupportSessionId() {
    return load().supportSessionId || null;
  }


  /**
   * C1 gate (Pages soft twin) — mirror Atlas client.
   * PC: window.confirm → { ok, pcConfirmedAt, initiatedFrom:"pc" }.
   * Phone / doubt: fail-closed (no fake phone soft twin; A1 needs ATLAS_API_BASE).
   * Test hooks: __ATLAS_C1_FORCE_PHONE__, __ATLAS_C1_CONFIRM__.
   */
  function isPhoneLikeInitiator() {
    if (typeof global.__ATLAS_C1_FORCE_PHONE__ === 'boolean') {
      return global.__ATLAS_C1_FORCE_PHONE__;
    }
    try {
      var nav = global.navigator || {};
      if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') {
        if (nav.userAgentData.mobile) return true;
      }
      var ua = String(nav.userAgent || nav.vendor || '');
      if (/Android|iPhone|iPod|iPad|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return true;
      }
      if (typeof global.matchMedia === 'function') {
        if (global.matchMedia('(pointer: coarse)').matches) return true;
      }
    } catch (e) {
      return true; /* doubt → phone */
    }
    return false;
  }

  function gateSupportHandoffC1() {
    if (isPhoneLikeInitiator()) {
      return {
        ok: false,
        reason: 'phone_blocked',
        message:
          'Prise en charge téléphone bloquée tant que ATLAS_API_BASE n’est pas branché (confirm PC requis).'
      };
    }
    var accepted = false;
    try {
      if (typeof global.__ATLAS_C1_CONFIRM__ === 'function') {
        accepted = !!global.__ATLAS_C1_CONFIRM__();
      } else if (typeof global.confirm === 'function') {
        accepted = !!global.confirm(
          'Confirmer la demande de prise en charge Atlas ?'
        );
      } else {
        return {
          ok: false,
          reason: 'no_confirm',
          message: 'Confirmation locale indisponible.'
        };
      }
    } catch (e) {
      return {
        ok: false,
        reason: 'confirm_error',
        message: 'Confirmation locale impossible.'
      };
    }
    if (!accepted) {
      return {
        ok: false,
        reason: 'c1_cancelled',
        message: 'Demande annulée.'
      };
    }
    return {
      ok: true,
      pcConfirmedAt: nowIso(),
      initiatedFrom: 'pc'
    };
  }

  /**
   * Request prise en charge. Idempotent if already requested:
   * returns current state (and refreshes from remote when possible).
   */
  function requestHandoff() {
    var current = load();
    if (current.handoffRequested) {
      return syncFromRemote().then(function (r) {
        return {
          ok: true,
          state: r.state,
          already: true,
          mode: r.state.mode,
          synced: r.synced
        };
      });
    }
    var gate = gateSupportHandoffC1();
    if (!gate.ok) {
      return Promise.resolve({
        ok: false,
        reason: gate.reason,
        message: gate.message,
        state: current
      });
    }
    var seeded = seedAfterHandoff(current);
    if (!save(seeded)) {
      return Promise.resolve({ ok: false, reason: 'storage', state: current });
    }
    var ticket = seeded.tickets[0];
    return tryRemoteHandoff(
      {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status
      },
      {
        pcConfirmedAt: gate.pcConfirmedAt,
        initiatedFrom: gate.initiatedFrom
      }
    ).then(function (remote) {
      var overrides = {
        mode: remote.mode || 'local',
        supportSessionId:
          (remote.snapshot && remote.snapshot.supportSessionId) || null,
        requestedAt: seeded.requestedAt
      };
      if (remote.snapshot) {
        if (remote.snapshot.tickets) overrides.tickets = remote.snapshot.tickets;
        if (remote.snapshot.vulns) overrides.vulns = remote.snapshot.vulns;
        if (remote.snapshot.progress)
          overrides.progress = remote.snapshot.progress;
        if (remote.snapshot.requestedAt)
          overrides.requestedAt = remote.snapshot.requestedAt;
        if (remote.ticketId) overrides.ticketId = remote.ticketId;
      }
      var next = seedAfterHandoff(seeded, overrides);
      /* If API gave only a session id, keep soft twin rows but attach id. */
      if (overrides.supportSessionId && !overrides.tickets) {
        next.supportSessionId = overrides.supportSessionId;
        next.mode = overrides.mode;
      }
      save(next);
      return { ok: true, state: next, already: false, mode: next.mode };
    });
  }

  function reset() {
    var empty = emptyState();
    save(empty);
    return empty;
  }

  /**
   * Opt-in ingest of scanner findings into support vulns (post-handoff only).
   * Requires opaque supportSessionId + ATLAS_API_BASE; otherwise merges local soft twin.
   * Payload: [{ id?, title, risk, fingerprint? }] — no PII.
   */
  function ingestVulns(findings) {
    var current = load();
    if (!current.handoffRequested) {
      return Promise.resolve({
        ok: false,
        reason: 'no_handoff',
        state: current
      });
    }
    var list = Array.isArray(findings) ? findings : [];
    var ticketId =
      (current.tickets[0] && current.tickets[0].id) || shortId('TKT');
    var mapped = list
      .map(function (f) {
        if (!f || typeof f !== 'object') return null;
        return sanitizeVuln({
          id: f.id || shortId('CCV'),
          title: f.title || f.control || 'Finding',
          risk: f.risk || f.riskCode || 'info',
          ticketId: ticketId,
          status: 'en revue',
          fingerprint: f.fingerprint
        });
      })
      .filter(Boolean);

    var base = apiBase();
    var sid = current.supportSessionId;
    if (base && sid && mapped.length) {
      var t = withTimeout(2500);
      return fetch(base + '/v1/support/vulns', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          sessionHeaders(sid)
        ),
        body: JSON.stringify({ vulns: mapped, source: 'scanner-opt-in' }),
        signal: t.signal
      })
        .then(function (res) {
          t.clear();
          if (!res.ok) throw new Error('http');
          return res.json();
        })
        .then(function (data) {
          if (data && Array.isArray(data.vulns)) {
            current.vulns = data.vulns.map(sanitizeVuln).filter(Boolean);
          } else {
            current.vulns = mergeVulns(current.vulns, mapped);
          }
          current.mode = 'remote';
          save(current);
          return { ok: true, state: current, mode: 'remote' };
        })
        .catch(function () {
          current.vulns = mergeVulns(current.vulns, mapped);
          current.mode = 'soft-twin';
          save(current);
          return { ok: true, state: current, mode: 'soft-twin' };
        });
    }

    current.vulns = mergeVulns(current.vulns, mapped);
    save(current);
    return Promise.resolve({ ok: true, state: current, mode: current.mode });
  }

  function mergeVulns(existing, incoming) {
    var byKey = {};
    (existing || []).forEach(function (v) {
      var k = v.fingerprint || v.id;
      byKey[k] = v;
    });
    (incoming || []).forEach(function (v) {
      var k = v.fingerprint || v.id;
      byKey[k] = Object.assign({}, byKey[k] || {}, v);
    });
    return Object.keys(byKey).map(function (k) {
      return byKey[k];
    });
  }

  global.AtlasSupportTracking = {
    KEY: KEY,
    SESSION_HEADER: SESSION_HEADER,
    getState: getState,
    isHandoffRequested: isHandoffRequested,
    getSupportSessionId: getSupportSessionId,
    gateSupportHandoffC1: gateSupportHandoffC1,
    isPhoneLikeInitiator: isPhoneLikeInitiator,
    requestHandoff: requestHandoff,
    syncFromRemote: syncFromRemote,
    ingestVulns: ingestVulns,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : this);
