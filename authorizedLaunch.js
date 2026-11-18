/**
 * Deep-link entry from atlas-secu.com → local Atlas client.
 * Browser port of Gabawaru/Atlas apps/client/src/authorizedLaunch.ts
 *
 * Public model: the scan target URL/host is chosen in Atlas Local by the
 * operator. Pages do not advertise a fixed Pragma/RoE perimeter. The client
 * is responsible for ensuring the scan is authorized.
 */
(function (global) {
  var AUTHORIZED_ACTIONS = ['recon', 'scan', 'vuln', 'osint'];

  var AUTHORIZED_ACTION_LABELS = {
    recon: 'Reconnaissance',
    scan: 'Scan',
    vuln: 'Évaluation de vulnérabilités',
    osint: 'OSINT'
  };

  /* Empty default: target is chosen in Atlas Local, not forced by Pages. */
  var DEFAULT_AUTHORIZED_HOST = '';

  /* Legacy export names retained for callers; no fixed perimeter list. */
  var ROE_SCOPE_PATTERNS = [];
  var ROE_EXPLICIT_APEXES = [];

  /** Preferred Vite client (authorizedLaunch + #scanner). */
  var DEFAULT_CLIENT_ORIGIN = 'http://localhost:3002';
  /** Atlas.exe local shell (start-api / Scan platform). */
  var ATLAS_LOCAL_ORIGIN = 'http://127.0.0.1:17865';
  var CLIENT_ORIGIN_IPV4 = 'http://127.0.0.1:3002';

  function normalizeLaunchHost(value) {
    var raw = String(value || '').trim();
    try {
      if (raw.indexOf('://') !== -1) {
        return new URL(raw).hostname.toLowerCase().replace(/\.$/, '');
      }
    } catch (e) {
      /* fallthrough */
    }
    var host = raw.toLowerCase().replace(/\.$/, '').split('/')[0] || '';
    if (host.indexOf(':') !== -1 && host.indexOf('::') === -1) {
      host = host.split(':')[0] || host;
    }
    return host;
  }

  /** Format check only — not a product perimeter. Empty host = client chooses. */
  function isValidLaunchHost(host) {
    var h = normalizeLaunchHost(host);
    if (!h) return false;
    if (h.indexOf(' ') !== -1 || h.indexOf('..') !== -1 || h.indexOf(':') !== -1) {
      return false;
    }
    /* Basic hostname / IPv4-ish token; Atlas Local validates further. */
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(h);
  }

  /** @deprecated name kept for callers; means "syntactically usable host". */
  function isAuthorizedRoeHost(host) {
    return isValidLaunchHost(host);
  }

  function isAuthorizedAction(value) {
    return typeof value === 'string' && AUTHORIZED_ACTIONS.indexOf(value) !== -1;
  }

  function parseAuthorizedLaunch(search, defaultHost) {
    var def =
      defaultHost === undefined || defaultHost === null
        ? DEFAULT_AUTHORIZED_HOST
        : defaultHost;
    var params = new URLSearchParams(
      search.charAt(0) === '?' ? search.slice(1) : search
    );
    var actionRaw = params.get('action');
    if (!actionRaw) {
      return { ok: false, reason: '' };
    }
    if (!isAuthorizedAction(actionRaw)) {
      return {
        ok: false,
        reason:
          'Action « ' +
          actionRaw +
          ' » non autorisée — utiliser recon|scan|vuln|osint.'
      };
    }
    var hostRaw = (params.get('host') || '').trim();
    if (!hostRaw && def) hostRaw = String(def).trim();
    var host = hostRaw ? normalizeLaunchHost(hostRaw) : '';
    if (hostRaw && !isValidLaunchHost(host)) {
      return {
        ok: false,
        reason: 'Cible invalide — choisissez l’URL dans Atlas Local.'
      };
    }
    return {
      ok: true,
      intent: {
        action: actionRaw,
        host: host,
        label: AUTHORIZED_ACTION_LABELS[actionRaw]
      }
    };
  }

  function buildLaunchQuery(action, host) {
    var q = new URLSearchParams({ action: action });
    var h = host || DEFAULT_AUTHORIZED_HOST;
    if (h) q.set('host', h);
    return q.toString();
  }

  function authorizedLaunchHref(action, host, origin) {
    var o = origin || DEFAULT_CLIENT_ORIGIN;
    return o + '/?' + buildLaunchQuery(action, host) + '#scanner';
  }

  /** Pages fallback when loopback Atlas is down — still runs the live probe UI. */
  function pagesLaunchHref(action, host) {
    return '/launch/?' + buildLaunchQuery(action, host) + '#scanner';
  }

  /** Atlas.exe shell deep-link (same query + #scanner). */
  function shellLaunchHref(action, host) {
    return ATLAS_LOCAL_ORIGIN + '/?' + buildLaunchQuery(action, host) + '#scanner';
  }

  /**
   * Pick the best local href from a findAtlasLocalBridge() result.
   * Prefers Vite :3002, then Atlas.exe :17865. Null when neither is up.
   */
  function pickBridgeHref(intent, bridge) {
    if (!intent || !bridge) return null;
    if (bridge.clientOrigin) {
      return authorizedLaunchHref(intent.action, intent.host, bridge.clientOrigin);
    }
    if (bridge.shellOrigin) {
      return shellLaunchHref(intent.action, intent.host);
    }
    return null;
  }

  /**
   * Active local connection from Pages (dashboard caps or /launch/).
   * Probes loopback, opens Vite/shell when ready, else falls back to /launch/.
   */
  function connectAuthorizedCapability(action, host, options) {
    var opts = options || {};
    var timeoutMs = opts.timeoutMs || 1400;
    var navigate = opts.navigate !== false;
    var fallbackToLaunch = opts.fallbackToLaunch !== false;
    var q = 'action=' + encodeURIComponent(action || '');
    var hostVal = host || DEFAULT_AUTHORIZED_HOST;
    if (hostVal) q += '&host=' + encodeURIComponent(hostVal);
    var parsed = parseAuthorizedLaunch(q);
    if (!parsed.ok) {
      return Promise.resolve({
        ok: false,
        reason: parsed.reason,
        href: null,
        via: null,
        bridge: null
      });
    }
    var intent = parsed.intent;
    var launchHref = pagesLaunchHref(intent.action, intent.host);
    return findAtlasLocalBridge(timeoutMs).then(function (bridge) {
      var localHref = pickBridgeHref(intent, bridge);
      if (localHref) {
        if (navigate) location.assign(localHref);
        return {
          ok: true,
          intent: intent,
          href: localHref,
          via: bridge.clientOrigin ? 'client' : 'shell',
          bridge: bridge
        };
      }
      if (fallbackToLaunch) {
        if (navigate) location.assign(launchHref);
        return {
          ok: true,
          intent: intent,
          href: launchHref,
          via: 'launch',
          bridge: bridge
        };
      }
      return {
        ok: true,
        intent: intent,
        href: null,
        via: 'none',
        bridge: bridge
      };
    });
  }

  /**
   * Probe a same-machine Atlas origin. Uses no-cors so https://atlas-secu.com
   * can detect loopback without CORS headers on the local server.
   */
  function probeLocalOrigin(origin, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, timeoutMs || 1200);
    var opts = { mode: 'no-cors', cache: 'no-store', credentials: 'omit' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(origin + '/', opts)
      .then(function () {
        clearTimeout(timer);
        return true;
      })
      .catch(function () {
        clearTimeout(timer);
        return false;
      });
  }

  /**
   * Prefer Vite client (parses authorizedLaunch + scrolls #scanner),
   * then Atlas.exe shell on :17865.
   */
  function findAtlasLocalBridge(timeoutMs) {
    var t = timeoutMs || 1200;
    return Promise.all([
      probeLocalOrigin(DEFAULT_CLIENT_ORIGIN, t).then(function (ok) {
        return ok ? DEFAULT_CLIENT_ORIGIN : null;
      }),
      probeLocalOrigin(CLIENT_ORIGIN_IPV4, t).then(function (ok) {
        return ok ? CLIENT_ORIGIN_IPV4 : null;
      }),
      probeLocalOrigin(ATLAS_LOCAL_ORIGIN, t).then(function (ok) {
        return ok ? ATLAS_LOCAL_ORIGIN : null;
      })
    ]).then(function (hits) {
      var client = hits[0] || hits[1];
      var shell = hits[2];
      return {
        clientOrigin: client,
        shellOrigin: shell,
        ready: !!(client || shell)
      };
    });
  }

  /** Ensure location.hash is #scanner without losing query. */
  function ensureScannerHash() {
    if (location.hash === '#scanner') return false;
    var url = location.pathname + location.search + '#scanner';
    if (history.replaceState) {
      history.replaceState(null, '', url);
    } else {
      location.hash = 'scanner';
    }
    return true;
  }

  global.AuthorizedLaunch = {
    AUTHORIZED_ACTIONS: AUTHORIZED_ACTIONS,
    AUTHORIZED_ACTION_LABELS: AUTHORIZED_ACTION_LABELS,
    DEFAULT_AUTHORIZED_HOST: DEFAULT_AUTHORIZED_HOST,
    ROE_SCOPE_PATTERNS: ROE_SCOPE_PATTERNS,
    DEFAULT_CLIENT_ORIGIN: DEFAULT_CLIENT_ORIGIN,
    CLIENT_ORIGIN_IPV4: CLIENT_ORIGIN_IPV4,
    ATLAS_LOCAL_ORIGIN: ATLAS_LOCAL_ORIGIN,
    normalizeLaunchHost: normalizeLaunchHost,
    isValidLaunchHost: isValidLaunchHost,
    isAuthorizedRoeHost: isAuthorizedRoeHost,
    isAuthorizedAction: isAuthorizedAction,
    parseAuthorizedLaunch: parseAuthorizedLaunch,
    authorizedLaunchHref: authorizedLaunchHref,
    pagesLaunchHref: pagesLaunchHref,
    shellLaunchHref: shellLaunchHref,
    pickBridgeHref: pickBridgeHref,
    connectAuthorizedCapability: connectAuthorizedCapability,
    probeLocalOrigin: probeLocalOrigin,
    findAtlasLocalBridge: findAtlasLocalBridge,
    ensureScannerHash: ensureScannerHash
  };
})(window);
