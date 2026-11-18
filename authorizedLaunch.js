/**
 * Public atlas-secu.com no longer exposes operational RoE / Scanner actions.
 * Scan / recon / vuln / audit run only inside Atlas Local on the operator machine.
 * This stub remains so any stale script tags fail closed instead of launching.
 */
(function (global) {
  function refused(reason) {
    return {
      ok: false,
      reason:
        reason ||
        'Actions opérationnelles indisponibles sur atlas-secu.com — utilisez Atlas Local.',
      href: null,
      via: null,
      bridge: null
    };
  }

  function parseAuthorizedLaunch() {
    return refused();
  }

  function connectAuthorizedCapability() {
    return Promise.resolve(refused());
  }

  function pagesLaunchHref() {
    return '/launch/';
  }

  function authorizedLaunchHref() {
    return '/launch/';
  }

  function shellLaunchHref() {
    return '/launch/';
  }

  function pickBridgeHref() {
    return null;
  }

  function findAtlasLocalBridge() {
    return Promise.resolve({
      clientOrigin: null,
      shellOrigin: null,
      ready: false
    });
  }

  function ensureScannerHash() {
    return false;
  }

  function normalizeLaunchHost() {
    return '';
  }

  function isValidLaunchHost() {
    return false;
  }

  function isAuthorizedRoeHost() {
    return false;
  }

  function isAuthorizedAction() {
    return false;
  }

  global.AuthorizedLaunch = {
    AUTHORIZED_ACTIONS: [],
    AUTHORIZED_ACTION_LABELS: {},
    DEFAULT_AUTHORIZED_HOST: '',
    ROE_SCOPE_PATTERNS: [],
    DEFAULT_CLIENT_ORIGIN: 'http://localhost:3002',
    CLIENT_ORIGIN_IPV4: 'http://127.0.0.1:3002',
    ATLAS_LOCAL_ORIGIN: 'http://127.0.0.1:17865',
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
    findAtlasLocalBridge: findAtlasLocalBridge,
    ensureScannerHash: ensureScannerHash,
    probeLocalOrigin: function () {
      return Promise.resolve(false);
    }
  };
})(typeof window !== 'undefined' ? window : this);
