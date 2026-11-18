/**
 * Copy to config.runtime.js on the deploy host (or edit that file) to enable
 * compte / YOOO / PEC against a real Atlas API. No passwords or tokens here.
 */
(function (global) {
  global.ATLAS_API_BASE = 'https://YOUR-ATLAS-API-ORIGIN';
})(typeof window !== 'undefined' ? window : this);
