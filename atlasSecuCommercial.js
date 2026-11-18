/**
 * Atlas SECU — compte + activation beta (Pages).
 * Stocke le Bearer API dans sessionStorage `atlas_api_token` pour la PEC.
 */
(function (global) {
  var TOKEN_KEY = 'atlas_api_token';
  var PROMO = 'YOOO2026';

  function apiBase() {
    var base = global.ATLAS_API_BASE;
    if (!base || typeof base !== 'string') return '';
    return base.replace(/\/$/, '');
  }

  function getToken() {
    try {
      return (
        (sessionStorage.getItem(TOKEN_KEY) ||
          localStorage.getItem(TOKEN_KEY) ||
          '') + ''
      ).trim();
    } catch (e) {
      return '';
    }
  }

  function setToken(token) {
    try {
      if (!token) {
        sessionStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_KEY);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      /* ignore */
    }
  }

  function parseError(data, status) {
    if (!data) return 'HTTP ' + status;
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data.message)) return data.message.join('; ');
    return 'HTTP ' + status;
  }

  function register(email, password, displayName) {
    var base = apiBase();
    if (!base) {
      return Promise.resolve({
        ok: false,
        message: 'ATLAS_API_BASE manquant.'
      });
    }
    return fetch(base + '/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        displayName: displayName || undefined
      })
    }).then(function (res) {
      return res.json().then(
        function (data) {
          if (!res.ok || !data.accessToken) {
            return { ok: false, message: parseError(data, res.status) };
          }
          setToken(data.accessToken);
          return { ok: true, accessToken: data.accessToken };
        },
        function () {
          return { ok: false, message: 'Réponse invalide.' };
        }
      );
    });
  }

  function login(email, password) {
    var base = apiBase();
    if (!base) {
      return Promise.resolve({
        ok: false,
        message: 'ATLAS_API_BASE manquant.'
      });
    }
    return fetch(base + '/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      return res.json().then(
        function (data) {
          if (!res.ok || !data.accessToken) {
            return { ok: false, message: parseError(data, res.status) };
          }
          setToken(data.accessToken);
          return { ok: true, accessToken: data.accessToken };
        },
        function () {
          return { ok: false, message: 'Réponse invalide.' };
        }
      );
    });
  }

  function activatePromo(promoCode) {
    var base = apiBase();
    var token = getToken();
    if (!base) {
      return Promise.resolve({
        ok: false,
        message: 'ATLAS_API_BASE manquant.'
      });
    }
    if (!token) {
      return Promise.resolve({
        ok: false,
        message: 'Compte requis avant activation.'
      });
    }
    return fetch(base + '/v1/commercial/atlas-secu/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ promoCode: promoCode || PROMO })
    }).then(function (res) {
      return res.json().then(
        function (data) {
          if (!res.ok) {
            return { ok: false, message: parseError(data, res.status) };
          }
          return {
            ok: true,
            notice: data.notice || 'Atlas SECU activé (beta 0 €).',
            commerciallyActive: data.commerciallyActive !== false
          };
        },
        function () {
          return { ok: false, message: 'Réponse invalide.' };
        }
      );
    });
  }

  function status() {
    var base = apiBase();
    var token = getToken();
    if (!base || !token) {
      return Promise.resolve({ ok: false, commerciallyActive: false });
    }
    return fetch(base + '/v1/commercial/atlas-secu/status', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (res) {
      if (!res.ok) return { ok: false, commerciallyActive: false };
      return res.json().then(function (data) {
        return {
          ok: true,
          commerciallyActive: !!data.commerciallyActive,
          offer: data
        };
      });
    });
  }

  global.AtlasSecuCommercial = {
    TOKEN_KEY: TOKEN_KEY,
    PROMO: PROMO,
    PRODUCT: 'Atlas SECU',
    getToken: getToken,
    setToken: setToken,
    register: register,
    login: login,
    activatePromo: activatePromo,
    status: status
  };
})(typeof window !== 'undefined' ? window : this);
