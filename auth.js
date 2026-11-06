/**
 * Atlas secu — client-side allowlist gate (static Pages).
 * Session: sessionStorage key `atlas_secu_session` = JSON { email, at }.
 * Not cryptographic auth; enough for a soft gate on a static site.
 */
(function (global) {
  var SESSION_KEY = 'atlas_secu_session';

  /** Add more { email, password } entries here later. */
  var AUTHORIZED_USERS = [
    { email: 'gabriel@atlas-secu.com', password: '156789101112' }
  ];

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function findUser(email) {
    var n = normalizeEmail(email);
    for (var i = 0; i < AUTHORIZED_USERS.length; i++) {
      if (AUTHORIZED_USERS[i].email.toLowerCase() === n) return AUTHORIZED_USERS[i];
    }
    return null;
  }

  function login(email, password) {
    var user = findUser(email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (String(password || '') !== user.password) {
      return { ok: false, reason: 'bad_password' };
    }
    var session = { email: user.email, at: Date.now() };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      return { ok: false, reason: 'storage' };
    }
    return { ok: true, session: session };
  }

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.email || !findUser(parsed.email)) {
        logout();
        return null;
      }
      return parsed;
    } catch (e) {
      logout();
      return null;
    }
  }

  function requireSession(redirectTo) {
    var s = getSession();
    if (!s) {
      location.replace(redirectTo || '/login/');
      return null;
    }
    return s;
  }

  global.AtlasAuth = {
    SESSION_KEY: SESSION_KEY,
    AUTHORIZED_USERS: AUTHORIZED_USERS,
    login: login,
    logout: logout,
    getSession: getSession,
    requireSession: requireSession,
    normalizeEmail: normalizeEmail
  };
})(window);
