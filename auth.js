/**
 * Atlas secu — client-side allowlist gate (static Pages).
 * Session: sessionStorage key `atlas_secu_session` = JSON { email, firstName, at }.
 * Not cryptographic auth; enough for a soft gate on a static site.
 *
 * Password change later: call AtlasAuth.setPassword(email, newPassword)
 * (mutates the in-memory allowlist for the current page load; persist by
 * editing AUTHORIZED_USERS below when ready to bake a new default).
 */
(function (global) {
  var SESSION_KEY = 'atlas_secu_session';

  /**
   * Active password is `password`. Optional `passwordAliases` are accepted
   * during transition (e.g. Gabriel legacy `/login/` → `/app/` password).
   * Remove aliases once everyone uses the new default.
   */
  var AUTHORIZED_USERS = [
    {
      email: 'gabriel@atlas-secu.com',
      firstName: 'Gabriel',
      password: '0000',
      passwordAliases: ['156789101112']
    },
    {
      email: 'benjamin@atlas-secu.com',
      firstName: 'Benjamin',
      password: '0000'
    },
    {
      email: 'romain@atlas-secu.com',
      firstName: 'Romain',
      password: '0000'
    }
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

  function passwordMatches(user, password) {
    var p = String(password || '');
    if (p === String(user.password)) return true;
    var aliases = user.passwordAliases || [];
    for (var i = 0; i < aliases.length; i++) {
      if (p === String(aliases[i])) return true;
    }
    return false;
  }

  function login(email, password) {
    var user = findUser(email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (!passwordMatches(user, password)) {
      return { ok: false, reason: 'bad_password' };
    }
    var session = {
      email: user.email,
      firstName: user.firstName,
      at: Date.now()
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      return { ok: false, reason: 'storage' };
    }
    return { ok: true, session: session, user: user };
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
      var user = findUser(parsed.email);
      if (!parsed.firstName && user) parsed.firstName = user.firstName;
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

  /** Runtime password change (structure for later; not persisted to disk). */
  function setPassword(email, newPassword) {
    var user = findUser(email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (!newPassword && newPassword !== 0) {
      return { ok: false, reason: 'empty_password' };
    }
    user.password = String(newPassword);
    user.passwordAliases = [];
    return { ok: true, email: user.email };
  }

  global.AtlasAuth = {
    SESSION_KEY: SESSION_KEY,
    AUTHORIZED_USERS: AUTHORIZED_USERS,
    login: login,
    logout: logout,
    getSession: getSession,
    requireSession: requireSession,
    setPassword: setPassword,
    normalizeEmail: normalizeEmail,
    findUser: findUser
  };
})(window);
