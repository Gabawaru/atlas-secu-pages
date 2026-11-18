/**
 * Atlas SECU — session navigateur (Pages).
 *
 * Auth réelle via API Atlas (Bearer) quand `window.ATLAS_API_BASE` est défini.
 * Aucun allowlist staff, aucun mot de passe en clair dans le bundle.
 *
 * Session: sessionStorage `atlas_secu_session` = JSON {
 *   email, firstName, at, via: 'api'
 * }.
 * Bearer: sessionStorage / localStorage `atlas_api_token` (via AtlasSecuCommercial).
 */
(function (global) {
  var SESSION_KEY = 'atlas_secu_session';
  var UNAVAILABLE_FR =
    'Compte et prise en charge indisponibles sur ce site pour le moment ' +
    '(serveur Atlas non configuré). Téléchargez Atlas Local, ou réessayez plus tard.';

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function commercial() {
    return global.AtlasSecuCommercial || null;
  }

  function isApiConfigured() {
    var c = commercial();
    if (c && typeof c.isConfigured === 'function') return !!c.isConfigured();
    var base = global.ATLAS_API_BASE;
    return !!(base && typeof base === 'string' && base.trim());
  }

  function unavailableMessage() {
    var c = commercial();
    if (c && typeof c.unavailableMessage === 'function') {
      return c.unavailableMessage();
    }
    return UNAVAILABLE_FR;
  }

  function getToken() {
    var c = commercial();
    if (c && typeof c.getToken === 'function') return c.getToken() || '';
    try {
      return (
        (sessionStorage.getItem('atlas_api_token') ||
          localStorage.getItem('atlas_api_token') ||
          '') + ''
      ).trim();
    } catch (e) {
      return '';
    }
  }

  function clearToken() {
    var c = commercial();
    if (c && typeof c.setToken === 'function') {
      c.setToken('');
      return;
    }
    try {
      sessionStorage.removeItem('atlas_api_token');
      localStorage.removeItem('atlas_api_token');
    } catch (e) {
      /* ignore */
    }
  }

  function buildSession(email, displayName) {
    var em = normalizeEmail(email);
    var first =
      (displayName && String(displayName).trim()) ||
      (em ? em.split('@')[0] : 'Compte');
    return {
      email: em,
      firstName: first,
      post: 'Client',
      clearance: 'A',
      systemRole: 'viewer',
      via: 'api',
      at: Date.now()
    };
  }

  function persistSession(session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true, session: session };
    } catch (e) {
      return { ok: false, reason: 'storage', message: 'Stockage navigateur indisponible.' };
    }
  }

  /**
   * Connexion API (Bearer). Promesse.
   * Sans ATLAS_API_BASE → échec explicite FR (pas de faux succès).
   */
  function login(email, password) {
    if (!isApiConfigured()) {
      return Promise.resolve({
        ok: false,
        reason: 'api_missing',
        message: unavailableMessage()
      });
    }
    var c = commercial();
    if (!c || typeof c.login !== 'function') {
      return Promise.resolve({
        ok: false,
        reason: 'api_missing',
        message: unavailableMessage()
      });
    }
    return c.login(email, password).then(function (r) {
      if (!r || !r.ok) {
        return {
          ok: false,
          reason: 'auth_failed',
          message: (r && r.message) || 'Identifiants incorrects.'
        };
      }
      var session = buildSession(
        email,
        r.displayName || (r.user && r.user.displayName)
      );
      var saved = persistSession(session);
      if (!saved.ok) return saved;
      return { ok: true, session: saved.session, accessToken: r.accessToken };
    });
  }

  /**
   * Inscription API (Bearer). Promesse.
   */
  function register(email, password, displayName) {
    if (!isApiConfigured()) {
      return Promise.resolve({
        ok: false,
        reason: 'api_missing',
        message: unavailableMessage()
      });
    }
    var c = commercial();
    if (!c || typeof c.register !== 'function') {
      return Promise.resolve({
        ok: false,
        reason: 'api_missing',
        message: unavailableMessage()
      });
    }
    return c.register(email, password, displayName).then(function (r) {
      if (!r || !r.ok) {
        return {
          ok: false,
          reason: 'auth_failed',
          message: (r && r.message) || 'Inscription impossible.'
        };
      }
      var session = buildSession(email, displayName || (r.user && r.user.displayName));
      var saved = persistSession(session);
      if (!saved.ok) return saved;
      return { ok: true, session: saved.session, accessToken: r.accessToken };
    });
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function clearLocalSupportTracking() {
    try {
      if (
        global.AtlasSupportTracking &&
        typeof global.AtlasSupportTracking.reset === 'function'
      ) {
        global.AtlasSupportTracking.reset();
      } else {
        localStorage.removeItem('atlas.support-tracking.v1');
      }
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Effacement honnête :
   * - purge toujours le Bearer + session locale + suivi support navigateur ;
   * - DELETE /v1/auth/account seulement si API configurée + token ;
   * - « distant ok » / succès serveur uniquement si réponse 2xx.
   */
  function eraseAccount(confirmWord) {
    var token = getToken();
    var c = commercial();
    var localCleared = false;

    function wipeLocal() {
      logout();
      clearToken();
      clearLocalSupportTracking();
      localCleared = true;
    }

    if (!isApiConfigured()) {
      wipeLocal();
      return Promise.resolve({
        ok: true,
        remote: false,
        remoteOk: false,
        localCleared: true,
        notice:
          'Session et données locales effacées. Compte serveur non contacté : serveur Atlas non configuré sur ce site.'
      });
    }

    if (!token) {
      wipeLocal();
      return Promise.resolve({
        ok: true,
        remote: false,
        remoteOk: false,
        localCleared: true,
        notice:
          'Session et données locales effacées. Aucun jeton API : rien n’a été demandé au serveur.'
      });
    }

    if (!c || typeof c.deleteAccount !== 'function') {
      wipeLocal();
      return Promise.resolve({
        ok: true,
        remote: false,
        remoteOk: false,
        localCleared: true,
        notice:
          'Session et jeton locaux effacés. Suppression serveur indisponible (module commercial).'
      });
    }

    return c.deleteAccount(confirmWord || 'DELETE').then(function (remote) {
      /* Toujours purger le Bearer local après tentative — y compris si API refuse. */
      wipeLocal();
      if (remote && remote.ok) {
        return {
          ok: true,
          remote: true,
          remoteOk: true,
          localCleared: true,
          notice:
            (remote.notice || 'Compte serveur supprimé.') +
            ' Session et jeton locaux effacés.',
          retained: remote.retained
        };
      }
      return {
        ok: false,
        remote: true,
        remoteOk: false,
        localCleared: true,
        reason: (remote && remote.reason) || 'http_error',
        message:
          (remote && remote.message) ||
          'Échec suppression serveur. Session et jeton locaux ont quand même été effacés.',
        notice:
          'Échec suppression serveur (' +
          ((remote && remote.message) || 'erreur') +
          '). Session et jeton locaux effacés — le compte API peut encore exister.'
      };
    });
  }

  /** @deprecated use eraseAccount — kept for callers; always clears bearer. */
  function eraseLocalAccount() {
    return eraseAccount('DELETE');
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.email) {
        logout();
        return null;
      }
      /* Session Pages = compte API. Sans jeton, on ne prétend pas être connecté. */
      if (!getToken()) {
        logout();
        return null;
      }
      return {
        email: normalizeEmail(parsed.email),
        firstName: parsed.firstName || parsed.email.split('@')[0] || 'Compte',
        post: parsed.post || 'Client',
        clearance: parsed.clearance || 'A',
        systemRole: parsed.systemRole || 'viewer',
        via: parsed.via || 'api',
        at: parsed.at || Date.now()
      };
    } catch (e) {
      logout();
      return null;
    }
  }

  function requireSession(redirectTo) {
    var s = getSession();
    if (!s) {
      location.replace(redirectTo || '/');
      return null;
    }
    return s;
  }

  function resolveRole(sessionOrEmail) {
    var session =
      typeof sessionOrEmail === 'string' ? getSession() : sessionOrEmail;
    if (!session || !session.email) return null;
    return {
      email: session.email,
      firstName: session.firstName || 'Compte',
      post: session.post || 'Client',
      clearance: session.clearance || 'A',
      systemRole: session.systemRole || 'viewer'
    };
  }

  function roleChipLabel(sessionOrEmail) {
    var role = resolveRole(sessionOrEmail || getSession());
    if (!role) return '';
    return 'Compte';
  }

  /**
   * Liens produits Pragma : plus de gate marketing staff.
   * Ops staff = surface admin séparée — pas l’allowlist publique.
   */
  function canSeePragmaProductLinks() {
    return false;
  }

  function hasClearance() {
    return false;
  }

  /**
   * Changement de mot de passe local retiré (plus d’overrides / allowlist).
   * Pas d’endpoint Pages pour change-password — utiliser le client / support.
   */
  function changePassword() {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'Changement de mot de passe indisponible sur le site. Utilisez Atlas Local ou le support.'
    };
  }

  function setPassword() {
    return changePassword();
  }

  global.AtlasAuth = {
    SESSION_KEY: SESSION_KEY,
    UNAVAILABLE_FR: UNAVAILABLE_FR,
    isApiConfigured: isApiConfigured,
    unavailableMessage: unavailableMessage,
    login: login,
    register: register,
    logout: logout,
    eraseAccount: eraseAccount,
    eraseLocalAccount: eraseLocalAccount,
    getSession: getSession,
    requireSession: requireSession,
    resolveRole: resolveRole,
    roleChipLabel: roleChipLabel,
    hasClearance: hasClearance,
    canSeePragmaProductLinks: canSeePragmaProductLinks,
    setPassword: setPassword,
    changePassword: changePassword,
    normalizeEmail: normalizeEmail,
    getToken: getToken,
    clearToken: clearToken
  };
})(window);
