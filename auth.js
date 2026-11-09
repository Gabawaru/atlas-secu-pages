/**
 * Atlas — client-side allowlist gate (static Pages).
 * Session: sessionStorage key `atlas_secu_session` = JSON {
 *   email, firstName, post, clearance, systemRole, at
 * }.
 * Password overrides: localStorage key `atlas_secu_pw_overrides` = { [email]: password }.
 * Not cryptographic auth; soft gate for a static site.
 *
 * Two axes (see confidential-roles research):
 *   post      — ops / governance job title (Direction, Stagiaire, …)
 *   clearance — need-to-know band A–D (data capabilities, not social rank)
 */
(function (global) {
  var SESSION_KEY = 'atlas_secu_session';
  var PW_KEY = 'atlas_secu_pw_overrides';

  /** Clearance rank for comparisons (A public → D governance). */
  var CLEARANCE_RANK = { A: 1, B: 2, C: 3, D: 4 };

  /**
   * Allowlisted Atlas sessions.
   * post / clearance from org research + hierarchie-acces (keep simple).
   * systemRole: admin | operator | viewer | auditor (product capability, not org chart).
   */
  var AUTHORIZED_USERS = [
    {
      email: 'gabriel@atlas-secu.com',
      firstName: 'Gabriel',
      password: '0000',
      post: 'Stagiaire',
      clearance: 'B',
      systemRole: 'operator'
    },
    {
      email: 'benjamin@atlas-secu.com',
      firstName: 'Benjamin',
      password: '0000',
      post: 'Direction',
      clearance: 'D',
      systemRole: 'admin'
    },
    {
      email: 'romain@atlas-secu.com',
      firstName: 'Romain',
      password: '0000',
      post: 'Direction',
      clearance: 'D',
      systemRole: 'admin'
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

  /** Resolve post + clearance for a session or email (hydrates from allowlist). */
  function resolveRole(sessionOrEmail) {
    var email = typeof sessionOrEmail === 'string'
      ? sessionOrEmail
      : (sessionOrEmail && sessionOrEmail.email);
    var user = findUser(email);
    if (!user) return null;
    var fromSession = sessionOrEmail && typeof sessionOrEmail === 'object' ? sessionOrEmail : null;
    return {
      email: user.email,
      firstName: (fromSession && fromSession.firstName) || user.firstName,
      post: user.post || 'Ops',
      clearance: user.clearance || 'B',
      systemRole: user.systemRole || 'operator'
    };
  }

  /** Compact chip label: "Direction · D" */
  function roleChipLabel(sessionOrEmail) {
    var role = resolveRole(sessionOrEmail);
    if (!role) return '';
    return role.post + ' · ' + role.clearance;
  }

  function clearanceRank(band) {
    var key = String(band || '').toUpperCase();
    return Object.prototype.hasOwnProperty.call(CLEARANCE_RANK, key) ? CLEARANCE_RANK[key] : 0;
  }

  /** True if session clearance is at least minBand (e.g. 'B'). */
  function hasClearance(session, minBand) {
    var role = resolveRole(session);
    if (!role) return false;
    return clearanceRank(role.clearance) >= clearanceRank(minBand);
  }

  function buildSession(user) {
    return {
      email: user.email,
      firstName: user.firstName,
      post: user.post || 'Ops',
      clearance: user.clearance || 'B',
      systemRole: user.systemRole || 'operator',
      at: Date.now()
    };
  }

  function login(email, password) {
    var user = findUser(email);
    if (!user) return { ok: false, reason: 'unauthorized_email' };
    if (!passwordMatches(user, password)) {
      return { ok: false, reason: 'bad_password' };
    }
    var session = buildSession(user);
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
      var role = resolveRole(parsed);
      if (role) {
        parsed.firstName = role.firstName;
        parsed.post = role.post;
        parsed.clearance = role.clearance;
        parsed.systemRole = role.systemRole;
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
      location.replace(redirectTo || '/');
      return null;
    }
    return s;
  }

  /**
   * Product links PragmaServe / PragmaCloud / PragmaUC:
   * accredited session with clearance ≥ B (Gabriel / Benjamin / Romain).
   * Never anonymous marketing.
   */
  function canSeePragmaProductLinks(session) {
    return hasClearance(session || getSession(), 'B');
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
    CLEARANCE_RANK: CLEARANCE_RANK,
    AUTHORIZED_USERS: AUTHORIZED_USERS,
    login: login,
    logout: logout,
    getSession: getSession,
    requireSession: requireSession,
    resolveRole: resolveRole,
    roleChipLabel: roleChipLabel,
    hasClearance: hasClearance,
    canSeePragmaProductLinks: canSeePragmaProductLinks,
    setPassword: setPassword,
    changePassword: changePassword,
    normalizeEmail: normalizeEmail,
    findUser: findUser
  };
})(window);
