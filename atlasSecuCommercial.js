/**
 * Atlas SECU — compte + activation beta (Pages).
 * Stocke le Bearer API dans sessionStorage `atlas_api_token` pour la PEC.
 *
 * Quand `window.ATLAS_API_BASE` est absent : aucun faux succès —
 * messages FR explicites (compte / PEC indisponibles).
 * Aucun secret dans ce fichier : l’URL API est injectée au runtime
 * (ex. `/config.runtime.js` déployé hors git).
 */
(function (global) {
  var TOKEN_KEY = 'atlas_api_token';
  var PROMO = 'YOOO2026';
  var UNAVAILABLE_FR =
    'Compte et prise en charge indisponibles sur ce site pour le moment ' +
    '(serveur Atlas non configuré). Téléchargez Atlas Local, ou réessayez plus tard.';

  function apiBase() {
    var base = global.ATLAS_API_BASE;
    if (!base || typeof base !== 'string') return '';
    return base.replace(/\/$/, '').trim();
  }

  function isConfigured() {
    return !!apiBase();
  }

  function unavailableMessage() {
    return UNAVAILABLE_FR;
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

  function missingConfigResult() {
    return Promise.resolve({
      ok: false,
      reason: 'api_missing',
      message: UNAVAILABLE_FR
    });
  }

  function register(email, password, displayName) {
    var base = apiBase();
    if (!base) return missingConfigResult();
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
          return {
            ok: true,
            accessToken: data.accessToken,
            user: data.user || null,
            displayName:
              (data.user && data.user.displayName) || displayName || null
          };
        },
        function () {
          return { ok: false, message: 'Réponse invalide.' };
        }
      );
    });
  }

  function login(email, password) {
    var base = apiBase();
    if (!base) return missingConfigResult();
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
          return {
            ok: true,
            accessToken: data.accessToken,
            user: data.user || null,
            displayName: (data.user && data.user.displayName) || null
          };
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
    if (!base) return missingConfigResult();
    if (!token) {
      return Promise.resolve({
        ok: false,
        reason: 'auth_required',
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

  /**
   * DELETE /v1/auth/account — succès uniquement si HTTP 2xx.
   * Ne purge pas le token ici (AtlasAuth.eraseAccount le fait après).
   */
  function deleteAccount(confirmWord) {
    var base = apiBase();
    var token = getToken();
    if (!base) {
      return Promise.resolve({
        ok: false,
        reason: 'api_missing',
        message: UNAVAILABLE_FR,
        remote: false
      });
    }
    if (!token) {
      return Promise.resolve({
        ok: false,
        reason: 'auth_required',
        message: 'Connexion requise pour supprimer le compte serveur.',
        remote: false
      });
    }
    var confirm = String(confirmWord || 'DELETE').trim();
    if (confirm !== 'DELETE') {
      return Promise.resolve({
        ok: false,
        reason: 'confirm',
        message: 'Tapez DELETE pour confirmer.',
        remote: false
      });
    }
    return fetch(base + '/v1/auth/account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ confirm: 'DELETE' })
    }).then(
      function (res) {
        return res.text().then(function (text) {
          var data = {};
          if (text) {
            try {
              data = JSON.parse(text);
            } catch (e) {
              data = {};
            }
          }
          if (!res.ok) {
            return {
              ok: false,
              reason: 'http_error',
              message: parseError(data, res.status) || text || 'HTTP ' + res.status,
              remote: true,
              status: res.status
            };
          }
          return {
            ok: true,
            remote: true,
            notice: data.notice || 'Compte supprimé.',
            retained: data.retained
          };
        });
      },
      function (err) {
        return {
          ok: false,
          reason: 'network',
          message: (err && err.message) || 'Réseau indisponible.',
          remote: true
        };
      }
    );
  }

  global.AtlasSecuCommercial = {
    TOKEN_KEY: TOKEN_KEY,
    PROMO: PROMO,
    PRODUCT: 'Atlas SECU',
    UNAVAILABLE_FR: UNAVAILABLE_FR,
    isConfigured: isConfigured,
    unavailableMessage: unavailableMessage,
    getToken: getToken,
    setToken: setToken,
    register: register,
    login: login,
    activatePromo: activatePromo,
    status: status,
    deleteAccount: deleteAccount
  };
})(typeof window !== 'undefined' ? window : this);
