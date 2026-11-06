/**
 * Atlas SECU — client-side allowlist gate (static Pages).
 * Session: sessionStorage key `atlas_secu_session` = JSON { email, firstName, at }.
 * Password overrides: localStorage key `atlas_secu_pw_overrides` = { [email]: password }.
 * Not cryptographic auth; soft gate for a static site.
 */
(function (global) {
  var SESSION_KEY = 'atlas_secu_session';
  var PW_KEY = 'atlas_secu_pw_overrides';

  var AUTHORIZED_USERS = [
    {
      email: 'gabriel@atlas-secu.com',
      firstName: 'Gabriel',
      password: '0000'
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

  function loadOverrides() {
    try {
      var raw = localStorage.getItem(PW_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveOverrides(map) {
    try {
      localStorage.setItem(PW_KEY, JSON.stringify(map));
      return true;
    } catch (e) {
      return false;
    }
  }

  function findUser(email) {
    var n = normalizeEmail(email);
    for (var i = 0; i < AUTHORIZED_USERS.length; i++) {
      if (AUTHORIZED_USERS[i].email.toLowerCase() === n) return AUTHORIZED_USERS[i];
    }
    return null;
  }

  function effectivePassword(user) {
    var overrides = loadOverrides();
    var key = user.email.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      return String(overrides[key]);
    }
    return String(user.password);
  }

  function passwordMatches(user, password) {
    return String(password || '') === effectivePassword(user);
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
      location.replace(redirectTo || '/');
      return null;
    }
    return s;
  }

  /** Persist password override for this browser (localStorage). */
  function setPassword(email, newPassword) {
    var user = findUser(email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (newPassword === undefined || newPassword === null || String(newPassword) === '') {
      return { ok: false, reason: 'empty_password' };
    }
    var map = loadOverrides();
    map[user.email.toLowerCase()] = String(newPassword);
    if (!saveOverrides(map)) return { ok: false, reason: 'storage' };
    user.password = String(newPassword);
    return { ok: true, email: user.email };
  }

  /** Change password for the signed-in user (checks current). */
  function changePassword(currentPassword, newPassword) {
    var session = getSession();
    if (!session) return { ok: false, reason: 'no_session' };
    var user = findUser(session.email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (!passwordMatches(user, currentPassword)) {
      return { ok: false, reason: 'bad_password' };
    }
    if (newPassword === undefined || newPassword === null || String(newPassword) === '') {
      return { ok: false, reason: 'empty_password' };
    }
    if (String(newPassword) === String(currentPassword)) {
      return { ok: false, reason: 'same_password' };
    }
    return setPassword(user.email, newPassword);
  }

  global.AtlasAuth = {
    SESSION_KEY: SESSION_KEY,
    PW_KEY: PW_KEY,
    AUTHORIZED_USERS: AUTHORIZED_USERS,
    login: login,
    logout: logout,
    getSession: getSession,
    requireSession: requireSession,
    setPassword: setPassword,
    changePassword: changePassword,
    normalizeEmail: normalizeEmail,
    findUser: findUser
  };
})(window);
