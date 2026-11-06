/**
 * Deep-link entry from atlas-secu.com → local Atlas client.
 * Browser port of Gabawaru/Atlas apps/client/src/authorizedLaunch.ts
 * RoE Gab: recon / scan / vuln / osint only on *.pragma-serve.com,
 * *.pragma-cloud.com, *.pragma.mc (+ apexes).
 */
(function (global) {
  var AUTHORIZED_ACTIONS = ['recon', 'scan', 'vuln', 'osint'];

  var AUTHORIZED_ACTION_LABELS = {
    recon: 'Reconnaissance',
    scan: 'Scan',
    vuln: 'Évaluation de vulnérabilités',
    osint: 'OSINT'
  };

  var DEFAULT_AUTHORIZED_HOST = 'pragma-serve.com';

  var ROE_SCOPE_PATTERNS = [
    '*.pragma-serve.com',
    '*.pragma-cloud.com',
    '*.pragma.mc'
  ];

  var ROE_EXPLICIT_APEXES = [
    'pragma-serve.com',
    'pragma-cloud.com',
    'pragma.mc'
  ];

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

  function isAuthorizedRoeHost(host) {
    var h = normalizeLaunchHost(host);
    if (!h || h.indexOf(' ') !== -1 || h.indexOf('..') !== -1 || h.indexOf(':') !== -1) {
      return false;
    }
    if (ROE_EXPLICIT_APEXES.indexOf(h) !== -1) return true;
    for (var i = 0; i < ROE_SCOPE_PATTERNS.length; i++) {
      var suffix = ROE_SCOPE_PATTERNS[i].slice(1);
      if (h.length > suffix.length && h.slice(-suffix.length) === suffix) return true;
    }
    return false;
  }

  function isAuthorizedAction(value) {
    return typeof value === 'string' && AUTHORIZED_ACTIONS.indexOf(value) !== -1;
  }

  function parseAuthorizedLaunch(search, defaultHost) {
    var def = defaultHost || DEFAULT_AUTHORIZED_HOST;
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
    var hostRaw = (params.get('host') || '').trim() || def;
    var host = normalizeLaunchHost(hostRaw);
    if (!isAuthorizedRoeHost(host)) {
      return {
        ok: false,
        reason:
          'Cible « ' +
          hostRaw +
          ' » hors RoE (*.pragma-serve.com, *.pragma-cloud.com, *.pragma.mc).'
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

  function authorizedLaunchHref(action, host, origin) {
    var o = origin || DEFAULT_CLIENT_ORIGIN;
    var q = new URLSearchParams({
      action: action,
      host: host || DEFAULT_AUTHORIZED_HOST
    });
    return o + '/?' + q.toString() + '#scanner';
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
    isAuthorizedRoeHost: isAuthorizedRoeHost,
    isAuthorizedAction: isAuthorizedAction,
    parseAuthorizedLaunch: parseAuthorizedLaunch,
    authorizedLaunchHref: authorizedLaunchHref,
    probeLocalOrigin: probeLocalOrigin,
    findAtlasLocalBridge: findAtlasLocalBridge,
    ensureScannerHash: ensureScannerHash
  };
})(window);
