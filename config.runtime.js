/**
 * Runtime config for atlas-secu.com (static Pages).
 * Ops may set the API origin here — this is not a secret.
 * Leave unset to fail-closed: compte / PEC show a clear FR message (no fake success).
 *
 * Example (also in config.runtime.example.js):
 *   window.ATLAS_API_BASE = 'https://api.example.com';
 */
(function (global) {
  /* Intentionally empty on ship — wire ATLAS_API_BASE before enabling compte/PEC. */
  if (typeof global.ATLAS_API_BASE === 'undefined') {
    global.ATLAS_API_BASE = '';
  }
})(typeof window !== 'undefined' ? window : this);
